"""Opsiyonel admin on-isitma — varsayilan akista calistirilmaz.

Kullanici aramalari on-demand POST /discover/social-scan ile taranir.
Toplu prewarm yalnizca bilincli operasyon icin (or. ilk iskender paketi).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.constants.social_proof_product_intents import (
    ProductScanIntent,
    list_prewarm_intents_for_city,
    resolve_product_scan_intent,
)
from app.models import SocialProofJob, User
from app.schemas.live_places import LivePlaceSearchItem
from app.services.city_resolver import resolve_city_name
from app.services.live_place_search_service import search_live_places_optimized
from app.services.query_parser import parse_search_query
from app.services.smart_filters import merge_criteria
from app.services.social_proof_cache import (
    build_product_cache_key,
    is_cache_fresh,
    read_social_proof_cache,
)
from app.services.social_proof_pipeline import run_social_proof_pipeline

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _system_user_id(db: Session) -> uuid.UUID | None:
    from sqlalchemy import select

    user = db.scalar(select(User).limit(1))
    return user.id if user else None


async def prewarm_product_intent(
    db: Session,
    *,
    intent: ProductScanIntent,
    city: str,
    user_id: uuid.UUID | None = None,
    radius_km: float = 30.0,
) -> dict:
    city_label = resolve_city_name(city)
    cache_key = build_product_cache_key(city=city_label, search_group=intent.search_group)
    existing = read_social_proof_cache(db, cache_key)
    if existing and is_cache_fresh(existing) and existing.status == "ready":
        return {
            "search_group": intent.search_group,
            "status": "skipped_fresh",
            "cache_key": cache_key,
        }

    parsed = parse_search_query(intent.live_search_query)
    criteria = merge_criteria(parsed, distance_band=None, rating_band=None)
    places_response = await search_live_places_optimized(
        db,
        q=intent.live_search_query,
        city=city_label,
        limit=20,
        origin_lat=None,
        origin_lng=None,
        criteria=criteria,
        parsed=parsed,
        distance_band=None,
        rating_band=None,
    )
    places: list[LivePlaceSearchItem] = places_response.items
    if not places:
        return {
            "search_group": intent.search_group,
            "status": "no_places",
            "cache_key": cache_key,
        }

    job = SocialProofJob(
        cache_key=cache_key,
        user_id=user_id,
        query=intent.live_search_query,
        lat=None,
        lng=None,
        radius_km=radius_km,
        city=city_label,
        status="pending",
        progress_pct=0,
        cold_scan=False,
        places_snapshot_json=[item.model_dump() for item in places],
    )
    db.add(job)
    db.flush()

    try:
        payload = await run_social_proof_pipeline_async(db, job=job, places=places, intent=intent)
        db.commit()
        return {
            "search_group": intent.search_group,
            "status": job.status,
            "cache_key": cache_key,
            "places": len(places),
            "results": len(payload.get("results") or []),
        }
    except Exception:
        logger.exception("prewarm failed group=%s", intent.search_group)
        db.rollback()
        return {
            "search_group": intent.search_group,
            "status": "failed",
            "cache_key": cache_key,
        }


async def run_social_proof_pipeline_async(
    db: Session,
    *,
    job: SocialProofJob,
    places: list[LivePlaceSearchItem],
    intent: ProductScanIntent,
) -> dict:
    from app.services.social_proof_pipeline import run_social_proof_pipeline

    job.query = intent.live_search_query
    return run_social_proof_pipeline(db, job=job, places=places)


async def prewarm_city_products(
    db: Session,
    *,
    city: str = "Bursa",
    limit: int = 3,
    user_id: uuid.UUID | None = None,
) -> dict:
    intents = list_prewarm_intents_for_city(city)
    if user_id is None:
        user_id = _system_user_id(db)

    stats = {"processed": 0, "skipped": 0, "failed": 0, "items": []}
    for intent in intents[: max(1, limit)]:
        result = await prewarm_product_intent(
            db,
            intent=intent,
            city=city,
            user_id=user_id,
        )
        stats["items"].append(result)
        status = result.get("status")
        if status == "skipped_fresh":
            stats["skipped"] += 1
        elif status in {"ready", "insufficient_data"}:
            stats["processed"] += 1
        else:
            stats["failed"] += 1
    return stats


def resolve_intent_for_user_query(query: str, *, city: str | None) -> ProductScanIntent | None:
    return resolve_product_scan_intent(query, city=city)
