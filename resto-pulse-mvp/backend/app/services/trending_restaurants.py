from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import PlatformName, Restaurant, RestaurantPlatformProfile, Review
from app.schemas.geo_indication import GeoIndicationRead
from app.services.gastro_score_ranking import haversine_meters, resolve_origin
from app.services.restaurant_partner import merge_partner_into_row, partner_listings_for_restaurant_ids


def _parse_geo_indications(raw: list | None) -> list[GeoIndicationRead]:
    if not raw:
        return []
    items: list[GeoIndicationRead] = []
    for row in raw:
        if isinstance(row, dict) and row.get("product"):
            items.append(GeoIndicationRead.model_validate(row))
    return items


def _distance_km(distance_m: float | None) -> float | None:
    if distance_m is None:
        return None
    return round(distance_m / 1000, 1)


def get_trending_restaurants_week(
    db: Session,
    *,
    limit: int = 6,
    days: int = 7,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    city: str = "Bursa",
) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    origin_lat_r, origin_lng_r, distance_origin = resolve_origin(city, origin_lat, origin_lng)

    week_stats = db.execute(
        select(
            Review.restaurant_id,
            func.count(Review.id).label("week_review_count"),
            func.avg(Review.rating).label("week_avg_rating"),
        )
        .where(Review.created_at >= since)
        .group_by(Review.restaurant_id)
        .order_by(func.count(Review.id).desc(), func.avg(Review.rating).desc())
        .limit(max(limit * 4, 24))
    ).all()

    restaurant_ids = [row.restaurant_id for row in week_stats]
    if not restaurant_ids:
        result = _fallback_by_total_reviews(
            db,
            limit=limit,
            origin_lat=origin_lat_r,
            origin_lng=origin_lng_r,
            distance_origin=distance_origin,
            city=city,
        )
        if result:
            return result
        return _fallback_by_google_profile_or_nearby(
            db,
            limit=limit,
            origin_lat=origin_lat_r,
            origin_lng=origin_lng_r,
            distance_origin=distance_origin,
            city=city,
        )

    restaurants = {
        r.id: r
        for r in db.scalars(
            select(Restaurant).where(
                Restaurant.id.in_(restaurant_ids),
                Restaurant.is_active.is_(True),
            )
        ).all()
    }

    candidates: list[dict] = []
    for row in week_stats:
        restaurant = restaurants.get(row.restaurant_id)
        if not restaurant:
            continue
        distance_m = None
        if restaurant.latitude is not None and restaurant.longitude is not None:
            distance_m = haversine_meters(
                origin_lat_r,
                origin_lng_r,
                restaurant.latitude,
                restaurant.longitude,
            )
        candidates.append(
            {
                "restaurant": restaurant,
                "week_review_count": int(row.week_review_count),
                "week_avg_rating": round(float(row.week_avg_rating), 1)
                if row.week_avg_rating is not None
                else None,
                "distance_meters": distance_m,
            }
        )

    candidates.sort(
        key=lambda item: (
            -item["week_review_count"],
            -(item["week_avg_rating"] or 0),
        )
    )
    top = candidates[:limit]
    top.sort(
        key=lambda item: (
            item["distance_meters"] if item["distance_meters"] is not None else float("inf"),
        )
    )

    return _serialize_candidates(top, distance_origin=distance_origin, db=db)


def _fallback_by_total_reviews(
    db: Session,
    *,
    limit: int,
    origin_lat: float,
    origin_lng: float,
    distance_origin: str,
    city: str,
) -> list[dict]:
    stmt = select(Restaurant).where(Restaurant.is_active.is_(True))
    if city:
        stmt = stmt.where(Restaurant.city.ilike(f"%{city}%"))
    rows = db.scalars(stmt.limit(50)).all()

    candidates: list[dict] = []
    for restaurant in rows:
        total_reviews = db.scalar(
            select(func.count(Review.id)).where(Review.restaurant_id == restaurant.id)
        ) or 0
        if total_reviews == 0:
            continue
        distance_m = None
        if restaurant.latitude is not None and restaurant.longitude is not None:
            distance_m = haversine_meters(
                origin_lat, origin_lng, restaurant.latitude, restaurant.longitude
            )
        candidates.append(
            {
                "restaurant": restaurant,
                "week_review_count": int(total_reviews),
                "week_avg_rating": None,
                "distance_meters": distance_m,
                "is_fallback": True,
            }
        )

    candidates.sort(key=lambda item: -item["week_review_count"])
    top = candidates[:limit]
    top.sort(
        key=lambda item: (
            item["distance_meters"] if item["distance_meters"] is not None else float("inf"),
        )
    )
    return _serialize_candidates(top, distance_origin=distance_origin, db=db)


