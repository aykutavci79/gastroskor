"""Sehir + yemek icin yerel bilinen mekanlar — isimde yemek gecmese de onerilir."""

from __future__ import annotations

from dataclasses import dataclass

from app.constants.voice_product_catalog import _normalize_query


@dataclass(frozen=True)
class LocalDishFavorite:
    """Mekan adinda aranacak normalize edilmis alt diziler (herhangi biri yeterli)."""

    label: str
    name_patterns: tuple[str, ...]


def _city_key(city: str) -> str:
    return _normalize_query(city).replace(" ", "")


def _compact(value: str) -> str:
    return _normalize_query(value).replace(" ", "")


# (city_key, search_group) -> yerel favoriler (sira oncelik boost icin)
CITY_DISH_FAVORITES: dict[tuple[str, str], tuple[LocalDishFavorite, ...]] = {
    ("bursa", "iskender"): (
        LocalDishFavorite(
            "Uludag Kebapcisi Cemal Cemil",
            ("uludag kebap", "cemal cemil", "cemal ve cemil"),
        ),
        LocalDishFavorite("Kebapci Tamer", ("kebapci tamer", "tamer")),
        LocalDishFavorite("Besyol Kebapcisi", ("besyol kebap", "besyol")),
        LocalDishFavorite("Tarihi Mavi Dukkan Iskender 1867", ("mavi dukkan", "iskender 1867")),
        LocalDishFavorite("Iskender Efendi Konagi", ("iskender efendi", "efendi konagi")),
        LocalDishFavorite("Iskender Tarihi Ahsap Dukkan", ("ahsap dukkan", "tarihi ahsap")),
    ),
}


def get_city_dish_favorites(city: str, search_group: str) -> tuple[LocalDishFavorite, ...]:
    key = (_city_key(city), search_group)
    return CITY_DISH_FAVORITES.get(key, ())


def venue_matches_local_favorite(*, name: str, city: str, search_group: str) -> bool:
    compact_name = _compact(name)
    if len(compact_name) < 2:
        return False
    for favorite in get_city_dish_favorites(city, search_group):
        for pattern in favorite.name_patterns:
            compact_pattern = _compact(pattern)
            if len(compact_pattern) >= 3 and compact_pattern in compact_name:
                return True
    return False


def local_favorite_sort_priority(*, name: str, city: str, search_group: str) -> int:
    """Dusuk deger = daha onde (0 en onde). Eslesme yoksa 999."""
    compact_name = _compact(name)
    for index, favorite in enumerate(get_city_dish_favorites(city, search_group)):
        for pattern in favorite.name_patterns:
            compact_pattern = _compact(pattern)
            if len(compact_pattern) >= 3 and compact_pattern in compact_name:
                return index
    return 999


def favorite_catalog_name_patterns(city: str, search_group: str) -> tuple[str, ...]:
    """Katalog enjeksiyonu icin SQL ILIKE desenleri."""
    patterns: list[str] = []
    for favorite in get_city_dish_favorites(city, search_group):
        patterns.extend(favorite.name_patterns)
    return tuple(patterns)
