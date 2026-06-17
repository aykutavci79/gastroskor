"""Sosyal kanit is kuyrugu — Postgres poll worker."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SocialProofJob
from app.schemas.live_places import LivePlaceSearchItem
from app.services.social_proof_pipeline import run_social_proof_pipeline

logger = logging.getLogger(__name__)


def run_social_proof_worker_tick(*, limit: int = 1) -> None:
    """HTTP istegi disinda arka planda tek tur worker calistir."""
    from app.db.session import SessionLocal

    db = SessionLocal()
    try:
        process_pending_social_proof_jobs(db, limit=limit)
    except Exception:
        logger.exception("background social proof worker tick failed")
    finally:
        db.close()


def _load_places_snapshot(job: SocialProofJob) -> list[LivePlaceSearchItem]:
    payload = job.places_snapshot_json
    if not payload:
        return []
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return []
    if not isinstance(payload, list):
        return []
    return [LivePlaceSearchItem.model_validate(item) for item in payload]


def process_pending_social_proof_jobs(db: Session, *, limit: int = 3) -> dict[str, int]:
    now = datetime.now(timezone.utc)
    jobs = db.scalars(
        select(SocialProofJob)
        .where(SocialProofJob.status == "pending")
        .order_by(SocialProofJob.created_at.asc())
        .limit(limit)
    ).all()

    processed = 0
    failed = 0
    for job in jobs:
        places = _load_places_snapshot(job)
        if not places:
            job.status = "failed"
            job.error_message = "places_snapshot eksik"
            job.completed_at = now
            failed += 1
            db.commit()
            continue
        try:
            run_social_proof_pipeline(db, job=job, places=places)
            processed += 1
        except Exception as exc:
            logger.exception("social proof job failed: %s", job.id)
            job.status = "failed"
            job.error_message = str(exc)[:500]
            job.completed_at = now
            failed += 1
        db.commit()

    return {"processed": processed, "failed": failed, "picked": len(jobs)}