def _fallback_by_google_profile_or_nearby(
    db: Session,
    *,
    limit: int,
    origin_lat: float,
    origin_lng: float,
    distance_origin: str,
    city: str,
) -> list[dict]:
    """Canli DB bosken: Google profil yorum sayisi veya sehirdeki aktif mekanlar."""
    stmt = (
        select(Restaurant, RestaurantPlatformProfile.review_count, RestaurantPlatformProfile.avg_rating)
        .outerjoin(
            RestaurantPlatformProfile,
            (RestaurantPlatformProfile.restaurant_id == Restaurant.id)
            & (RestaurantPlatformProfile.platform == PlatformName.google_maps),
        )
        .where(Restaurant.is_active.is_(True))
    )
    if city:
        stmt = stmt.where(Restaurant.city.ilike(f"%{city}%"))
    rows = db.execute(stmt.limit(80)).all()

    candidates: list[dict] = []
    for restaurant, google_review_count, google_avg in rows:
        score = int(google_review_count or 0)
        distance_m = None
        if restaurant.latitude is not None and restaurant.longitude is not None:
            distance_m = haversine_meters(
                origin_lat, origin_lng, restaurant.latitude, restaurant.longitude
            )
        candidates.append(
            {
                "restaurant": restaurant,
                "week_review_count": score,
                "week_avg_rating": round(float(google_avg), 1) if google_avg is not None else None,
                "distance_meters": distance_m,
                "is_fallback": True,
            }
        )

    candidates.sort(key=lambda item: (-item["week_review_count"],))
    top = candidates[:limit]
    if not top:
        stmt2 = select(Restaurant).where(Restaurant.is_active.is_(True))
        if city:
            stmt2 = stmt2.where(Restaurant.city.ilike(f"%{city}%"))
        for restaurant in db.scalars(stmt2.limit(30)).all():
            distance_m = None
            if restaurant.latitude is not None and restaurant.longitude is not None:
                distance_m = haversine_meters(
                    origin_lat, origin_lng, restaurant.latitude, restaurant.longitude
                )
            top.append(
                {
                    "restaurant": restaurant,
                    "week_review_count": 0,
                    "week_avg_rating": None,
                    "distance_meters": distance_m,
                    "is_fallback": True,
                }
            )
        top.sort(
            key=lambda item: (
                item["distance_meters"] if item["distance_meters"] is not None else float("inf"),
            )
        )
        top = top[:limit]
    else:
        top.sort(
            key=lambda item: (
                item["distance_meters"] if item["distance_meters"] is not None else float("inf"),
            )
        )

    return _serialize_candidates(top, distance_origin=distance_origin, db=db)


def _serialize_candidates(
    candidates: list[dict],
    *,
    distance_origin: str,
    db: Session,
) -> list[dict]:
    restaurant_ids = [item["restaurant"].id for item in candidates]
    partner_map = partner_listings_for_restaurant_ids(db, restaurant_ids)
    result: list[dict] = []
    for item in candidates:
        restaurant = item["restaurant"]
        avg_rating = db.scalar(
            select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant.id)
        )
        distance_m = item.get("distance_meters")
        rid = str(restaurant.id)
        row = {
            "id": rid,
            "name": restaurant.name,
            "city": restaurant.city,
            "district": restaurant.district,
            "category": restaurant.category,
            "latitude": restaurant.latitude,
            "longitude": restaurant.longitude,
            "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
            "geo_indications": _parse_geo_indications(restaurant.geo_indications),
            "has_geographical_indication": restaurant.has_geographical_indication,
            "gi_product_name": restaurant.gi_product_name,
            "week_review_count": item["week_review_count"],
            "week_avg_rating": item.get("week_avg_rating"),
            "distance_meters": round(distance_m) if distance_m is not None else None,
            "distance_km": _distance_km(distance_m),
            "distance_origin": distance_origin,
            "is_fallback": bool(item.get("is_fallback")),
        }
        merge_partner_into_row(row, partner_map.get(rid))
        result.append(row)
    return result
