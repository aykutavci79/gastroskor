from __future__ import annotations

from app.integrations.google_places_live import GooglePlacesLiveClient
from app.integrations.maps_links import build_destination_label, build_google_maps_directions_url
from app.services.city_resolver import normalize_city_key, resolve_city_name
from app.services.city_top_cache import read_city_top_cache, write_city_top_cache

google_client = GooglePlacesLiveClient()


def _rating_sort_key(row: dict) -> tuple:
    rating = row.get("week_avg_rating") or row.get("avg_rating") or 0
    reviews = row.get("google_user_ratings_total") or 0
    return (-float(rating), -int(reviews))


async def fetch_city_top_google(city: str, *, limit: int = 5) -> list[dict]:
    city_label = resolve_city_name(city)
    city_key = normalize_city_key(city_label)

    cached = read_city_top_cache(city_key)
    if cached and cached.get("items"):
        return cached["items"][:limit]

    candidates = await google_client.search_places(
        "restoran",
        city=city_label,
        limit=max(15, limit * 3),
    )
    rows: list[dict] = []
    for place in candidates:
        label = build_destination_label(
            name=place.name,
            address=place.formatted_address,
            city=city_label,
        ) or place.name
        rows.append(
            {
                "id": place.place_id,
                "google_place_id": place.place_id,
                "name": place.name,
                "city": city_label,
                "district": None,
                "category": "Restoran",
                "latitude": place.latitude,
                "longitude": place.longitude,
                "avg_rating": place.rating,
                "geo_indications": [],
                "has_geographical_indication": False,
                "gi_product_name": None,
                "week_review_count": 0,
                "week_avg_rating": place.rating,
                "google_user_ratings_total": place.user_ratings_total,
                "google_rating": place.rating,
                "google_review_count": place.user_ratings_total,
                "distance_meters": None,
                "distance_km": None,
                "distance_origin": "city_center",
                "is_fallback": False,
                "source": "google",
                "maps_directions_url": build_google_maps_directions_url(
                    place_id=place.place_id,
                    latitude=place.latitude,
                    longitude=place.longitude,
                    query=label,
                ),
            }
        )

    rows.sort(key=_rating_sort_key)
    top = rows[:limit]
    write_city_top_cache(city_key, city_label, top)
    return top
