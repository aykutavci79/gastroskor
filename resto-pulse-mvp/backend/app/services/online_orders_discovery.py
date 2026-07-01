"""Siparise acik restoranlar — liste ve filtre."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.constants.online_order_categories import ONLINE_ORDER_CATEGORIES, normalize_category_slugs
from app.constants.order_payment_methods import build_order_payment_options
from app.constants.online_orders import MIN_LIST_RATING
from app.models import PlatformName, Restaurant, RestaurantOwnership, RestaurantPlatformProfile, Review
from app.services.delivery_fee import resolve_delivery_fee_tl
from app.services.order_review import batch_avg_ratings, batch_order_rating_summaries, visit_review_filter
from app.services.gastro_score_ranking import (
    distance_score_for_meters,
    haversine_meters,
    live_place_sort_key,
    popularity_score_for_reviews,
    rating_score_for_stars,
)
from app.services.online_order_hours import online_order_hours_status
from app.services.restaurant_menu import MENU_PREVIEW_LIMIT, public_menu_for_ownership
from app.services.restaurant_orders import online_orders_configured
from app.services.reservation_vitrin import reservation_vitrin_listed
from app.services.table_reservations import online_reservations_configured
from app.services.restaurant_promo import promo_from_ownership
from app.services.voice_menu_offerings import voice_menu_matches_for_ownership
from app.constants.voice_product_catalog import resolve_voice_search_token

ONLINE_ORDER_SORT_GASTRO = "gastro_score"
ONLINE_ORDER_SORT_DISTANCE = "distance"
ONLINE_ORDER_SORT_RATING = "rating"
ONLINE_ORDER_SORT_POPULARITY = "popularity"
ONLINE_ORDER_SORT_DISCOUNT = "discount"


def _visit_avg_rating(db: Session, restaurant_id) -> float | None:
    """Visit ortalamasi — review_kind yoksa savepoint ile ana oturumu bozma."""

    def _scalar(*, visit_only: bool) -> float | None:
        stmt = select(func.avg(Review.rating)).where(Review.restaurant_id == restaurant_id)
        if visit_only:
            stmt = stmt.where(visit_review_filter())
        avg_gs = db.scalar(stmt)
        return float(avg_gs) if avg_gs is not None else None

    try:
        with db.begin_nested():
            return _scalar(visit_only=True)
    except Exception:
        try:
            with db.begin_nested():
                return _scalar(visit_only=False)
        except Exception:
            return None


def _attach_gastro_scores(items: list[dict]) -> None:
    for row in items:
        distance_m = row.get("distance_meters")
        distance_score = distance_score_for_meters(distance_m) if distance_m is not None else 0.0
        rating = row.get("google_rating") if row.get("google_rating") is not None else row.get("avg_rating")
        rating_score = rating_score_for_stars(rating)
        popularity_score = popularity_score_for_reviews(row.get("google_review_count"), rating)
        row["distance_score"] = round(distance_score, 2)
        row["rating_score"] = round(rating_score, 2)
        row["popularity_score"] = round(popularity_score, 2)
        row["gastro_score"] = round(distance_score + rating_score, 2)


def _sort_online_order_items(items: list[dict], sort: str) -> None:
    if sort == ONLINE_ORDER_SORT_DISTANCE:
        items.sort(
            key=lambda row: (
                row.get("distance_meters") if row.get("distance_meters") is not None else 1e12,
                -(row.get("google_rating") or row.get("avg_rating") or 0),
            )
        )
        return
    if sort == ONLINE_ORDER_SORT_RATING:
        items.sort(
            key=lambda row: (
                -(row.get("google_rating") or row.get("avg_rating") or 0),
                -(row.get("google_review_count") or 0),
                row.get("distance_meters") if row.get("distance_meters") is not None else 1e12,
            )
        )
        return
    if sort == ONLINE_ORDER_SORT_POPULARITY:
        items.sort(
            key=lambda row: (
                -(row.get("google_review_count") or 0),
                -(row.get("google_rating") or row.get("avg_rating") or 0),
                row.get("distance_meters") if row.get("distance_meters") is not None else 1e12,
            )
        )
        return
    if sort == ONLINE_ORDER_SORT_DISCOUNT:
        items.sort(
            key=lambda row: (
                -(row.get("online_menu_discount_percent") or 0),
                row.get("distance_meters") if row.get("distance_meters") is not None else 1e12,
                -(row.get("google_rating") or row.get("avg_rating") or 0),
            )
        )
        return
    # GastroSkor: puan + mesafe; esitlikte yildiz, mesafe, populerlik.
    items.sort(
        key=lambda row: live_place_sort_key(
            rating=row.get("google_rating") if row.get("google_rating") is not None else row.get("avg_rating"),
            distance_meters=row.get("distance_meters"),
            user_ratings_total=row.get("google_review_count"),
        )
    )


def list_online_order_restaurants(
    db: Session,
    *,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    city: str | None = None,
    category: str | None = None,
    min_rating: float | None = None,
    sort: str = ONLINE_ORDER_SORT_GASTRO,
    limit: int = 50,
    voice_product: str | None = None,
    voice_products: str | None = None,
    price_max: float | None = None,
    max_distance_km: float | None = None,
) -> list[dict]:
    category_slug = (category or "").strip().lower() or None
    limit = max(1, min(limit, 100))
    rating_floor = max(MIN_LIST_RATING, float(min_rating)) if min_rating is not None else MIN_LIST_RATING
    has_origin = origin_lat is not None and origin_lng is not None
    city_filter = (city or "").strip()
    voice_groups: list[str] = []
    if voice_products:
        for part in voice_products.split(","):
            token, _ = resolve_voice_search_token(part.strip())
            if token and token not in voice_groups:
                voice_groups.append(token)
    elif voice_product:
        token, _ = resolve_voice_search_token(voice_product)
        if token:
            voice_groups = [token]

    voice_token = voice_groups[0] if voice_groups else None
    group_slug_map: dict[str, set[str]] = {}
    voice_slug_set: set[str] = set()
    for group in voice_groups:
        token, slugs = resolve_voice_search_token(group)
        if token:
            group_slug_map[token] = set(slugs)
            voice_slug_set |= set(slugs)

    multi_product_cart = len(voice_groups) > 1
    distance_cap_m = max(0, float(max_distance_km)) * 1000 if max_distance_km is not None else None
    price_cap = float(price_max) if price_max is not None and not multi_product_cart else None

    rows = db.scalars(
        select(RestaurantOwnership)
        .join(Restaurant, Restaurant.id == RestaurantOwnership.restaurant_id)
        .where(Restaurant.is_active.is_(True))
        .options(
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
            selectinload(RestaurantOwnership.restaurant),
        )
    ).all()

    def _include_in_open_list(ownership: RestaurantOwnership) -> bool:
        return online_orders_configured(ownership) or online_reservations_configured(ownership)

    restaurant_ids = [row.restaurant_id for row in rows if _include_in_open_list(row)]
    google_profiles: dict[str, RestaurantPlatformProfile] = {}
    if restaurant_ids:
        for profile in db.scalars(
            select(RestaurantPlatformProfile).where(
                RestaurantPlatformProfile.restaurant_id.in_(restaurant_ids),
                RestaurantPlatformProfile.platform == PlatformName.google_maps,
            )
        ).all():
            google_profiles[str(profile.restaurant_id)] = profile

    visit_avg_map = batch_avg_ratings(db, restaurant_ids, visit_only=True)

    voice_search = bool(voice_slug_set)
    items: list[dict] = []
    for ownership in rows:
        if not _include_in_open_list(ownership):
            continue
        hours_status = online_order_hours_status(ownership)
        restaurant = ownership.restaurant
        # Sesli urun aramasinda sehir metni degil mesafe onemli (tester / pilot Bursa'da olabilir).
        if (
            not voice_search
            and city_filter
            and restaurant.city
            and city_filter.lower() not in restaurant.city.lower()
        ):
            continue

        tags = normalize_category_slugs(ownership.online_order_category_tags or [])
        if category_slug and category_slug not in tags:
            continue

        rid = str(restaurant.id)
        google_profile = google_profiles.get(rid)
        google_rating = (
            float(google_profile.avg_rating)
            if google_profile and google_profile.avg_rating is not None
            else None
        )
        google_review_count = int(google_profile.review_count) if google_profile and google_profile.review_count else None

        avg_rating = visit_avg_map.get(rid)

        rating_for_filter = google_rating if google_rating is not None else avg_rating
        if rating_for_filter is None or rating_for_filter < rating_floor:
            continue

        distance_m: float | None = None
        if (
            has_origin
            and restaurant.latitude is not None
            and restaurant.longitude is not None
        ):
            distance_m = haversine_meters(
                origin_lat,
                origin_lng,
                restaurant.latitude,
                restaurant.longitude,
            )

        if distance_cap_m is not None:
            if distance_m is None or distance_m > distance_cap_m:
                continue

        voice_matches: list[dict] = []
        if voice_slug_set:
            voice_matches = voice_menu_matches_for_ownership(
                ownership,
                product_slugs=voice_slug_set,
                price_max=price_cap,
            )
            if not voice_matches:
                continue
            if multi_product_cart:
                for slugs in group_slug_map.values():
                    if not any(row["voice_product_slug"] in slugs for row in voice_matches):
                        voice_matches = []
                        break
                if not voice_matches:
                    continue

        menu_full = public_menu_for_ownership(ownership, preview=False)
        promo = promo_from_ownership(ownership)
        discount_percent = promo.get("online_menu_discount_percent") if promo else None
        items.append(
            {
                "id": rid,
                "name": restaurant.name,
                "city": restaurant.city,
                "district": restaurant.district,
                "category": restaurant.category,
                "avg_rating": avg_rating,
                "promo": promo,
                "is_premium_partner": True,
                "menu_preview": menu_full[:MENU_PREVIEW_LIMIT],
                "menu_item_count": len(menu_full),
                "online_orders_available": bool(hours_status.get("open_now")),
                "online_orders_open_now": bool(hours_status.get("open_now")),
                "online_order_hours_label": hours_status.get("label"),
                "online_order_hours_range_label": hours_status.get("hours_range_label"),
                "order_payment_options": build_order_payment_options(
                    ownership.accepted_payment_methods,
                    custom_label=ownership.custom_payment_label,
                ),
                "online_reservations_available": online_reservations_configured(ownership),
                "reservation_vitrin_listed": reservation_vitrin_listed(ownership),
                "online_order_categories": tags,
                "card_emoji": ownership.card_emoji,
                "google_rating": google_rating,
                "google_review_count": google_review_count,
                "latitude": restaurant.latitude,
                "longitude": restaurant.longitude,
                "distance_meters": distance_m,
                "delivery_fee_tl": resolve_delivery_fee_tl(distance_m),
                "online_menu_discount_percent": discount_percent,
                "voice_menu_matches": voice_matches,
                "voice_search_token": voice_token,
            }
        )

    _attach_gastro_scores(items)
    restaurant_ids = [UUID(row["id"]) for row in items if row.get("id")]
    summaries: dict[str, dict] = {}
    if restaurant_ids:
        try:
            with db.begin_nested():
                summaries = batch_order_rating_summaries(db, restaurant_ids)
        except Exception:
            summaries = {}
    for row in items:
        summary = summaries.get(row["id"])
        if summary:
            row["order_ratings"] = summary

    sort_key = sort if sort in {
        ONLINE_ORDER_SORT_GASTRO,
        ONLINE_ORDER_SORT_DISTANCE,
        ONLINE_ORDER_SORT_RATING,
        ONLINE_ORDER_SORT_POPULARITY,
        ONLINE_ORDER_SORT_DISCOUNT,
    } else ONLINE_ORDER_SORT_GASTRO
    _sort_online_order_items(items, sort_key)

    return items[:limit]


def categories_payload() -> list[dict[str, str]]:
    return [dict(row) for row in ONLINE_ORDER_CATEGORIES]
