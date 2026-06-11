"""Restoran guven puani — online siparis listesi icin."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants.online_orders import MIN_LIST_RATING
from app.models import PlatformName, RestaurantPlatformProfile, Review


def resolve_restaurant_trust_rating(db: Session, restaurant_id: UUID) -> float | None:
    google_profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant_id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )
    google_rating = (
        float(google_profile.avg_rating)
        if google_profile and google_profile.avg_rating is not None
        else None
    )
    avg_gs = db.scalar(select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant_id))
    avg_rating = float(avg_gs) if avg_gs is not None else None
    if google_rating is not None:
        return google_rating
    return avg_rating


def meets_online_order_trust_rating(db: Session, restaurant_id: UUID) -> bool:
    rating = resolve_restaurant_trust_rating(db, restaurant_id)
    return rating is not None and rating >= MIN_LIST_RATING
