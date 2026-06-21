from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.integrations.maps_links import build_destination_label, build_google_maps_directions_url
from app.models import PlatformName, Restaurant, RestaurantPlatformProfile, UserRestaurantFollow
from app.services.order_review import batch_avg_ratings
from app.schemas.geo_indication import GeoIndicationRead
from app.services.platform_profile_photo import google_photo_url_for_profile
from app.services.restaurant_check_in import merge_check_in_counts_into_rows
from app.services.restaurant_partner import merge_partner_into_row, partner_listings_for_restaurant_ids


def _parse_geo_indications(raw: list | None) -> list[GeoIndicationRead]:
    if not raw:
        return []
    items: list[GeoIndicationRead] = []
    for row in raw:
        if isinstance(row, dict) and row.get("product"):
            items.append(GeoIndicationRead.model_validate(row))
    return items


def _require_active_restaurant(db: Session, restaurant_id: UUID) -> Restaurant:
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return restaurant


def is_following(db: Session, *, user_id: UUID, restaurant_id: UUID) -> bool:
    row = db.scalar(
        select(UserRestaurantFollow.id).where(
            UserRestaurantFollow.user_id == user_id,
            UserRestaurantFollow.restaurant_id == restaurant_id,
        )
    )
    return row is not None


def follower_count(db: Session, *, restaurant_id: UUID) -> int:
    return (
        db.scalar(
            select(func.count(UserRestaurantFollow.id)).where(
                UserRestaurantFollow.restaurant_id == restaurant_id
            )
        )
        or 0
    )


def follow_restaurant(db: Session, *, user_id: UUID, restaurant_id: UUID) -> bool:
    _require_active_restaurant(db, restaurant_id)
    if is_following(db, user_id=user_id, restaurant_id=restaurant_id):
        return False
    db.add(UserRestaurantFollow(user_id=user_id, restaurant_id=restaurant_id))
    db.commit()
    return True


def unfollow_restaurant(db: Session, *, user_id: UUID, restaurant_id: UUID) -> bool:
    row = db.scalar(
        select(UserRestaurantFollow).where(
            UserRestaurantFollow.user_id == user_id,
            UserRestaurantFollow.restaurant_id == restaurant_id,
        )
    )
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True


def build_restaurant_list_rows(db: Session, restaurants: list[Restaurant]) -> list[dict]:
    if not restaurants:
        return []
    restaurant_ids = [r.id for r in restaurants]
    partner_map = partner_listings_for_restaurant_ids(db, restaurant_ids)
    google_profiles: dict[str, RestaurantPlatformProfile] = {}
    google_place_ids: dict[str, str] = {}
    for profile in db.scalars(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id.in_(restaurant_ids),
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    ).all():
        rid = str(profile.restaurant_id)
        google_profiles[rid] = profile
        if profile.external_id:
            google_place_ids[rid] = profile.external_id

    avg_map = batch_avg_ratings(db, restaurant_ids, visit_only=False)

    result: list[dict] = []
    for restaurant in restaurants:
        rid = str(restaurant.id)
        avg_rating = avg_map.get(rid)
        google_profile = google_profiles.get(rid)
        place_id = google_place_ids.get(rid)
        maps_url = build_google_maps_directions_url(
            place_id=place_id,
            latitude=restaurant.latitude,
            longitude=restaurant.longitude,
            query=build_destination_label(
                name=restaurant.name,
                address=restaurant.address,
                city=restaurant.city,
            )
            or restaurant.name,
        )
        row = {
            "id": rid,
            "name": restaurant.name,
            "city": restaurant.city,
            "district": restaurant.district,
            "category": restaurant.category,
            "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
            "google_rating": round(float(google_profile.avg_rating), 1)
            if google_profile and google_profile.avg_rating is not None
            else None,
            "google_review_count": google_profile.review_count if google_profile else None,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "maps_directions_url": maps_url,
            "distance_meters": None,
            "geo_indications": _parse_geo_indications(restaurant.geo_indications),
            "has_geographical_indication": restaurant.has_geographical_indication,
            "gi_product_name": restaurant.gi_product_name,
            "google_photo_url": google_photo_url_for_profile(google_profile),
        }
        merge_partner_into_row(row, partner_map.get(rid))
        result.append(row)
    merge_check_in_counts_into_rows(db, result)
    return result


def list_followed_restaurants(db: Session, *, user_id: UUID, limit: int = 50) -> list[dict]:
    follow_rows = db.scalars(
        select(UserRestaurantFollow)
        .where(UserRestaurantFollow.user_id == user_id)
        .order_by(UserRestaurantFollow.created_at.desc())
        .limit(limit)
    ).all()
    if not follow_rows:
        return []
    restaurant_ids = [row.restaurant_id for row in follow_rows]
    restaurants = db.scalars(
        select(Restaurant).where(
            Restaurant.id.in_(restaurant_ids),
            Restaurant.is_active.is_(True),
        )
    ).all()
    by_id = {r.id: r for r in restaurants}
    ordered = [by_id[rid] for rid in restaurant_ids if rid in by_id]
    rows = build_restaurant_list_rows(db, ordered)
    return _sort_rows_by_rating_desc(rows)


def _rating_sort_score(row: dict) -> float:
    google = row.get("google_rating")
    if google is not None:
        return float(google)
    avg = row.get("avg_rating")
    if avg is not None:
        return float(avg)
    return -1.0


def _sort_rows_by_rating_desc(rows: list[dict]) -> list[dict]:
    return sorted(
        rows,
        key=lambda row: (-_rating_sort_score(row), (row.get("name") or "").lower()),
    )
