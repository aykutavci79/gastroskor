"""Discover search orchestrator — canli arama + sosyal kanit cache/job."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import SocialProofJob, User
from app.schemas.live_places import LivePlaceSearchResponse
from app.schemas.social_proof import (
    DiscoverSearchResponse,
    SocialProofJobResponse,
    SocialProofStatus,
    SocialProofVenueResult,
)
from app.services.city_resolver import resolve_city_from_coords, resolve_city_name
from app.services.live_place_search_service import search_live_places_optimized
from app.services.query_parser import parse_search_query
from app.services.request_identity import get_request_auth
from app.services.smart_filters import merge_criteria
from app.services.social_proof_cache import (
    build_social_proof_cache_key,
    find_active_scan_job_id,
    is_cache_fresh,
    is_cache_stale,
    read_social_proof_cache,
)
logger = logging.getLogger(__name__)

COLD_SCAN_DAILY_LIMIT = 10


def _resolve_user(db: Session) -> User:
    auth = get_request_auth()
    if auth is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Giris gerekli.")
    user = db.get(User, auth.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Kullanici bulunamadi.")
    return user


def _try_resolve_user(db: Session) -> User | None:
    auth = get_request_auth()
    if auth is None:
        return None
    return db.get(User, auth.user_id)


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


def _results_from_cache_payload(payload: dict) -> list[SocialProofVenueResult]:
    raw = payload.get("results") or []
    if not isinstance(raw, list):
        return []
    return [SocialProofVenueResult.model_validate(item) for item in raw]


def _poll_url(job_id: str) -> str:
    prefix = settings.api_v1_prefix.rstrip("/")
    return f"{prefix}/discover/jobs/{job_id}"


def _social_status_from_cache(
    row,
    *,
    stale: bool,
    refresh_job_id: str | None = None,
) -> SocialProofStatus:
    payload = row.payload_json or {}
    results = _results_from_cache_payload(payload)
    cache_status = row.status if row.status in {"ready", "insufficient_data"} else "ready"
    return SocialProofStatus(
        status=cache_status,
        stale=stale,
        job_id=refresh_job_id,
        poll_url=_poll_url(refresh_job_id) if refresh_job_id else None,
        results=results,
    )


def _social_status_from_job(job: SocialProofJob) -> SocialProofStatus:
    if job.status in {"ready", "insufficient_data"}:
        cache = None
        return SocialProofStatus(
            status=job.status,
            stale=False,
            progress_pct=job.progress_pct,
            results=[],
        )
    return SocialProofStatus(
        status=job.status,
        stale=False,
        job_id=str(job.id),
        poll_url=_poll_url(str(job.id)),
        progress_pct=job.progress_pct,
        results=[],
    )


async def discover_search(
    db: Session,
    *,
    query: str,
    lat: float | None,
    lng: float | None,
    radius_km: float,
    city: str | None,
) -> tuple[DiscoverSearchResponse, int]:
    user = _try_resolve_user(db)
    city_label = resolve_city_name(city) if city else resolve_city_from_coords(lat, lng)
    cache_key = build_social_proof_cache_key(
        query=query,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
    )

    parsed = parse_search_query(query)
    criteria = merge_criteria(parsed, distance_band=None, rating_band=None)
    places_response: LivePlaceSearchResponse = await search_live_places_optimized(
        db,
        q=query,
        city=city_label,
        limit=20,
        origin_lat=lat,
        origin_lng=lng,
        criteria=criteria,
        parsed=parsed,
        distance_band=None,
        rating_band=None,
    )

    cache_row = read_social_proof_cache(db, cache_key)
    if cache_row is None:
        cache_row = find_fresh_cache_for_query(db, query)
    if cache_row and is_cache_fresh(cache_row) and cache_row.status != "insufficient_data":
        social = _social_status_from_cache(cache_row, stale=False)
        return (
            DiscoverSearchResponse(places=places_response.items, social=social),
            200,
        )

    active_job_id = find_active_scan_job_id(db, cache_key)
    if active_job_id:
        social = SocialProofStatus(
            status="scanning",
            stale=False,
            job_id=active_job_id,
            poll_url=_poll_url(active_job_id),
            progress_pct=10,
            results=[],
        )
        return DiscoverSearchResponse(places=places_response.items, social=social), 202

    if cache_row and is_cache_fresh(cache_row) and cache_row.status == "insufficient_data":
        if user is None:
            social = _social_status_from_cache(cache_row, stale=False)
            return DiscoverSearchResponse(places=places_response.items, social=social), 200
        retry_job = _enqueue_job(
            db,
            user=user,
            query=query,
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            city=city_label,
            cache_key=cache_key,
            cold_scan=False,
            places=places_response,
        )
        db.commit()
        social = SocialProofStatus(
            status="scanning",
            stale=False,
            job_id=str(retry_job.id),
            poll_url=_poll_url(str(retry_job.id)),
            progress_pct=5,
            results=[],
        )
        return DiscoverSearchResponse(places=places_response.items, social=social), 202

    if cache_row and is_cache_stale(cache_row):
        if user is None:
            social = _social_status_from_cache(cache_row, stale=True)
            return DiscoverSearchResponse(places=places_response.items, social=social), 200
        refresh_job = _enqueue_job(
            db,
            user=user,
            query=query,
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            city=city_label,
            cache_key=cache_key,
            cold_scan=False,
            places=places_response,
        )
        social = _social_status_from_cache(
            cache_row,
            stale=True,
            refresh_job_id=str(refresh_job.id),
        )
        db.commit()
        return DiscoverSearchResponse(places=places_response.items, social=social), 200

    if user is None:
        social = SocialProofStatus(
            status="insufficient_data",
            stale=False,
            results=[],
        )
        return DiscoverSearchResponse(places=places_response.items, social=social), 200

    if _count_cold_scans_today(db, user.id) >= COLD_SCAN_DAILY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Gunluk sosyal tarama limitine ulastiniz (10/gun).",
        )

    job = _enqueue_job(
        db,
        user=user,
        query=query,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        city=city_label,
        cache_key=cache_key,
        cold_scan=True,
        places=places_response,
    )
    db.commit()

    social = SocialProofStatus(
        status="scanning",
        stale=False,
        job_id=str(job.id),
        poll_url=_poll_url(str(job.id)),
        progress_pct=5,
        results=[],
    )
    return DiscoverSearchResponse(places=places_response.items, social=social), 202


def _enqueue_job(
    db: Session,
    *,
    user: User,
    query: str,
    lat: float | None,
    lng: float | None,
    radius_km: float,
    city: str,
    cache_key: str,
    cold_scan: bool,
    places: LivePlaceSearchResponse,
) -> SocialProofJob:
    job = SocialProofJob(
        cache_key=cache_key,
        user_id=user.id,
        query=query,
        lat=lat,
        lng=lng,
        radius_km=radius_km,
        city=city,
        status="pending",
        progress_pct=0,
        cold_scan=cold_scan,
        places_snapshot_json=[item.model_dump() for item in places.items],
    )
    db.add(job)
    db.flush()
    return job


def get_discover_job(db: Session, job_id: UUID) -> SocialProofJobResponse:
    _try_resolve_user(db)
    job = db.get(SocialProofJob, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Is bulunamadi.")

    if job.status == "pending":
        try:
            process_pending_social_proof_jobs(db, limit=1)
            db.refresh(job)
        except Exception:
            logger.exception("lazy social proof worker tick failed")

    if job.status in {"ready", "insufficient_data", "failed"}:
        cache_row = read_social_proof_cache(db, job.cache_key)
        results: list[SocialProofVenueResult] = []
        status_value = job.status
        if cache_row and job.status != "failed":
            results = _results_from_cache_payload(cache_row.payload_json or {})
            status_value = cache_row.status
        social = SocialProofStatus(
            status=status_value,
            stale=False,
            job_id=str(job.id),
            poll_url=_poll_url(str(job.id)),
            progress_pct=job.progress_pct,
            results=results,
        )
        return SocialProofJobResponse(
            job_id=str(job.id),
            status=job.status,
            progress_pct=job.progress_pct,
            social=social,
        )

    return SocialProofJobResponse(
        job_id=str(job.id),
        status=job.status,
        progress_pct=job.progress_pct,
        social=_social_status_from_job(job),
    )
