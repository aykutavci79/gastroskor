"""Sosyal kanit isleme hattı — expand → scan → match → sentiment → score."""

from __future__ import annotations

import logging
import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import SocialMention, SocialProofJob
from app.schemas.live_places import LivePlaceSearchItem
from app.schemas.social_proof import SocialProofSourceSummary, SocialProofVenueResult
from app.core.config import settings
from app.services.gastro_score_ranking import haversine_meters
from app.services.social_proof_cache import write_social_proof_cache
from app.services.social_proof_matcher import PlaceCandidate, match_mentions
from app.services.social_proof_scanner import scan_queries
from app.services.social_proof_sentiment import analyze_mention_sentiments, expand_search_queries
from app.constants.social_proof_product_intents import resolve_scan_context
from app.services.social_proof_wilson import (
    MIN_MENTIONS_FOR_BADGE,
    MIN_TOTAL_SCAN_MENTIONS,
    badge_for_venue,
    final_score_for_venue,
    is_insufficient_data,
    wilson_lower_bound,
)

logger = logging.getLogger(__name__)


def build_scan_queries(
    *,
    user_query: str,
    city: str | None,
    places: list[LivePlaceSearchItem],
    max_queries: int = 8,
) -> list[str]:
    """Yalnizca urun/yemek ifadeleri — mekan adi ile dis tarama yapilmaz."""
    _ = places
    context = resolve_scan_context(user_query, city=city or "Bursa")
    queries: list[str] = []
    seen: set[str] = set()
    for candidate in (*context.external_scan_queries, user_query.strip()):
        key = candidate.lower()
        if not candidate or key in seen:
            continue
        queries.append(candidate)
        seen.add(key)
        if len(queries) >= max_queries:
            break
    if queries:
        return queries
    return expand_search_queries(user_query, max_queries=max_queries)


def places_to_candidates(items: list[LivePlaceSearchItem]) -> list[PlaceCandidate]:
    return [
        PlaceCandidate(
            place_id=item.place_id,
            name=item.name,
            restaurant_id=item.restaurant_id,
            latitude=item.latitude,
            longitude=item.longitude,
            is_partner=item.is_premium_partner,
        )
        for item in items
    ]


def _distance_km_for_place(
    item: LivePlaceSearchItem,
    *,
    origin_lat: float | None,
    origin_lng: float | None,
) -> float | None:
    if origin_lat is None or origin_lng is None:
        return item.distance_meters / 1000.0 if item.distance_meters is not None else None
    if item.latitude is None or item.longitude is None:
        return item.distance_meters / 1000.0 if item.distance_meters is not None else None
    return haversine_meters(origin_lat, origin_lng, item.latitude, item.longitude) / 1000.0


def build_venue_results(
    *,
    items: list[LivePlaceSearchItem],
    sentiments: list[tuple],
    origin_lat: float | None,
    origin_lng: float | None,
    skip_insufficient_check: bool = False,
) -> tuple[list[SocialProofVenueResult], bool]:
    by_place: dict[str, dict] = defaultdict(
        lambda: {
            "n_total": 0,
            "n_positive": 0,
            "sources": defaultdict(int),
            "name": "",
            "is_partner": False,
            "distance_km": None,
        }
    )
    place_lookup = {item.place_id: item for item in items}

    for mention, label, _score in sentiments:
        bucket = by_place[mention.place_id]
        bucket["n_total"] += 1
        if label == "positive":
            bucket["n_positive"] += 1
        bucket["sources"][mention.platform] += 1
        item = place_lookup.get(mention.place_id)
        if item:
            bucket["name"] = item.name
            bucket["is_partner"] = item.is_premium_partner
            bucket["distance_km"] = _distance_km_for_place(item, origin_lat=origin_lat, origin_lng=origin_lng)

    venues_with_min_mentions = sum(
        1 for b in by_place.values() if b["n_total"] >= MIN_MENTIONS_FOR_BADGE
    )
    insufficient = False
    if not skip_insufficient_check:
        insufficient = is_insufficient_data(
            total_valid_mentions=len(sentiments),
            matched_venue_count=len(by_place),
            venues_with_min_mentions=venues_with_min_mentions,
        )
    if insufficient:
        return [], True

    results: list[SocialProofVenueResult] = []
    for place_id, bucket in by_place.items():
        n_total = int(bucket["n_total"])
        if n_total < MIN_MENTIONS_FOR_BADGE:
            continue
        n_positive = int(bucket["n_positive"])
        wilson = wilson_lower_bound(n_positive, n_total)
        platform_count = sum(1 for count in bucket["sources"].values() if int(count) > 0)
        badge = badge_for_venue(
            n_total=n_total,
            wilson=wilson,
            platform_count=platform_count,
        )
        if badge is None:
            continue
        _, final_score = final_score_for_venue(
            n_positive=n_positive,
            n_total=n_total,
            is_partner=bool(bucket["is_partner"]),
            distance_km=bucket["distance_km"],
        )
        sources = bucket["sources"]
        results.append(
            SocialProofVenueResult(
                place_id=place_id,
                name=str(bucket["name"] or place_id),
                n_total=n_total,
                n_positive=n_positive,
                wilson=round(wilson, 4),
                badge=badge,
                final_score=round(final_score, 4),
                sources_summary=SocialProofSourceSummary(
                    reddit=int(sources.get("reddit", 0)),
                    x=int(sources.get("x", 0)),
                    youtube=int(sources.get("youtube", 0)),
                    community=int(sources.get("community", 0)),
                ),
            )
        )

    limited = [r for r in results if r.badge == "sınırlı"]
    ranked = [r for r in results if r.badge != "sınırlı"]
    ranked.sort(key=lambda r: (-r.final_score, -r.wilson, -r.n_total))
    limited.sort(key=lambda r: (-r.n_total, -r.wilson))
    return ranked + limited, False


