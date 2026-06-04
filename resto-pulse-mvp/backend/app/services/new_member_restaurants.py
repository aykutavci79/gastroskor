from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.models import PlatformName, RestaurantOwnership, RestaurantPlatformProfile, Review
from app.services.platform_profile_photo import google_photo_url_for_profile
from app.services.restaurant_partner import merge_partner_into_row, partner_listing_for_ownership
from app.services.restaurant_promo import subscription_allows_promo


def list_new_member_restaurants(db: Session, *, limit: int = 12) -> list[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    rows = db.scalars(
        select(RestaurantOwnership)
        .options(
            selectinload(RestaurantOwnership.restaurant),
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
        .where(RestaurantOwnership.created_at >= cutoff)
        .order_by(RestaurantOwnership.created_at.desc())
        .limit(limit * 2)
    ).all()

    restaurant_ids = [o.restaurant_id for o in rows if o.restaurant_id]
    google_profiles: dict[str, RestaurantPlatformProfile] = {}
    if restaurant_ids:
        for profile in db.scalars(
            select(RestaurantPlatformProfile).where(
                RestaurantPlatformProfile.restaurant_id.in_(restaurant_ids),
                RestaurantPlatformProfile.platform == PlatformName.google_maps,
            )
        ).all():
            google_profiles[str(profile.restaurant_id)] = profile

    result: list[dict] = []
    for ownership in rows:
        if not subscription_allows_promo(ownership.subscription):
            continue
        restaurant = ownership.restaurant
        if not restaurant or not restaurant.is_active:
            continue
        avg_rating = db.scalar(
            select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant.id)
        )
        partner = partner_listing_for_ownership(ownership)
        row = {
            "id": str(restaurant.id),
            "name": restaurant.name,
            "city": restaurant.city,
            "district": restaurant.district,
            "category": restaurant.category,
            "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
            "geo_indications": [],
            "has_geographical_indication": restaurant.has_geographical_indication,
            "gi_product_name": restaurant.gi_product_name,
            "member_since": ownership.created_at.isoformat() if ownership.created_at else None,
            "google_photo_url": google_photo_url_for_profile(google_profiles.get(str(restaurant.id))),
        }
        merge_partner_into_row(row, partner)
        result.append(row)
        if len(result) >= limit:
            break
    return result
