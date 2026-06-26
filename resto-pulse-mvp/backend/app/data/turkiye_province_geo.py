"""Türkiye 81 il — il merkezi koordinatları (GPS il çözümleme + arama bias)."""

from __future__ import annotations

import json
import math
import unicodedata
from functools import lru_cache
from pathlib import Path

_PROVINCES_PATH = Path(__file__).with_name("turkiye_provinces.json")

# İl merkezi yaklaşık koordinatlar (lat, lng, arama yarıçapı m)
# Kaynak: il merkezi / valilik bölgesi; büyük metropoller geniş radius.
_PROVINCE_GEO: tuple[tuple[str, float, float, int], ...] = (
    ("Adana", 37.0000, 35.3213, 55_000),
    ("Adıyaman", 37.7648, 38.2786, 55_000),
    ("Afyonkarahisar", 38.7507, 30.5567, 55_000),
    ("Ağrı", 39.7191, 43.0503, 55_000),
    ("Amasya", 40.6499, 35.8353, 55_000),
    ("Ankara", 39.9334, 32.8597, 60_000),
    ("Antalya", 36.8969, 30.7133, 60_000),
    ("Artvin", 41.1828, 41.8183, 55_000),
    ("Aydın", 37.8560, 27.8416, 55_000),
    ("Balıkesir", 39.6484, 27.8826, 55_000),
    ("Bilecik", 40.0567, 30.0665, 50_000),
    ("Bingöl", 38.8854, 40.4983, 55_000),
    ("Bitlis", 38.4006, 42.1095, 55_000),
    ("Bolu", 40.7392, 31.6089, 50_000),
    ("Burdur", 37.7203, 30.2908, 50_000),
    ("Bursa", 40.1885, 29.0610, 55_000),
    ("Çanakkale", 40.1553, 26.4142, 55_000),
    ("Çankırı", 40.6013, 33.6134, 50_000),
    ("Çorum", 40.5506, 34.9556, 55_000),
    ("Denizli", 37.7765, 29.0864, 55_000),
    ("Diyarbakır", 37.9144, 40.2306, 55_000),
    ("Edirne", 41.6771, 26.5557, 50_000),
    ("Elazığ", 38.6810, 39.2264, 55_000),
    ("Erzincan", 39.7500, 39.5000, 55_000),
    ("Erzurum", 39.9043, 41.2679, 55_000),
    ("Eskişehir", 39.7767, 30.5206, 55_000),
    ("Gaziantep", 37.0662, 37.3833, 55_000),
    ("Giresun", 40.9128, 38.3895, 55_000),
    ("Gümüşhane", 40.4386, 39.5086, 50_000),
    ("Hakkari", 37.5744, 43.7408, 55_000),
    ("Hatay", 36.4018, 36.3498, 55_000),
    ("Isparta", 37.7648, 30.5566, 50_000),
    ("Mersin", 36.8121, 34.6415, 55_000),
    ("İstanbul", 41.0082, 28.9784, 80_000),
    ("İzmir", 38.4237, 27.1428, 60_000),
    ("Kars", 40.6167, 43.1000, 55_000),
    ("Kastamonu", 41.3887, 33.7827, 55_000),
    ("Kayseri", 38.7205, 35.4826, 55_000),
    ("Kırklareli", 41.7333, 27.2167, 50_000),
    ("Kırşehir", 39.1425, 34.1709, 50_000),
    ("Kocaeli", 40.8533, 29.8815, 55_000),
    ("Konya", 37.8667, 32.4833, 60_000),
    ("Kütahya", 39.4242, 29.9833, 50_000),
    ("Malatya", 38.3552, 38.3095, 55_000),
    ("Manisa", 38.6191, 27.4289, 55_000),
    ("Kahramanmaraş", 37.5858, 36.9371, 55_000),
    ("Mardin", 37.3212, 40.7245, 55_000),
    ("Muğla", 37.2153, 28.3636, 55_000),
    ("Muş", 38.9462, 41.7539, 55_000),
    ("Nevşehir", 38.6939, 34.6857, 50_000),
    ("Niğde", 37.9667, 34.6939, 50_000),
    ("Ordu", 40.9839, 37.8764, 55_000),
    ("Rize", 41.0201, 40.5234, 55_000),
    ("Sakarya", 40.7569, 30.3781, 55_000),
    ("Samsun", 41.2867, 36.3300, 55_000),
    ("Siirt", 37.9333, 41.9500, 55_000),
    ("Sinop", 42.0231, 35.1531, 55_000),
    ("Sivas", 39.7477, 37.0179, 55_000),
    ("Tekirdağ", 40.9781, 27.5117, 55_000),
    ("Tokat", 40.3167, 36.5500, 55_000),
    ("Trabzon", 41.0027, 39.7168, 55_000),
    ("Tunceli", 39.1079, 39.5401, 55_000),
    ("Şanlıurfa", 37.1591, 38.7969, 55_000),
    ("Uşak", 38.6823, 29.4082, 50_000),
    ("Van", 38.4891, 43.4089, 55_000),
    ("Yozgat", 39.8181, 34.8147, 55_000),
    ("Zonguldak", 41.4564, 31.7987, 55_000),
    ("Aksaray", 38.3687, 34.0370, 50_000),
    ("Bayburt", 40.2552, 40.2249, 50_000),
    ("Karaman", 37.1759, 33.2287, 50_000),
    ("Kırıkkale", 39.8468, 33.5153, 50_000),
    ("Batman", 37.8812, 41.1351, 55_000),
    ("Şırnak", 37.5164, 42.4611, 55_000),
    ("Bartın", 41.6344, 32.3375, 50_000),
    ("Ardahan", 41.1105, 42.7022, 50_000),
    ("Iğdır", 39.9167, 44.0333, 50_000),
    ("Yalova", 40.6500, 29.2667, 50_000),
    ("Karabük", 41.2061, 32.6204, 50_000),
    ("Kilis", 36.7184, 37.1212, 50_000),
    ("Osmaniye", 37.0742, 36.2478, 50_000),
    ("Düzce", 40.8438, 31.1565, 50_000),
)

