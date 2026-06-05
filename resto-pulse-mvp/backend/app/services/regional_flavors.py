from __future__ import annotations

import re
import unicodedata

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.data.bursa_geo_products import (
    RegionalProductCatalogItem,
    catalog_for_city,
    find_product_by_slug,
    registry_note,
)
from app.integrations.maps_links import build_destination_label, build_google_maps_directions_url
from app.models import PlatformName, Restaurant, RestaurantPlatformProfile, Review
from app.schemas.geo_indication import GeoIndicationRead
from app.services.gastro_score_ranking import haversine_meters, popularity_score_for_reviews, resolve_origin
from app.services.platform_profile_photo import google_photo_url_for_profile
from app.services.restaurant_partner import merge_partner_into_row, partner_listings_for_restaurant_ids

# Sehir / bolge adlari tek basina eslestirme yapmaz (orn. "Bursa" != her Bursa urunu).
_GENERIC_MATCH_TOKENS = frozenset(
    {
        "bursa",
        "inegol",
        "kemalpasa",
        "mustafakemalpaşa",
        "mustafakemalpasa",
        "zeyniler",
        "turkiye",
        "turkey",
    }
)


def _normalize_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip().casefold())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = (
        text.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def _parse_geo_indications(raw: list | None) -> list[GeoIndicationRead]:
    if not raw:
        return []
    parsed: list[GeoIndicationRead] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        product = str(item.get("product") or "").strip()
        if len(product) < 2:
            continue
        parsed.append(
            GeoIndicationRead(
                product=product,
                region=item.get("region"),
                registry_note=item.get("registry_note"),
            )
        )
    return parsed


def _restaurant_product_labels(restaurant: Restaurant) -> list[str]:
    labels: list[str] = []
    for gi in _parse_geo_indications(restaurant.geo_indications):
        labels.append(gi.product)
    if restaurant.gi_product_name:
        labels.append(restaurant.gi_product_name.strip())
    return labels


def restaurant_serves_product(restaurant: Restaurant, product: RegionalProductCatalogItem) -> bool:
    if not restaurant.has_geographical_indication and not restaurant.geo_indications:
        return False
    labels = [label for label in _restaurant_product_labels(restaurant) if label]
    if not labels:
        return False
    keys = list(product.aliases) + [product.name]
    for label in labels:
        if _label_matches_product(label, keys):
            return True
    return False


def _distinct_tokens(text: str) -> set[str]:
    return {token for token in _normalize_key(text).split() if token and token not in _GENERIC_MATCH_TOKENS}


def _label_matches_product(label: str, product_keys: list[str]) -> bool:
    normalized_label = _normalize_key(label)
    if not normalized_label:
        return False
    normalized_keys = {_normalize_key(key) for key in product_keys if key.strip()}
    if normalized_label in normalized_keys:
        return True
    label_tokens = _distinct_tokens(normalized_label)
    for key in normalized_keys:
        if not key:
            continue
        if len(key) >= 6 and (key in normalized_label or normalized_label in key):
            return True
        key_tokens = _distinct_tokens(key)
        if not key_tokens:
            continue
        overlap = label_tokens & key_tokens
        if len(overlap) >= 2:
            return True
        if len(overlap) == 1:
            token = next(iter(overlap))
            if len(token) >= 5:
                return True
    return False


def _effective_rating(google_rating: float | None, avg_rating: float | None) -> float | None:
    if google_rating is not None:
        return google_rating
    return avg_rating


def _apply_rating_filter(rows: list[dict], *, min_rating: float) -> tuple[list[dict], float, bool]:
    applied_min = min_rating
    filtered = [
        row
        for row in rows
        if (_effective_rating(row.get("google_rating"), row.get("avg_rating")) or 0) >= applied_min
    ]
    rating_relaxed = False
    if not filtered and min_rating > 4.0:
        applied_min = 4.0
        filtered = [
            row
            for row in rows
            if (_effective_rating(row.get("google_rating"), row.get("avg_rating")) or 0) >= applied_min
        ]
        rating_relaxed = True
    if not filtered and rows:
        applied_min = 0.0
        filtered = list(rows)
        rating_relaxed = True
    return filtered, applied_min, rating_relaxed


def _build_rows_for_restaurants(
    db: Session,
    restaurants: list[Restaurant],
    *,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
) -> list[dict]:
    if not restaurants:
        return []
    restaurant_ids = [r.id for r in restaurants]
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
    partner_map = partner_listings_for_restaurant_ids(db, restaurant_ids)
    rows: list[dict] = []
    for restaurant in restaurants:
        rows.append(
            _build_restaurant_row(
                db,
                restaurant,
                origin_lat=origin_lat,
                origin_lng=origin_lng,
                google_profiles=google_profiles,
                google_place_ids=google_place_ids,
                partner_map=partner_map,
            )
        )
    return rows


def _listed_count_for_product(
    db: Session,
    product: RegionalProductCatalogItem,
    *,
    city: str,
) -> int:
    restaurants = [r for r in _load_city_restaurants(db, city) if restaurant_serves_product(r, product)]
    return len(restaurants)


def _build_restaurant_row(
    db: Session,
    restaurant: Restaurant,
    *,
    origin_lat: float | None,
    origin_lng: float | None,
    google_profiles: dict[str, RestaurantPlatformProfile],
    google_place_ids: dict[str, str],
    partner_map: dict,
) -> dict:
    avg_rating = db.scalar(select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant.id))
    rid = str(restaurant.id)
    google_profile = google_profiles.get(rid)
    place_id = google_place_ids.get(rid)
    destination_query = build_destination_label(
        name=restaurant.name,
        address=restaurant.address,
        city=restaurant.city,
    )
    maps_url = build_google_maps_directions_url(
        place_id=place_id,
        latitude=restaurant.latitude,
        longitude=restaurant.longitude,
        query=destination_query or restaurant.name,
    )
    distance_m: float | None = None
    if origin_lat is not None and origin_lng is not None and restaurant.latitude and restaurant.longitude:
        distance_m = haversine_meters(origin_lat, origin_lng, restaurant.latitude, restaurant.longitude)
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
        "distance_meters": round(distance_m) if distance_m is not None else None,
        "geo_indications": _parse_geo_indications(restaurant.geo_indications),
        "has_geographical_indication": restaurant.has_geographical_indication,
        "gi_product_name": restaurant.gi_product_name,
        "google_photo_url": google_photo_url_for_profile(google_profile),
    }
    merge_partner_into_row(row, partner_map.get(rid))
    return row