def persist_mentions(
    db: Session,
    *,
    job: SocialProofJob,
    sentiments: list[tuple],
) -> None:
    for mention, label, score in sentiments:
        restaurant_uuid = None
        if mention.restaurant_id:
            try:
                restaurant_uuid = uuid.UUID(str(mention.restaurant_id))
            except ValueError:
                restaurant_uuid = None
        published_at = None
        if mention.published_at:
            try:
                published_at = datetime.fromisoformat(mention.published_at.replace("Z", "+00:00"))
            except ValueError:
                published_at = None
        db.add(
            SocialMention(
                job_id=job.id,
                cache_key=job.cache_key,
                platform=mention.platform,
                author_hash=mention.author_hash,
                matched_place_id=mention.place_id,
                matched_restaurant_id=restaurant_uuid,
                mention_text=mention.text[:2000],
                source_url=mention.source_url,
                sentiment=label,
                sentiment_score=score,
                published_at=published_at,
            )
        )
    db.flush()


def run_social_proof_pipeline(
    db: Session,
    *,
    job: SocialProofJob,
    places: list[LivePlaceSearchItem],
) -> dict:
    now = datetime.now(timezone.utc)
    job.status = "scanning"
    job.started_at = now
    job.progress_pct = 5
    db.flush()

    candidates = places_to_candidates(places)
    queries = build_scan_queries(user_query=job.query, city=job.city, places=places)
    place_names = [item.name for item in places if item.name]
    job.progress_pct = 15
    db.flush()

    raw_mentions, scan_stats = scan_queries(queries, place_names=place_names, city=job.city)
    job.progress_pct = 45
    db.flush()

    matched = match_mentions(
        raw_mentions,
        candidates,
        origin_lat=job.lat,
        origin_lng=job.lng,
        radius_km=job.radius_km,
    )
    job.progress_pct = 60
    db.flush()

    sentiments = analyze_mention_sentiments(matched)
    job.progress_pct = 80
    db.flush()

    results, insufficient = build_venue_results(
        items=places,
        sentiments=sentiments,
        origin_lat=job.lat,
        origin_lng=job.lng,
        skip_insufficient_check=settings.social_proof_scan_mock
        and len(sentiments) >= MIN_TOTAL_SCAN_MENTIONS,
    )

    persist_mentions(db, job=job, sentiments=sentiments)

    payload = {
        "results": [r.model_dump() for r in results],
        "meta": {
            "queries": queries,
            "raw_items": scan_stats.raw_items,
            "matched": len(sentiments),
            "errors": scan_stats.errors[:10],
        },
    }

    if insufficient:
        job.status = "insufficient_data"
        cache_status = "insufficient_data"
        payload["results"] = []
    else:
        job.status = "ready"
        cache_status = "ready"

    job.progress_pct = 100
    job.completed_at = datetime.now(timezone.utc)
    write_social_proof_cache(
        db,
        cache_key=job.cache_key,
        query=job.query,
        lat=job.lat,
        lng=job.lng,
        radius_km=job.radius_km,
        status=cache_status,
        payload=payload,
    )
    db.flush()
    return payload
