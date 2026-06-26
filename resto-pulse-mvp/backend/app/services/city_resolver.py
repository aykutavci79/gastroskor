from __future__ import annotations

from app.data.turkiye_province_geo import (
    city_search_bias_map,
    normalize_province_key,
    resolve_province_from_coords,
    resolve_province_name,
)

DEFAULT_CITY = "Bursa"


def normalize_city_key(city: str) -> str:
    return normalize_province_key(city)


def resolve_city_name(city: str | None) -> str:
    if not city or not city.strip():
        return DEFAULT_CITY
    row = resolve_province_name(city)
    if row:
        return str(row["name"])
    return city.strip()


def resolve_city_from_coords(lat: float | None, lng: float | None) -> str:
    if lat is None or lng is None:
        return DEFAULT_CITY
    return str(resolve_province_from_coords(lat, lng)["name"])
