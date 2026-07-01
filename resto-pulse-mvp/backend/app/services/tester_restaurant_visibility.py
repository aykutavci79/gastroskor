"""Deneme / tester online siparis restoranlari — web SEO ve vitrin disi."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import RestaurantOwnership

TESTER_SEED_PLACE_ID_PREFIX = "gastro-tester-"


def is_tester_seed_place_id(place_id: str | None) -> bool:
    pid = (place_id or "").strip()
    return pid.startswith(TESTER_SEED_PLACE_ID_PREFIX)


def is_tester_seed_ownership(ownership: RestaurantOwnership | None) -> bool:
    if ownership is None:
        return False
    if is_tester_seed_place_id(ownership.google_place_id):
        return True
    return (ownership.verification_method or "").strip() == "tester_seed"


def _internal_preview_email_set() -> set[str]:
    emails: set[str] = set()
    for raw in (settings.internal_preview_emails or "").split(","):
        email = raw.strip().lower()
        if email:
            emails.add(email)
    for raw in (settings.panel_admin_emails or "").split(","):
        email = raw.strip().lower()
        if email:
            emails.add(email)
    return emails


def viewer_can_see_tester_seeds(viewer_email: str | None) -> bool:
    if not settings.exclude_tester_seeds_public:
        return True
    email = (viewer_email or "").strip().lower()
    if not email:
        return False
    return email in _internal_preview_email_set()


def should_hide_tester_ownership(
    ownership: RestaurantOwnership | None,
    *,
    viewer_email: str | None,
) -> bool:
    if not is_tester_seed_ownership(ownership):
        return False
    return not viewer_can_see_tester_seeds(viewer_email)


def mask_partner_dict_for_viewer(
    partner: dict,
    ownership: RestaurantOwnership | None,
    *,
    viewer_email: str | None,
) -> dict:
    if not should_hide_tester_ownership(ownership, viewer_email=viewer_email):
        return partner
    masked = dict(partner)
    masked["online_orders_available"] = False
    masked["online_orders_open_now"] = False
    masked["online_reservations_available"] = False
    masked["reservation_vitrin_listed"] = False
    masked["is_premium_partner"] = False
    return masked


def ownership_place_id_for_restaurant(db: Session, restaurant_id: UUID) -> str | None:
    return db.scalar(
        select(RestaurantOwnership.google_place_id)
        .where(RestaurantOwnership.restaurant_id == restaurant_id)
        .limit(1)
    )


def restaurant_should_seo_noindex(
    db: Session,
    restaurant_id: UUID,
    *,
    google_place_id: str | None = None,
) -> bool:
    pid = (google_place_id or "").strip() or None
    if is_tester_seed_place_id(pid):
        return True
    ownership_pid = ownership_place_id_for_restaurant(db, restaurant_id)
    return is_tester_seed_place_id(ownership_pid)