def _load_city_restaurants(db: Session, city: str) -> list[Restaurant]:
    return list(
        db.scalars(
            select(Restaurant)
            .where(
                Restaurant.is_active.is_(True),
                Restaurant.city.ilike(f"%{city.strip()}%"),
                or_(
                    Restaurant.has_geographical_indication.is_(True),
                    Restaurant.geo_indications.isnot(None),
                ),
            )
            .order_by(Restaurant.name.asc())
        ).all()
    )


def _product_payload(product: RegionalProductCatalogItem, *, restaurant_count: int = 0) -> dict:
    return {
        "slug": product.slug,
        "name": product.name,
        "city": product.city,
        "region": product.region,
        "summary": product.summary,
        "registry_source": product.registry_source,
        "turkpatent_id": product.turkpatent_id,
        "registration_year": product.registration_year,
        "indication_type": product.indication_type,
        "product_group": product.product_group,
        "detail_url": product.detail_url,
        "image_url": product.image_url,
        "restaurant_count": restaurant_count,
    }


def list_regional_products(db: Session, *, city: str = "Bursa") -> dict:
    catalog = catalog_for_city(city)
    items: list[dict] = []
    for product in catalog:
        count = _listed_count_for_product(db, product, city=city)
        items.append(_product_payload(product, restaurant_count=count))
    return {"city": city.strip() or "Bursa", "items": items, "registry_note": registry_note()}


def list_restaurants_for_regional_product(
    db: Session,
    *,
    slug: str,
    city: str = "Bursa",
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    min_rating: float = 4.5,
    limit: int = 30,
) -> dict | None:
    product = find_product_by_slug(slug, city)
    if not product:
        return None

    resolved_lat, resolved_lng, _ = resolve_origin(city, origin_lat, origin_lng)
    restaurants = [r for r in _load_city_restaurants(db, city) if restaurant_serves_product(r, product)]
    if not restaurants:
        return {
            "product": _product_payload(product, restaurant_count=0),
            "min_rating": min_rating,
            "applied_min_rating": min_rating,
            "rating_relaxed": False,
            "items": [],
        }

    rows = _build_rows_for_restaurants(
        db,
        restaurants,
        origin_lat=resolved_lat,
        origin_lng=resolved_lng,
    )
    rows.sort(
        key=lambda row: (
            -popularity_score_for_reviews(
                row.get("google_review_count"),
                _effective_rating(row.get("google_rating"), row.get("avg_rating")),
            ),
            -(_effective_rating(row.get("google_rating"), row.get("avg_rating")) or 0),
            row.get("distance_meters") if row.get("distance_meters") is not None else 10_000_000,
        )
    )

    return {
        "product": _product_payload(product, restaurant_count=len(rows)),
        "min_rating": min_rating,
        "applied_min_rating": 0.0,
        "rating_relaxed": False,
        "items": rows[:limit],
    }
