"""Deneme / tester online siparis restoranlari — web SEO ve vitrin disi."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

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
