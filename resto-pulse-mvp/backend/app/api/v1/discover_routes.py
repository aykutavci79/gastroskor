from __future__ import annotations

import threading
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.social_proof import (
    DiscoverSearchRequest,
    DiscoverSearchResponse,
    SocialProofJobResponse,
    SocialProofScanRequest,
    SocialProofStatus,
)
from app.services.social_proof_discover import discover_search, get_discover_job
from app.services.social_proof_overlay import request_social_product_scan, social_overlay_for_query
from app.services.social_proof_worker import process_pending_social_proof_jobs, run_social_proof_worker_tick

router = APIRouter(prefix="/discover", tags=["discover"])


@router.get("/social-overlay", response_model=SocialProofStatus)
def get_social_overlay(
    query: str,
    city: str | None = None,
    db: Session = Depends(get_db),
):
    """Sehir geneli urun rozetleri — onbellek okuma; tarama baslatmaz."""
    return social_overlay_for_query(db, query=query, city=city)


@router.post("/social-scan", response_model=SocialProofStatus)
async def post_social_scan(
    body: SocialProofScanRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Kullanici istegiyle sosyal kanit taramasi — onceden taranmamis urunler icin."""
    result, code = await request_social_product_scan(
        db,
        query=body.query,
        city=body.city,
    )
    if result.job_id:
        background_tasks.add_task(run_social_proof_worker_tick, limit=1)
        if settings.social_proof_scan_mock:
            threading.Thread(target=run_social_proof_worker_tick, kwargs={"limit": 1}, daemon=True).start()
    response.status_code = code
    return result


@router.post("/search", response_model=DiscoverSearchResponse)
async def post_discover_search(
    body: DiscoverSearchRequest,
    response: Response,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result, code = await discover_search(
        db,
        query=body.query,
        lat=body.lat,
        lng=body.lng,
        radius_km=body.radius_km,
        city=body.city,
    )
    if result.social.job_id:
        background_tasks.add_task(run_social_proof_worker_tick, limit=1)
        if settings.social_proof_scan_mock:
            threading.Thread(target=run_social_proof_worker_tick, kwargs={"limit": 1}, daemon=True).start()
    response.status_code = code
    return result


@router.get("/jobs/{job_id}", response_model=SocialProofJobResponse)
def get_discover_job_status(
    job_id: UUID,
    db: Session = Depends(get_db),
):
    return get_discover_job(db, job_id)
