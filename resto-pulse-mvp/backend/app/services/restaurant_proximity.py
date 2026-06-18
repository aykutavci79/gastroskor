"""Restoran yakinlik kontrolu — check-in / FoodCast (~200 m)."""

from __future__ import annotations

import re
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.integrations.google_places_live import GooglePlacesLiveClient
from app.models.entities import GooglePlaceCatalog, PlatformName, Restaurant, RestaurantPlatformProfile
from app.services.gastro_score_ranking import haversine_meters
from app.services.profanity_tr import normalize_review_text
from app.services.restaurant_claim import apply_google_details_to_restaurant

CHECK_IN_MAX_DISTANCE_M = 200
google_client = GooglePlacesLiveClient()

_ADDRESS_TOKEN_RE = re.compile(r"[a-z0-9]{4,}", re.IGNORECASE)
_ADDRESS_STOPWORDS = frozenset(
    {
        "bursa",
        "nilufer",
        "osmangazi",
        "yildirim",
        "mudanya",
        "cumhuriyet",
        "mahalle",
        "mah",
        "cad",
        "cadde",
        "sok",
        "sokak",
        "bulvar",
        "blv",
        "no",
        "kat",
        "turkiye",
        "turkey",
        "restoran",
        "cafe",
        "kafe",
        "plus",
        "market",
        "bufe",
    }
)


def _address_landmark_key(address: str | None) -> str | None:
    if not address or not address.strip():
        return None
    folded = normalize_review_text(address).lower()
    if "podyum" in folded:
        return "podyum"
    tokens = [
        t
        for t in _ADDRESS_TOKEN_RE.findall(folded)
        if t not in _ADDRESS_STOPWORDS and not t.isdigit()
    ]
    if not tokens:
        return None
    tokens.sort(key=len, reverse=True)
    return tokens[0]


def _coord_pair(lat: float | None, lng: float | None) -> tuple[float, float] | None:
    if lat is None or lng is None:
        return None
    return float(lat), float(lng)


def _profile_for_restaurant(db: Session, restaurant_id: UUID) -> RestaurantPlatformProfile | None:
    return db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant_id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )


def collect_proximity_candidates(db: Session, restaurant: Restaurant) -> list[tuple[float, float]]:
    """Olası konum noktaları: DB, katalog, canlı Google."""
    candidates: list[tuple[float, float]] = []
    seen: set[tuple[float, float]] = set()

    def add(lat: float | None, lng: float | None) -> None:
        pair = _coord_pair(lat, lng)
        if pair and pair not in seen:
            seen.add(pair)
            candidates.append(pair)

    add(restaurant.latitude, restaurant.longitude)

    profile = _profile_for_restaurant(db, restaurant.id)
    if profile:
        catalog = db.scalar(
            select(GooglePlaceCatalog).where(GooglePlaceCatalog.google_place_id == profile.external_id)
        )
        if catalog:
            add(catalog.latitude, catalog.longitude)

    return candidates


async def sync_restaurant_coordinates_from_google(db: Session, restaurant: Restaurant) -> None:
    """Google Maps profili varsa koordinatlari guncelle (eksik veya eski olabilir)."""
    profile = _profile_for_restaurant(db, restaurant.id)
    if not profile or not profile.external_id:
        return
    details = await google_client.get_place_details(profile.external_id)
    apply_google_details_to_restaurant(restaurant, details, city=restaurant.city or "Bursa")
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)


def find_address_sibling_restaurants(db: Session, restaurant: Restaurant) -> list[Restaurant]:
    """Ayni bina / avm kompleksi (or. Podyum Park) — farkli Google pinleri icin."""
    key = _address_landmark_key(restaurant.address)
    if not key or not restaurant.city:
        return []
    pattern = f"%{key}%"
    rows = db.scalars(
        select(Restaurant).where(
            Restaurant.is_active.is_(True),
            func.lower(Restaurant.city) == restaurant.city.strip().lower(),
            func.lower(Restaurant.address).like(pattern),
        )
    ).all()
    return list(rows)


def min_distance_to_candidates(
    user_lat: float,
    user_lng: float,
    candidates: list[tuple[float, float]],
) -> float | None:
    if not candidates:
        return None
    return min(haversine_meters(user_lat, user_lng, lat, lng) for lat, lng in candidates)


def is_user_near_restaurant(
    db: Session,
    *,
    restaurant: Restaurant,
    latitude: float,
    longitude: float,
    max_distance_m: float = CHECK_IN_MAX_DISTANCE_M,
) -> tuple[bool, int]:
    """
    Kullanici restorana yakin mi?
    Donus: (izin_verildi, en_yakin_mesafe_metre)
    """
    all_candidates: list[tuple[float, float]] = []
    seen: set[tuple[float, float]] = set()

    def merge(candidates: list[tuple[float, float]]) -> None:
        for pair in candidates:
            if pair not in seen:
                seen.add(pair)
                all_candidates.append(pair)

    merge(collect_proximity_candidates(db, restaurant))

    for sibling in find_address_sibling_restaurants(db, restaurant):
        merge(collect_proximity_candidates(db, sibling))

    min_m = min_distance_to_candidates(latitude, longitude, all_candidates)
    if min_m is None:
        return False, 999_999
    return min_m <= max_distance_m, int(min_m)
