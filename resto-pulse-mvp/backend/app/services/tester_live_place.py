"""Gastro tester deneme restoranlari — Google Places olmadan detay."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.integrations.maps_links import (
    build_destination_label,
    build_google_maps_directions_url,
    build_google_maps_search_url,
)
from app.models import PlatformName, RestaurantOwnership, RestaurantPlatformProfile
from app.schemas.live_places import LivePlaceDetails
from app.services.tester_restaurant_visibility import is_tester_seed_place_id


def build_tester_live_place_details(
    db: Session,
    place_id: str,
    *,
    city: str = "Bursa",
) -> LivePlaceDetails | None:
    if not is_tester_seed_place_id(place_id):
        return None

    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id == place_id)
        .options(selectinload(RestaurantOwnership.restaurant))
        .limit(1)
    )
    if not ownership or not ownership.restaurant or not ownership.restaurant.is_active:
        return None

    restaurant = ownership.restaurant
    profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant.id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )
    rating = float(profile.avg_rating) if profile and profile.avg_rating is not None else None
    review_count = int(profile.review_count) if profile and profile.review_count is not None else None

    destination = build_destination_label(
        name=restaurant.name,
        address=restaurant.address,
        city=city,
    ) or restaurant.name

    return LivePlaceDetails(
        place_id=place_id,
        restaurant_id=str(restaurant.id),
        name=restaurant.name,
        address=restaurant.address,
        rating=rating,
        user_ratings_total=review_count,
        phone_number=(ownership.promo_direct_order_phone or "").strip() or None,
        website=None,
        opening_hours=None,
        reviews=[],
        member_reviews=[],
        member_review_count=0,
        member_avg_rating=None,
        maps_directions_url=build_google_maps_directions_url(
            place_id=place_id,
            latitude=restaurant.latitude,
            longitude=restaurant.longitude,
            query=destination,
        ),
        maps_search_url=build_google_maps_search_url(place_id=place_id, query=destination),
        photo_urls=[],
        analysis=None,
    )
