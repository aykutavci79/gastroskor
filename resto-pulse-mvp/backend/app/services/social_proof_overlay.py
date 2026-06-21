"""Sosyal rozet katmani — onbellek okuma + kullanici istegiyle tarama."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.social_proof_product_intents import resolve_scan_context
from app.models import SocialProofJob, User
from app.schemas.social_proof import SocialProofStatus, SocialProofVenueResult
from app.services.city_resolver import resolve_city_name
from app.services.live_place_search_service import search_live_places_optimized
from app.services.query_parser import parse_search_query
from app.services.active_user import require_active_request_user, try_get_active_request_user
from app.services.smart_filters import merge_criteria
from app.services.social_proof_cache import (
    build_product_cache_key,
    find_active_scan_job_id,
    is_cache_fresh,
    read_social_proof_cache,
)
from app.services.social_proof_discover import (
    _poll_url,
    _results_from_cache_payload,
)

logger = logging.getLogger(__name__)

COLD_SCAN_DAILY_LIMIT = 10


def _resolve_user(db: Session) -> User:
    return require_active_request_user(db)


def _count_cold_scans_today(db: Session, user_id: UUID) -> int:
    now = datetime.now(timezone.utc)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    count = db.scalar(
        select(func.count())
        .select_from(SocialProofJob)
        .where(
            SocialProofJob.user_id == user_id,
            SocialProofJob.cold_scan.is_(True),
            SocialProofJob.created_at >= start,
        )
    )
    return int(count or 0)


def _product_cache_key(*, city: str, search_group: str) -> str:
    return build_product_cache_key(city=city, search_group=search_group)


def _status_from_cache_row(row, *, label: str) -> SocialProofStatus:
    results: list[SocialProofVenueResult] = []
    if row.status == "ready":
        results = _results_from_cache_payload(row.payload_json or {})
    return SocialProofStatus(
        status=row.status,
        stale=False,
        can_scan=row.status == "insufficient_data",
        scan_label=label,
        results=results,
    )


def social_overlay_for_query(
    db: Session,
    *,
    query: str,
    city: str | None,
) -> SocialProofStatus:
    """Sehir geneli urun cache — tarama baslatmaz."""
    city_label = resolve_city_name(city) if city else "Bursa"
    context = resolve_scan_context(query, city=city_label)
    cache_key = _product_cache_key(city=city_label, search_group=context.search_group)

    active_job_id = find_active_scan_job_id(db, cache_key)
    if active_job_id:
        return SocialProofStatus(
            status="scanning",
            stale=False,
            can_scan=False,
            scan_label=context.label,
            job_id=active_job_id,
            poll_url=_poll_url(active_job_id),
            progress_pct=10,
            results=[],
        )

    cache_row = read_social_proof_cache(db, cache_key)
    if cache_row and is_cache_fresh(cache_row):
        return _status_from_cache_row(cache_row, label=context.label)

    return SocialProofStatus(
        status="uncached",
        stale=False,
        can_scan=True,
        scan_label=context.label,
        results=[],
    )


async def request_social_product_scan(
    db: Session,
    *,
    query: str,
    city: str | None,
) -> tuple[SocialProofStatus, int]:
    """Kullanici istegiyle urun taramasi — cache yoksa veya yetersizse."""
    user = _resolve_user(db)
    city_label = resolve_city_name(city) if city else "Bursa"
    context = resolve_scan_context(query, city=city_label)
    cache_key = _product_cache_key(city=city_label, search_group=context.search_group)

    active_job_id = find_active_scan_job_id(db, cache_key)
    if active_job_id:
        return (
            SocialProofStatus(
                status="scanning",
                can_scan=False,
                scan_label=context.label,
                job_id=active_job_id,
                poll_url=_poll_url(active_job_id),
                progress_pct=10,
                results=[],
            ),
            202,
        )

    cache_row = read_social_proof_cache(db, cache_key)
    if cache_row and is_cache_fresh(cache_row) and cache_row.status == "ready":
        return (_status_from_cache_row(cache_row, label=context.label), 200)

    if _count_cold_scans_today(db, user.id) >= COLD_SCAN_DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gunluk sosyal tarama limitine ulastiniz (10/gun).",
        )

    search_q = context.live_search_query or query
    parsed = parse_search_query(search_q)
    criteria = merge_criteria(parsed, distance_band=None, rating_band=None)
    places_response = await search_live_places_optimized(
        db,
        q=search_q,
        city=city_label,
        limit=30,
        origin_lat=None,
        origin_lng=None,
        criteria=criteria,
        parsed=parsed,
        distance_band=None,
        rating_band=None,
    )
    if not places_response.items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bu urun icin mekan adayi bulunamadi.",
        )

    cold_scan = cache_row is None or not is_cache_fresh(cache_row)
    job = SocialProofJob(
        cache_key=cache_key,
        user_id=user.id,
        query=query.strip(),
        lat=None,
        lng=None,
        radius_km=30.0,
        city=city_label,
        status="pending",
        progress_pct=0,
        cold_scan=cold_scan,
        places_snapshot_json=[item.model_dump() for item in places_response.items],
    )
    db.add(job)
    db.commit()

    return (
        SocialProofStatus(
            status="scanning",
            can_scan=False,
            scan_label=context.label,
            job_id=str(job.id),
            poll_url=_poll_url(str(job.id)),
            progress_pct=5,
            results=[],
        ),
        202,
    )
