"""Canli arama KPI: kaynak takibi ve sorgu gruplama."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AppUsageEvent
from app.services.app_metrics import record_app_usage_event
from app.services.profanity_tr import normalize_review_text

TRAILING_QUERY_NOISE = (
    " kebap",
    " kebabi",
    " kebab",
    " restoran",
    " restoranlari",
    " restoranlar",
    " mekan",
    " mekanlari",
    " mekanlar",
    " yer",
    " yerler",
    " satan",
    " satanlar",
    " ara",
    " arama",
    " aramasi",
    " bul",
    " getir",
    " yakin",
    " yakinimda",
    " yakinda",
)

GOOGLE_CALLED_SOURCES = frozenset({"db_and_google"})


def normalize_catalog_source_query(raw: str | None) -> str:
    """Benzer arama ifadelerini tek grupta topla (orn. iskender + iskender kebap)."""
    text = normalize_review_text(raw or "").strip().lower()
    if not text:
        return ""

    changed = True
    while changed:
        changed = False
        for noise in TRAILING_QUERY_NOISE:
            if text.endswith(noise):
                text = text[: -len(noise)].strip()
                changed = True

    return text or normalize_review_text(raw or "").strip().lower()


def live_search_metadata_from_filters(filters_applied: dict | None) -> dict:
    source = str((filters_applied or {}).get("source") or "unknown")
    google_called = source in GOOGLE_CALLED_SOURCES
    return {
        "source": source,
        "google_called": google_called,
        "google_free": not google_called,
    }


def record_live_search_metric(
    db: Session,
    *,
    city: str,
    query: str,
    filters_applied: dict | None,
) -> None:
    meta = live_search_metadata_from_filters(filters_applied)
    record_app_usage_event(
        db,
        event_type="live_search",
        platform="api",
        metadata={
            **meta,
            "city": (city or "").strip()[:80] or None,
            "query": (query or "").strip()[:200] or None,
            "query_group": normalize_catalog_source_query(query) or None,
        },
    )


def build_live_search_source_stats(db: Session, *, days: int = 30) -> dict:
    days = max(1, min(days, 365))
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days - 1)
    since = since.replace(hour=0, minute=0, second=0, microsecond=0)

    rows = db.scalars(
        select(AppUsageEvent.metadata_json).where(
            AppUsageEvent.event_type == "live_search",
            AppUsageEvent.created_at >= since,
        )
    ).all()

    total_events = len(rows)
    tracked = 0
    file_cache_hits = 0
    google_api_calls = 0
    google_free = 0
    by_source: dict[str, int] = {}
    grouped_queries: dict[str, int] = {}

    for metadata in rows:
        if not metadata or not metadata.get("source"):
            continue
        tracked += 1
        source = str(metadata["source"])
        by_source[source] = by_source.get(source, 0) + 1
        query_group = str(metadata.get("query_group") or metadata.get("query") or "").strip()
        if query_group:
            grouped_queries[query_group] = grouped_queries.get(query_group, 0) + 1
        if source == "cache":
            file_cache_hits += 1
        if metadata.get("google_called"):
            google_api_calls += 1
        elif metadata.get("google_free"):
            google_free += 1

    def pct(part: int, whole: int) -> float | None:
        if whole <= 0:
            return None
        return round(part / whole * 100, 1)

    return {
        "period_days": days,
        "total_live_searches": total_events,
        "tracked_searches": tracked,
        "file_cache_hits": file_cache_hits,
        "google_api_calls": google_api_calls,
        "google_free_searches": google_free,
        "file_cache_hit_rate_pct": pct(file_cache_hits, tracked),
        "google_free_rate_pct": pct(google_free, tracked),
        "by_source": [
            {"source": source, "count": count}
            for source, count in sorted(by_source.items(), key=lambda row: (-row[1], row[0]))
        ],
        "top_query_groups": [
            {"query": query, "count": count}
            for query, count in sorted(grouped_queries.items(), key=lambda row: (-row[1], row[0]))[:10]
        ],
    }
