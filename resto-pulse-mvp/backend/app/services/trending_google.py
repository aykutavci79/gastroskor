from __future__ import annotations

import asyncio
import math
import re

from app.integrations.google_places_live import GooglePlacesLiveClient, LivePlaceResult, build_place_photo_url
from app.integrations.maps_links import build_google_maps_directions_url, build_destination_label
from app.services.gastro_score_ranking import haversine_meters, resolve_origin

# Google Details en fazla 5 yorum dondurur; "son hafta" icin orneklem sinyali.
RECENT_REVIEW_HINT = re.compile(
    r"(hafta|week|gün|gun|day|dün|dun|yesterday|bugün|bugun|today|saat|hour|minute|dakika)",
    re.IGNORECASE,
)

google_client = GooglePlacesLiveClient()


def _recent_review_signal(reviews: list[dict]) -> int:
    score = 0
    for row in reviews:
        rel = row.get("relative_time_description") or ""
        if RECENT_REVIEW_HINT.search(rel):
            score += 1
    return score


def _popularity_score(place: LivePlaceResult, recent_signal: int) -> float:
    ratings_total = place.user_ratings_total or 0
    rating = place.rating if place.rating is not None else 3.5
    # Son gunlerde ornek yorum + Google populerlik
    return recent_signal * 25.0 + math.log10(ratings_total + 1) * rating


async def _enrich_place(place: LivePlaceResult) -> tuple[LivePlaceResult, int, float, str | None]:
    recent_signal = 0
    google_photo_url = (
        build_place_photo_url(place.photo_reference) if place.photo_reference else None
    )
    try:
        details = await google_client.get_place_details(place.place_id)
        recent_signal = _recent_review_signal(details.get("reviews", []))
        if not google_photo_url:
            urls = details.get("photo_urls") or []
            google_photo_url = urls[0] if urls else None
    except Exception:
        recent_signal = 0
    return place, recent_signal, _popularity_score(place, recent_signal), google_photo_url


async def get_trending_google_places(
    *,
    limit: int = 6,
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    city: str = "Bursa",
) -> list[dict]:
    origin_lat_r, origin_lng_r, distance_origin = resolve_origin(city, origin_lat, origin_lng)

    candidates = await google_client.search_places(
        "restoran",
        city=city,
        limit=min(20, max(limit * 3, 15)),
        origin_lat=origin_lat_r,
        origin_lng=origin_lng_r,
    )
    if not candidates:
        return []

    enrich_tasks = [_enrich_place(place) for place in candidates[:15]]
    enriched = await asyncio.gather(*enrich_tasks)

    ranked: list[dict] = []
    for place, recent_signal, pop_score, google_photo_url in enriched:
        distance_m = None
        if place.latitude is not None and place.longitude is not None:
            distance_m = haversine_meters(
                origin_lat_r, origin_lng_r, place.latitude, place.longitude
            )
        label = build_destination_label(
            name=place.name, address=place.formatted_address, city=city
        ) or place.name
        ranked.append(
            {
                "id": place.place_id,
                "google_place_id": place.place_id,
                "name": place.name,
                "city": city,
                "district": None,
                "category": "Restoran",
                "latitude": place.latitude,
                "longitude": place.longitude,
                "avg_rating": place.rating,
                "geo_indications": [],
                "has_geographical_indication": False,
                "gi_product_name": None,
                "week_review_count": recent_signal,
                "week_avg_rating": place.rating,
                "google_user_ratings_total": place.user_ratings_total,
                "distance_meters": round(distance_m) if distance_m is not None else None,
                "distance_km": round(distance_m / 1000, 1) if distance_m is not None else None,
                "distance_origin": distance_origin,
                "is_fallback": False,
                "source": "google",
                "maps_directions_url": build_google_maps_directions_url(
                    place_id=place.place_id,
                    latitude=place.latitude,
                    longitude=place.longitude,
                    query=label,
                ),
                "google_photo_url": google_photo_url,
                "_pop_score": pop_score,
            }
        )

    ranked.sort(key=lambda row: -row["_pop_score"])
    top = ranked[:limit]
    top.sort(
        key=lambda row: (
            row["distance_meters"] if row["distance_meters"] is not None else float("inf"),
        )
    )
    for row in top:
        row.pop("_pop_score", None)
    return top
