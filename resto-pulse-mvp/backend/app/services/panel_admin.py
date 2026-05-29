from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RestaurantOwnership, User
from app.services.panel_access import start_trial
from app.services.restaurant_claim import ensure_restaurant_for_place

ADMIN_VERIFICATION_METHOD = "admin_bypass"


def panel_admin_emails() -> set[str]:
    raw = settings.panel_admin_emails or ""
    return {part.strip().lower() for part in raw.split(",") if part.strip()}


def is_panel_admin_email(email: str | None) -> bool:
    if not email:
        return False
    allowed = panel_admin_emails()
    if not allowed:
        return False
    return email.strip().lower() in allowed


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def admin_grant_panel_access(
    db: Session,
    *,
    user: User,
    place_id: str,
    city: str = "Bursa",
    force_takeover: bool = False,
    admin_note: str | None = None,
) -> RestaurantOwnership:
    place_id = place_id.strip()
    if not place_id:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="place_id gerekli.")

    existing_place_owner = db.scalar(
        select(RestaurantOwnership).where(RestaurantOwnership.google_place_id == place_id)
    )
    if existing_place_owner and existing_place_owner.user_id != user.id:
        if not force_takeover:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Mekan baska kullanicida. force_takeover=true ile devralinabilir.",
            )
        db.delete(existing_place_owner)
        db.flush()

    existing_user_owner = db.scalar(select(RestaurantOwnership).where(RestaurantOwnership.user_id == user.id))
    if existing_user_owner and existing_user_owner.google_place_id != place_id:
        if not force_takeover:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Kullanicinin baska mekani var. force_takeover=true ile degistirilebilir.",
            )
        db.delete(existing_user_owner)
        db.flush()

    restaurant = await ensure_restaurant_for_place(db, place_id=place_id, city=city)
    ownership = db.scalar(
        select(RestaurantOwnership).where(
            RestaurantOwnership.user_id == user.id,
            RestaurantOwnership.google_place_id == place_id,
        )
    )
    now = _utcnow()
    if ownership is None:
        ownership = RestaurantOwnership(
            user_id=user.id,
            restaurant_id=restaurant.id,
            google_place_id=place_id,
        )
        db.add(ownership)
        db.flush()
    else:
        ownership.restaurant_id = restaurant.id

    ownership.verification_method = ADMIN_VERIFICATION_METHOD
    ownership.verification_status = "verified_sms"
    ownership.panel_tier = "full"
    ownership.verified_at = now
    ownership.visit_completed_at = now
    ownership.tax_document_note = None
    note = (admin_note or "").strip() or "Admin bypass: SMS/vergi adimi atlandi."
    ownership.admin_notes = note

    if user.role != "admin":
        user.role = "admin"
        db.add(user)

    start_trial(db, ownership)
    db.add(ownership)
    db.commit()
    db.refresh(ownership)
    return ownership
