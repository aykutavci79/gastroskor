from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.schemas.app_metrics import AppMetricsSummaryResponse, AppUsageEventCreate
from app.schemas.google_place_catalog import PlaceCatalogStatsResponse
from app.services.app_metrics import ALLOWED_CLIENT_EVENTS, build_metrics_summary, record_app_usage_event
from app.services.google_place_catalog import build_catalog_stats

metrics_router = APIRouter(prefix="/metrics", tags=["metrics"])


def require_admin(secret: str | None) -> None:
    if settings.panel_admin_secret and secret == settings.panel_admin_secret:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin secret required")


@metrics_router.post("/events", status_code=status.HTTP_201_CREATED)
def ingest_app_usage_event(payload: AppUsageEventCreate, db: Session = Depends(get_db)):
    if payload.event_type not in ALLOWED_CLIENT_EVENTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid event_type",
        )
    user_uuid = None
    if payload.user_id:
        try:
            user_uuid = UUID(payload.user_id)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid user_id") from exc

    record_app_usage_event(
        db,
        event_type=payload.event_type,
        user_id=user_uuid,
        session_id=payload.session_id,
        duration_seconds=payload.duration_seconds,
        platform=payload.platform,
        app_version=payload.app_version,
    )
    return {"ok": True}


@metrics_router.get("/admin/summary", response_model=AppMetricsSummaryResponse)
def admin_metrics_summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    return build_metrics_summary(db, days=days)


@metrics_router.get("/admin/place-catalog", response_model=PlaceCatalogStatsResponse)
def admin_place_catalog_stats(
    recent_limit: int = Query(default=10, ge=1, le=50),
    top_queries_limit: int = Query(default=10, ge=1, le=30),
    db: Session = Depends(get_db),
    x_panel_admin_secret: str | None = Header(default=None, alias="X-Panel-Admin-Secret"),
):
    require_admin(x_panel_admin_secret)
    return build_catalog_stats(db, recent_limit=recent_limit, top_queries_limit=top_queries_limit)
