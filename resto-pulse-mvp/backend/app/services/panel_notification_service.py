from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import PanelNotification, PanelNotificationPreference, RestaurantOwnership, User
from app.services.email_notify import send_panel_email
from app.services.panel_access import build_panel_access_state

logger = logging.getLogger(__name__)

NOTIFICATION_TYPES = {
    "analysis_approaching",
    "analysis_ready",
    "trial_ending",
    "negative_review",
    "competitor_update",
    "new_follower",
    "new_order",
    "claim_pending_admin",
}

TYPE_PREF_MAP = {
    "analysis_approaching": "analysis_reminders",
    "analysis_ready": "analysis_reminders",
    "trial_ending": "trial_reminders",
    "negative_review": "negative_review_alerts",
    "competitor_update": "competitor_alerts",
}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def panel_base_url() -> str:
    return settings.public_panel_base_url.rstrip("/")


def get_or_create_preferences(db: Session, ownership_id: UUID) -> PanelNotificationPreference:
    row = db.scalar(
        select(PanelNotificationPreference).where(PanelNotificationPreference.ownership_id == ownership_id)
    )
    if row:
        return row
    row = PanelNotificationPreference(ownership_id=ownership_id)
    db.add(row)
    db.flush()
    return row


def is_owner_active(db: Session, ownership: RestaurantOwnership) -> bool:
    state = build_panel_access_state(db, ownership)
    return state.can_access_panel


def pref_allows(notification_type: str, prefs: PanelNotificationPreference) -> bool:
    if not prefs.in_app_enabled and not prefs.email_enabled:
        return False
    field = TYPE_PREF_MAP.get(notification_type)
    if not field:
        return True
    return bool(getattr(prefs, field, True))


def notification_to_dict(row: PanelNotification) -> dict:
    return {
        "id": str(row.id),
        "notification_type": row.notification_type,
        "title": row.title,
        "message": row.message,
        "cta_label": row.cta_label,
        "cta_url": row.cta_url,
        "email_status": row.email_status,
        "opened_at": row.opened_at.isoformat() if row.opened_at else None,
        "clicked_at": row.clicked_at.isoformat() if row.clicked_at else None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "metadata": row.metadata_json or {},
    }


async def send_panel_notification(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    notification_type: str,
    title: str,
    message: str,
    cta_label: str | None,
    cta_url: str | None,
    dedupe_key: str,
    metadata: dict | None = None,
    skip_active_check: bool = False,
) -> PanelNotification | None:
    if notification_type not in NOTIFICATION_TYPES:
        raise ValueError(f"Unknown notification type: {notification_type}")

    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.id == ownership.id)
        .options(selectinload(RestaurantOwnership.user), selectinload(RestaurantOwnership.subscription))
    )
    if not ownership:
        return None

    if not skip_active_check and not is_owner_active(db, ownership):
        logger.info("Skip notification %s — owner inactive", dedupe_key)
        return None

    existing = db.scalar(
        select(PanelNotification).where(
            PanelNotification.ownership_id == ownership.id,
            PanelNotification.dedupe_key == dedupe_key,
        )
    )
    if existing:
        return existing

    prefs = get_or_create_preferences(db, ownership.id)
    if not pref_allows(notification_type, prefs):
        logger.info("Skip notification %s — user preference off", dedupe_key)
        return None

    user = ownership.user or db.get(User, ownership.user_id)
    if not user:
        return None

    row = PanelNotification(
        ownership_id=ownership.id,
        user_id=user.id,
        notification_type=notification_type,
        title=title,
        message=message,
        cta_label=cta_label,
        cta_url=cta_url,
        dedupe_key=dedupe_key,
        metadata_json=metadata or {},
        email_status="pending",
    )
    db.add(row)
    db.flush()

    if prefs.email_enabled:
        ok, err = await send_panel_email(
            to_email=user.email,
            subject=title,
            body_text=message,
            cta_label=cta_label,
            cta_url=cta_url,
        )
        if ok:
            row.email_status = "sent"
            row.email_sent_at = _utcnow()
        else:
            row.email_status = "failed"
            row.email_error = err
    else:
        row.email_status = "skipped"

    db.commit()
    db.refresh(row)
    return row if prefs.in_app_enabled or prefs.email_enabled else row


def mark_notification_opened(db: Session, *, notification_id: UUID, ownership_id: UUID) -> PanelNotification | None:
    row = db.scalar(
        select(PanelNotification).where(
            PanelNotification.id == notification_id,
            PanelNotification.ownership_id == ownership_id,
        )
    )
    if not row or row.opened_at:
        return row
    row.opened_at = _utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def mark_notification_clicked(db: Session, *, notification_id: UUID, ownership_id: UUID) -> PanelNotification | None:
    row = db.scalar(
        select(PanelNotification).where(
            PanelNotification.id == notification_id,
            PanelNotification.ownership_id == ownership_id,
        )
    )
    if not row:
        return row
    now = _utcnow()
    if not row.opened_at:
        row.opened_at = now
    row.clicked_at = now
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def list_notifications(db: Session, *, ownership_id: UUID, limit: int = 30) -> list[PanelNotification]:
    prefs = db.scalar(
        select(PanelNotificationPreference).where(PanelNotificationPreference.ownership_id == ownership_id)
    )
    if prefs and not prefs.in_app_enabled:
        return []
    return db.scalars(
        select(PanelNotification)
        .where(PanelNotification.ownership_id == ownership_id)
        .order_by(PanelNotification.created_at.desc())
        .limit(limit)
    ).all()


def unread_count(db: Session, *, ownership_id: UUID) -> int:
    prefs = db.scalar(
        select(PanelNotificationPreference).where(PanelNotificationPreference.ownership_id == ownership_id)
    )
    if prefs and not prefs.in_app_enabled:
        return 0
    rows = db.scalars(
        select(PanelNotification).where(
            PanelNotification.ownership_id == ownership_id,
            PanelNotification.opened_at.is_(None),
        )
    ).all()
    return len(rows)
