from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models import RestaurantOwnership, RestaurantPanelApplication, User
from app.services.request_identity import RequestAuth, require_request_auth, resolve_authenticated_email
from app.services.panel_access import start_trial
from app.services.restaurant_claim import ensure_restaurant_for_place

ADMIN_VERIFICATION_METHOD = "admin_bypass"


def _normalize_admin_email_part(value: str) -> str:
    cleaned = value.strip().strip('"').strip("'").lower()
    return cleaned


def panel_admin_emails() -> set[str]:
    raw = settings.panel_admin_emails or ""
    return {_normalize_admin_email_part(part) for part in raw.split(",") if part.strip()}


def is_panel_admin_email(email: str | None) -> bool:
    if not email:
        return False
    allowed = panel_admin_emails()
    if not allowed:
        return False
    return email.strip().lower() in allowed


def assert_admin_grant_allowed(*, user_email: str, secret_header: str | None) -> None:
    """JWT (prod'da zorunlu) + admin e-posta + (secret tanimliysa) header eslesmesi."""
    verified_email = resolve_authenticated_email(claimed_email=user_email)
    if not is_panel_admin_email(verified_email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin yetkisi yok. PANEL_ADMIN_EMAILS icinde "
                f"{verified_email.strip().lower()} olmali."
            ),
        )

    expected = (settings.panel_admin_secret or "").strip()
    if expected and (secret_header or "").strip() != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin secret required",
        )


def require_panel_admin_access(*, secret_header: str | None) -> RequestAuth:
    """Panel admin uclari: JWT + admin e-posta + (secret tanimliysa) X-Panel-Admin-Secret."""
    auth = require_request_auth()
    if not is_panel_admin_email(auth.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin yetkisi yok.",
        )
    expected = (settings.panel_admin_secret or "").strip()
    if expected and (secret_header or "").strip() != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin secret required",
        )
    return auth


def require_panel_admin_jwt() -> RequestAuth:
    """KPI/metrics gibi web panel okuma uclari — JWT + Railway PANEL_ADMIN_EMAILS yeterli."""
    auth = require_request_auth()
    if not is_panel_admin_email(auth.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Admin yetkisi yok. Railway PANEL_ADMIN_EMAILS icinde "
                f"{auth.email.strip().lower()} olmali."
            ),
        )
    return auth


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
        existing_user_owner = db.scalar(
            select(RestaurantOwnership).where(RestaurantOwnership.user_id == user.id)
        )
        if existing_user_owner and existing_user_owner.id != existing_place_owner.id:
            db.delete(existing_user_owner)
            db.flush()
        existing_place_owner.user_id = user.id
        existing_place_owner.verification_method = ADMIN_VERIFICATION_METHOD
        existing_place_owner.verification_status = "verified_sms"
        existing_place_owner.panel_tier = "full"
        existing_place_owner.verified_at = _utcnow()
        existing_place_owner.visit_completed_at = _utcnow()
        note = (admin_note or "").strip() or "Admin bypass: SMS/vergi adimi atlandi."
        existing_place_owner.admin_notes = note
        if user.role != "admin":
            user.role = "admin"
            db.add(user)
        start_trial(db, existing_place_owner)
        db.add(existing_place_owner)
        db.commit()
        db.refresh(existing_place_owner)
        return existing_place_owner

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


def release_user_panel_ownership(db: Session, *, user: User) -> dict:
    """Admin test: hesaptaki mekan bagini kopar (reset-public-data ownership silmez)."""
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.user_id == user.id)
        .options(
            selectinload(RestaurantOwnership.restaurant),
            selectinload(RestaurantOwnership.subscription),
        )
    )
    if not ownership:
        return {"removed": False, "restaurant_name": None}
    restaurant_name = ownership.restaurant.name if ownership.restaurant else None

    if ownership.panel_application_id:
        application = db.get(RestaurantPanelApplication, ownership.panel_application_id)
        if application is not None and application.ownership_id == ownership.id:
            application.ownership_id = None
            db.add(application)

    db.delete(ownership)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Mekan baglantisi koparilamadi (bagli panel kayitlari). Destek ile iletisime gecin.",
        ) from exc
    return {"removed": True, "restaurant_name": restaurant_name}
