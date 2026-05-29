from __future__ import annotations

from app.integrations.google_places_live import CITY_SEARCH_BIAS
from app.services.gastro_score_ranking import haversine_meters

DEFAULT_CITY = "Bursa"


def normalize_city_key(city: str) -> str:
    return city.strip().lower().replace("ı", "i").replace("İ", "i")


def resolve_city_name(city: str | None) -> str:
    if not city or not city.strip():
        return DEFAULT_CITY
    key = normalize_city_key(city)
    for known in CITY_SEARCH_BIAS:
        if key == known or key.startswith(known):
            return known.capitalize()
    return city.strip().title()


def resolve_city_from_coords(lat: float | None, lng: float | None) -> str:
    if lat is None or lng is None:
        return DEFAULT_CITY
    best_city = DEFAULT_CITY
    best_distance = float("inf")
    for city_key, (clat, clng, _) in CITY_SEARCH_BIAS.items():
        distance = haversine_meters(lat, lng, clat, clng)
        if distance < best_distance:
            best_distance = distance
            best_city = city_key.capitalize()
    return best_city