# Mobil / eski API ASCII alias → resmi il adı
_CITY_ALIASES: dict[str, str] = {
    "istanbul": "İstanbul",
    "izmir": "İzmir",
    "sanliurfa": "Şanlıurfa",
    "urfa": "Şanlıurfa",
    "afyon": "Afyonkarahisar",
    "mugla": "Muğla",
    "kirsehir": "Kırşehir",
    "kirklareli": "Kırklareli",
    "kirikkale": "Kırıkkale",
    "kahramanmaras": "Kahramanmaraş",
    "maras": "Kahramanmaraş",
    "gumushane": "Gümüşhane",
    "canakkale": "Çanakkale",
    "cankiri": "Çankırı",
    "corum": "Çorum",
    "duzce": "Düzce",
    "elazig": "Elazığ",
    "igdir": "Iğdır",
    "nigde": "Niğde",
    "usak": "Uşak",
    "sirnak": "Şırnak",
    "agri": "Ağrı",
    "diyarbakir": "Diyarbakır",
    "eskisehir": "Eskişehir",
    "tekirdag": "Tekirdağ",
}


def normalize_province_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", (value or "").strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return (
        text.casefold()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


@lru_cache(maxsize=1)
def province_geo_records() -> tuple[dict, ...]:
    return tuple(
        {"name": name, "lat": lat, "lng": lng, "radius_m": radius}
        for name, lat, lng, radius in _PROVINCE_GEO
    )


@lru_cache(maxsize=1)
def _geo_by_key() -> dict[str, dict]:
    lookup: dict[str, dict] = {}
    for row in province_geo_records():
        lookup[normalize_province_key(row["name"])] = row
    for alias, canonical in _CITY_ALIASES.items():
        target = lookup.get(normalize_province_key(canonical))
        if target:
            lookup[alias] = target
    return lookup


def resolve_province_name(raw: str | None) -> dict | None:
    if not raw or not str(raw).strip():
        return None
    key = normalize_province_key(str(raw))
    return _geo_by_key().get(key)


def city_search_bias_map() -> dict[str, tuple[float, float, int]]:
    """google_places_live.CITY_SEARCH_BIAS ile uyumlu."""
    out: dict[str, tuple[float, float, int]] = {}
    for row in province_geo_records():
        out[normalize_province_key(row["name"])] = (row["lat"], row["lng"], row["radius_m"])
    for alias, canonical in _CITY_ALIASES.items():
        canonical_row = resolve_province_name(canonical)
        if canonical_row:
            out[alias] = (canonical_row["lat"], canonical_row["lng"], canonical_row["radius_m"])
    return out


def resolve_province_from_coords(lat: float, lng: float) -> dict:
    """En yakın il merkezi."""
    best = province_geo_records()[0]
    best_dist = float("inf")
    for row in province_geo_records():
        dist = _haversine_m(lat, lng, row["lat"], row["lng"])
        if dist < best_dist:
            best_dist = dist
            best = row
    return best


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6_371_000
    to_rad = math.radians
    d_lat = to_rad(lat2 - lat1)
    d_lng = to_rad(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(d_lng / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def export_mobile_geo_json() -> str:
    """Mobil bundle için JSON."""
    payload = {"provinces": list(province_geo_records())}
    return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
