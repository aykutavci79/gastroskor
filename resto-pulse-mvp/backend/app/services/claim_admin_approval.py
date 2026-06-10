from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import RestaurantOwnership, User
from app.services.email_notify import send_panel_email
from app.services.panel_access import start_trial
from app.services.panel_admin import panel_admin_emails
from app.services.panel_notification_service import panel_base_url, send_panel_notification

logger = logging.getLogger(__name__)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def pending_claim_to_dict(row: RestaurantOwnership) -> dict:
    user = row.user
    restaurant = row.restaurant
    return {
        "ownership_id": str(row.id),
        "user_email": user.email if user else None,
        "user_name": user.full_name if user else None,
        "restaurant_id": str(row.restaurant_id),
        "restaurant_name": restaurant.name if restaurant else None,
        "google_place_id": row.google_place_id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "verification_status": row.verification_status,
    }


def list_pending_claim_requests(db: Session) -> list[dict]:
    rows = db.scalars(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.verification_status == "pending_admin")
        .options(selectinload(RestaurantOwnership.user), selectinload(RestaurantOwnership.restaurant))
        .order_by(RestaurantOwnership.created_at.asc())
    ).all()
    return [pending_claim_to_dict(row) for row in rows]


async def notify_admins_claim_pending(
    db: Session,
    *,
    ownership: RestaurantOwnership,
    claimant: User,
    restaurant_name: str,
) -> None:
    admin_url = f"{panel_base_url()}/admin"
    title = "Yeni mekan claim talebi"
    message = (
        f"{claimant.email} kullanicisi «{restaurant_name}» mekanini panele baglamak istiyor. "
        f"Onaylamak icin admin paneline gidin."
    )
    for email in panel_admin_emails():
        await send_panel_email(
            to_email=email,
            subject=f"GastroSkor — {title}",
            body_text=message,
            cta_label="Admin panel",
            cta_url=admin_url,
        )
        admin_user = db.scalar(select(User).where(User.email == email))
        if not admin_user:
            continue
        admin_ownership = db.scalar(
            select(RestaurantOwnership).where(RestaurantOwnership.user_id == admin_user.id)
        )
        if not admin_ownership:
            continue
        try:
            await send_panel_notification(
                db,
                ownership=admin_ownership,
                notification_type="claim_pending_admin",
                title=title,
                message=message,
                cta_label="Onayla",
                cta_url=admin_url,
                dedupe_key=f"claim_pending:{ownership.id}",
                metadata={"claim_ownership_id": str(ownership.id), "claimant_email": claimant.email},
                skip_active_check=True,
            )
        except ValueError:
            logger.warning("claim_pending_admin notification type missing")


def approve_claim_request(db: Session, *, ownership_id: UUID) -> RestaurantOwnership:
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.id == ownership_id)
        .options(selectinload(RestaurantOwnership.restaurant), selectinload(RestaurantOwnership.user))
    )
    if ownership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talep bulunamadi.")
    if ownership.verification_status != "pending_admin":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Talep zaten islenmis.")

    ownership.verification_status = "verified_sms"
    ownership.panel_tier = "full"
    ownership.verification_method = "admin_approval"
    ownership.verified_at = _utcnow()
    start_trial(db, ownership)
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership


def reject_claim_request(db: Session, *, ownership_id: UUID, admin_note: str | None = None) -> None:
    ownership = db.get(RestaurantOwnership, ownership_id)
    if ownership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Talep bulunamadi.")
    if ownership.verification_status != "pending_admin":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Talep zaten islenmis.")
    if admin_note:
        ownership.admin_notes = admin_note.strip()
        db.add(ownership)
        db.flush()
    db.delete(ownership)
    db.commit()
