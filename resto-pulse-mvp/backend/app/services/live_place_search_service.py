"""Canli mekan aramasi: onbellek → veritabani → (gerekirse) tek Google istegi."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.integrations.google_places_live import GooglePlacesLiveClient, LivePlaceResult, build_place_photo_url
from app.integrations.maps_links import build_destination_label, build_google_maps_directions_url
from app.models import PlatformName, Restaurant, RestaurantPlatformProfile, Review
from app.schemas.live_places import LivePlaceSearchItem, LivePlaceSearchResponse, ParsedSearchIntent
from app.services.city_resolver import normalize_city_key, resolve_city_name
from app.services.gastro_score_ranking import rank_live_places
from app.services.place_search_cache import build_cache_key, read_place_search_cache, write_place_search_cache
from app.services.profanity_tr import normalize_review_text
from app.services.query_parser import ParsedSearchQuery
from app.services.restaurant_check_in import visitor_counts_for_restaurants
from app.services.restaurant_partner import merge_partner_into_row, partner_listings_by_google_place_ids
from app.services.smart_filters import SmartFilterCriteria, apply_smart_filters, merge_criteria

# Yeterli DB sonucu varsa Google cagrilmaz.
MIN_DB_HITS_TO_SKIP_GOOGLE = 3

google_client = GooglePlacesLiveClient()


def _normalize_query_key(text: str) -> str:
    return normalize_review_text(text).strip()


def _origin_bucket_key(origin_lat: float | None, origin_lng: float | None) -> str:
    """Konuma duyarli cache: yaklasik 2km kutu hassasiyeti."""
    if origin_lat is None or origin_lng is None:
        return "anywhere"
    bucket_lat = round(origin_lat, 2)
    bucket_lng = round(origin_lng, 2)
    return f"{bucket_lat:.2f},{bucket_lng:.2f}"


def search_restaurants_in_db(
    db: Session,
    *,
    query: str,
    city: str,
    limit: int = 20,
) -> list[LivePlaceResult]:
    """Kayitli mekanlar (Google place_id profili olanlar)."""
    q = query.strip()
    if len(q) < 2:
        return []

    city_label = resolve_city_name(city)
    pattern = f"%{q}%"
    rows = db.scalars(
        select(Restaurant)
        .where(
            Restaurant.is_active.is_(True),
            Restaurant.name.ilike(pattern),
            Restaurant.city.ilike(f"%{city_label}%"),
        )
        .options(selectinload(Restaurant.platform_profiles))
        .order_by(Restaurant.name.asc())
        .limit(limit)
    ).all()

    results: list[LivePlaceResult] = []
    for restaurant in rows:
        google_profile = next(
            (p for p in (restaurant.platform_profiles or []) if p.platform == PlatformName.google_maps),
            None,
        )
        if not google_profile or not google_profile.external_id:
            continue
        results.append(
            LivePlaceResult(
                place_id=google_profile.external_id,
                name=restaurant.name,
                formatted_address=restaurant.address,
                rating=float(google_profile.avg_rating)
                if google_profile.avg_rating is not None
                else None,
                user_ratings_total=google_profile.review_count,
                latitude=restaurant.latitude,
                longitude=restaurant.longitude,
                photo_reference=None,
            )
        )
    return results


def _prefilter_place_rows(
    rows: list[LivePlaceResult],
    criteria: SmartFilterCriteria,
) -> list[LivePlaceResult]:
    """Siralama oncesi: dusuk puanli adaylari ele (ozellikle min_rating)."""
    if criteria.min_rating is None:
        return rows
    return [row for row in rows if row.rating is not None and row.rating >= criteria.min_rating]


def _finalize_search_response(
    items: list[LivePlaceSearchItem],
    *,
    criteria: SmartFilterCriteria,
    limit: int,
    parsed_model: ParsedSearchIntent,
    filters_applied: dict,
) -> LivePlaceSearchResponse:
    filtered = apply_smart_filters(items, criteria)[:limit]
    return LivePlaceSearchResponse(
        items=filtered,
        parsed=parsed_model,
        filters_applied=filters_applied,
    )


def _merge_place_rows(db_rows: list[LivePlaceResult], google_rows: list[LivePlaceResult]) -> list[LivePlaceResult]:
    merged: list[LivePlaceResult] = []
    seen: set[str] = set()
    for row in db_rows:
        if row.place_id in seen:
            continue
        seen.add(row.place_id)
        merged.append(row)
    for row in google_rows:
        if row.place_id in seen:
            continue
        seen.add(row.place_id)
        merged.append(row)
    return merged


def _ranked_to_items(
    ranked_rows,
    *,
    city: str,
) -> list[LivePlaceSearchItem]:
    city_label = resolve_city_name(city)
    items: list[LivePlaceSearchItem] = []
    for ranked in ranked_rows:
        items.append(
            LivePlaceSearchItem(
                place_id=ranked.place.place_id,
                name=ranked.place.name,
                address=ranked.place.formatted_address,
                rating=ranked.place.rating,
                user_ratings_total=ranked.place.user_ratings_total,
                latitude=ranked.place.latitude,
                longitude=ranked.place.longitude,
                distance_meters=round(ranked.distance_meters, 1) if ranked.distance_meters is not None else None,
                distance_origin=ranked.distance_origin,
                distance_score=ranked.distance_score,
                rating_score=ranked.rating_score,
                popularity_score=ranked.popularity_score,
                gastro_score=ranked.gastro_score,
                maps_directions_url=build_google_maps_directions_url(
                    place_id=ranked.place.place_id,
                    latitude=ranked.place.latitude,
                    longitude=ranked.place.longitude,
                    query=build_destination_label(
                        name=ranked.place.name,
                        address=ranked.place.formatted_address,
                        city=city_label,
                    )
                    or ranked.place.name,
                ),
                google_photo_url=(
                    build_place_photo_url(ranked.place.photo_reference)
                    if ranked.place.photo_reference
                    else None
                ),
            )
        )
    return items


def _enrich_with_partners(
    db: Session,
    items: list[LivePlaceSearchItem],
) -> list[LivePlaceSearchItem]:
    place_ids = [item.place_id for item in items]
    partner_by_place = partner_listings_by_google_place_ids(db, place_ids)
    member_ratings: dict[str, float | None] = {}
    restaurant_ids: list[str] = []
    for item in items:
        partner = partner_by_place.get(item.place_id)
        if partner and partner.get("restaurant_id"):
            restaurant_ids.append(str(partner["restaurant_id"]))
    uuid_ids: list[UUID] = []
    for rid in restaurant_ids:
        try:
            uuid_ids.append(UUID(rid))
        except ValueError:
            continue
    if uuid_ids:
        for rid in uuid_ids:
            avg = db.scalar(select(func.avg(Review.rating)).where(Review.restaurant_id == rid))
            if avg is not None:
                member_ratings[str(rid)] = round(float(avg), 1)
    check_in_counts = visitor_counts_for_restaurants(db, uuid_ids) if uuid_ids else {}

    enriched: list[LivePlaceSearchItem] = []
    for item in items:
        row = item.model_dump()
        partner = partner_by_place.get(item.place_id)
        merge_partner_into_row(row, partner)
        rid = row.get("restaurant_id")
        if rid and rid in member_ratings:
            row["member_avg_rating"] = member_ratings[rid]
        if rid:
            row["check_in_visitor_count"] = check_in_counts.get(rid, 0)
        enriched.append(LivePlaceSearchItem(**row))
    return enriched


async def search_live_places_optimized(
    db: Session,
    *,
    q: str,
    city: str,
    limit: int,
    origin_lat: float | None,
    origin_lng: float | None,
    criteria: SmartFilterCriteria,
    parsed: ParsedSearchQuery,
    distance_band: str | None,
    rating_band: str | None,
) -> LivePlaceSearchResponse:
    city_label = resolve_city_name(city)
    city_key = normalize_city_key(city_label)
    search_text = parsed.query if len(parsed.query) >= 2 else q
    query_key = _normalize_query_key(search_text)
    origin_key = _origin_bucket_key(origin_lat, origin_lng)
    cache_key = build_cache_key(city_key=city_key, query_key=query_key, origin_key=origin_key)

    parsed_model = ParsedSearchIntent(
        raw_query=q,
        query=parsed.query,
        min_rating=parsed.min_rating,
        max_distance_m=parsed.max_distance_m,
        min_distance_m=parsed.min_distance_m,
        removed_tokens=parsed.removed_tokens,
    )
    filters_applied = {
        "distance_band": distance_band,
        "rating_band": rating_band,
        "min_rating": parsed.min_rating,
        "max_distance_m": parsed.max_distance_m,
        "min_distance_m": parsed.min_distance_m,
    }

    cached = read_place_search_cache(cache_key)
    cached_rows = cached.get("items") if cached else None
    if cached_rows:
        cached_items = [LivePlaceSearchItem(**row) for row in cached_rows]
        return _finalize_search_response(
            cached_items,
            criteria=criteria,
            limit=limit,
            parsed_model=parsed_model,
            filters_applied={**filters_applied, "source": cached.get("filters_applied", {}).get("source", "cache")},
        )

    db_rows = search_restaurants_in_db(db, query=search_text, city=city_label, limit=max(limit, 15))
    google_called = False
    place_rows: list[LivePlaceResult]

    if len(db_rows) >= limit:
        place_rows = db_rows
    else:
        google_called = True
        fetch_limit = min(20, max(limit, 12))
        google_rows = await google_client.search_places(
            search_text,
            city=city_label,
            limit=fetch_limit,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
        )
        place_rows = _merge_place_rows(db_rows, google_rows)

    place_rows = _prefilter_place_rows(place_rows, criteria)
    rank_pool = min(20, max(limit, 15))
    ranked_rows = rank_live_places(
        place_rows,
        city=city_label,
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        limit=rank_pool,
    )
    items = _ranked_to_items(ranked_rows, city=city_label)
    enriched = _enrich_with_partners(db, items)

    filters_applied["source"] = "db_only" if not google_called else "db_and_google"

    if enriched and (google_called or len(db_rows) >= MIN_DB_HITS_TO_SKIP_GOOGLE):
        write_place_search_cache(
            cache_key,
            {
                "items": [row.model_dump() for row in enriched],
                "parsed": parsed_model.model_dump(),
                "filters_applied": {"source": filters_applied["source"]},
            },
        )

    return _finalize_search_response(
        enriched,
        criteria=criteria,
        limit=limit,
        parsed_model=parsed_model,
        filters_applied=filters_applied,
    )
