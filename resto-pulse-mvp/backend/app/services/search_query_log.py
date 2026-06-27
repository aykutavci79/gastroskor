"""Google arama sorgu gunlugu — tekrarlayan sorgularda Places API cagrisini atla."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SearchQueryLog

SEARCH_QUERY_LOG_TTL_DAYS = 7


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def recent_google_search_log(
    db: Session,
    *,
    query_key: str,
    city_key: str,
    within_days: int = SEARCH_QUERY_LOG_TTL_DAYS,
) -> SearchQueryLog | None:
    cutoff = _utcnow() - timedelta(days=max(1, within_days))
    return db.scalar(
        select(SearchQueryLog)
        .where(
            SearchQueryLog.query_key == query_key,
            SearchQueryLog.city == city_key,
            SearchQueryLog.google_fetched_at >= cutoff,
        )
        .order_by(SearchQueryLog.google_fetched_at.desc())
        .limit(1)
    )


def should_skip_google_from_query_log(
    db: Session,
    *,
    query_key: str,
    city_key: str,
    prefetched_count: int,
) -> bool:
    """Son 7 gunde ayni sorgu icin Google'a gidildiyse ve DB'de yeterli kayit varsa atla."""
    log = recent_google_search_log(db, query_key=query_key, city_key=city_key)
    if log is None:
        return False
    if log.result_count <= 0:
        return True
    return prefetched_count >= int(log.result_count)


def record_google_search_fetch(
    db: Session,
    *,
    query_key: str,
    city_key: str,
    result_count: int,
) -> None:
    now = _utcnow()
    existing = db.scalar(
        select(SearchQueryLog).where(
            SearchQueryLog.query_key == query_key,
            SearchQueryLog.city == city_key,
        )
    )
    if existing:
        existing.google_fetched_at = now
        existing.result_count = max(0, int(result_count))
        db.commit()
        return

    db.add(
        SearchQueryLog(
            query_key=query_key,
            city=city_key,
            google_fetched_at=now,
            result_count=max(0, int(result_count)),
        )
    )
    db.commit()
