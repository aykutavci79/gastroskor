"""Sosyal kanit onbellegi — Postgres, 48 saat TTL."""

from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SocialProofCache
from app.services.profanity_tr import normalize_review_text

# Varsayilan; gercek deger settings.social_proof_cache_ttl_hours (7 gun).
CACHE_TTL_HOURS = 168
GEO_BUCKET_KM = 5.0
MODE_TREND = "trend"


def normalize_tr_query(query: str) -> str:
    return normalize_review_text(query).strip().lower()


def geo_bucket_5km(lat: float | None, lng: float | None) -> tuple[float | None, float | None]:
    """~5 km kutu — enlem/boylam bucket."""
    if lat is None or lng is None:
        return None, None
    step = GEO_BUCKET_KM / 111.0
    return round(lat / step) * step, round(lng / step) * step


def build_social_proof_cache_key(
    *,
    query: str,
    lat: float | None,
    lng: float | None,
    radius_km: float,
    mode: str = MODE_TREND,
) -> str:
    normalized = normalize_tr_query(query)
    lat_b, lng_b = geo_bucket_5km(lat, lng)
    lat_part = f"{lat_b:.4f}" if lat_b is not None else "any"
    lng_part = f"{lng_b:.4f}" if lng_b is not None else "any"
    raw = f"v3|{normalized}|{lat_part}|{lng_part}|{radius_km:.1f}|{mode}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def find_fresh_cache_for_query(db: Session, query: str) -> SocialProofCache | None:
    """Konum bucket'i tutmazsa ayni sorgu icin en guncel hazir onbellek."""
    normalized = normalize_tr_query(query)
    rows = db.scalars(
        select(SocialProofCache)
        .where(SocialProofCache.query_normalized == normalized)
        .order_by(SocialProofCache.updated_at.desc())
        .limit(8)
    ).all()
    for row in rows:
        if is_cache_fresh(row) and row.status == "ready":
            return row
    return None


def find_fresh_cache_for_product(
    db: Session,
    *,
    city: str,
    search_group: str,
) -> SocialProofCache | None:
    key = build_product_cache_key(city=city, search_group=search_group)
    row = read_social_proof_cache(db, key)
    if row and is_cache_fresh(row) and row.status == "ready":
        return row
    return find_fresh_cache_for_query(db, search_group)


def build_product_cache_key(*, city: str, search_group: str, mode: str = MODE_TREND) -> str:
    """Sehir + urun niyeti — kullanici konumundan bagimsiz onbellek."""
    city_part = normalize_tr_query(city) or "any"
    group_part = normalize_tr_query(search_group) or "any"
    raw = f"v4|product|{city_part}|{group_part}|{mode}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def read_social_proof_cache(db: Session, cache_key: str) -> SocialProofCache | None:
    row = db.get(SocialProofCache, cache_key)
    if row is None:
        return None
    return row


def is_cache_fresh(row: SocialProofCache, *, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    expires = row.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    return expires > now


def is_cache_stale(row: SocialProofCache, *, now: datetime | None = None) -> bool:
    return not is_cache_fresh(row, now=now)


def write_social_proof_cache(
    db: Session,
    *,
    cache_key: str,
    query: str,
    lat: float | None,
    lng: float | None,
    radius_km: float,
    status: str,
    payload: dict,
    mode: str = MODE_TREND,
) -> SocialProofCache:
    now = datetime.now(timezone.utc)
    lat_b, lng_b = geo_bucket_5km(lat, lng)
    fresh_ttl = settings.social_proof_cache_ttl_hours or CACHE_TTL_HOURS
    ttl_hours = 6 if status == "insufficient_data" else fresh_ttl
    expires_at = now + timedelta(hours=ttl_hours)
    row = db.get(SocialProofCache, cache_key)
    if row is None:
        row = SocialProofCache(
            cache_key=cache_key,
            query_normalized=normalize_tr_query(query),
            lat_bucket=lat_b,
            lng_bucket=lng_b,
            radius_km=radius_km,
            mode=mode,
            status=status,
            payload_json=payload,
            expires_at=expires_at,
            created_at=now,
            updated_at=now,
        )
        db.add(row)
    else:
        row.query_normalized = normalize_tr_query(query)
        row.lat_bucket = lat_b
        row.lng_bucket = lng_b
        row.radius_km = radius_km
        row.mode = mode
        row.status = status
        row.payload_json = payload
        row.expires_at = expires_at
        row.updated_at = now
    db.flush()
    return row


def find_active_scan_job_id(db: Session, cache_key: str) -> str | None:
    from app.models import SocialProofJob

    job = db.scalar(
        select(SocialProofJob)
        .where(
            SocialProofJob.cache_key == cache_key,
            SocialProofJob.status.in_(("pending", "scanning")),
        )
        .order_by(SocialProofJob.created_at.desc())
        .limit(1)
    )
    return str(job.id) if job else None
