"""Sorgu-mekan alaka filtresi — yanlis yemek isimlerini ele, yerel favorileri koru."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.constants.city_dish_favorites import local_favorite_sort_priority, venue_matches_local_favorite
from app.constants.voice_product_catalog import (
    EXCLUDE_MARKERS_BY_INTENT,
    RELEVANCE_FILTER_DISABLED_GROUPS,
    _normalize_query,
    resolve_voice_search_token,
)
from app.schemas.live_places import LivePlaceSearchItem
from app.services.query_parser import parse_search_query

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlaceRelevanceIntent:
    search_group: str
    exclude_markers: frozenset[str]


@dataclass(frozen=True)
class PlaceRelevanceFilterResult:
    items: list[LivePlaceSearchItem]
    enabled: bool
    dropped_count: int
    fallback: bool
    mode: str


def resolve_place_relevance_intent(query: str) -> PlaceRelevanceIntent | None:
    """Yemek niyeti net degilse None — fail-open."""
    parsed = parse_search_query(query)
    dish_query = parsed.query.strip()
    if len(dish_query) < 2:
        return None

    token, slugs = resolve_voice_search_token(dish_query)
    if not token or not slugs:
        return None
    if token in RELEVANCE_FILTER_DISABLED_GROUPS:
        return None

    exclude_raw = EXCLUDE_MARKERS_BY_INTENT.get(token, ())
    exclude_markers = frozenset(_normalize_query(marker) for marker in exclude_raw if marker.strip())
    return PlaceRelevanceIntent(search_group=token, exclude_markers=exclude_markers)


def _compact_fold(value: str) -> str:
    return _normalize_query(value).replace(" ", "")


def _compact_contains(haystack: str, needle: str) -> bool:
    compact_needle = _compact_fold(needle)
    if len(compact_needle) < 3:
        return False
    return compact_needle in _compact_fold(haystack)


def venue_matches_relevance_intent(
    *,
    name: str,
    intent: PlaceRelevanceIntent,
) -> bool:
    """Negatif-only: bilinen yanlis yemek adlari disinda herkesi tut."""
    folded_name = _normalize_query(name)
    if len(folded_name) < 2:
        return False

    for marker in intent.exclude_markers:
        if marker and _compact_contains(folded_name, marker):
            return False
    return True


def apply_place_relevance_filter(
    items: list[LivePlaceSearchItem],
    *,
    query: str,
) -> PlaceRelevanceFilterResult:
    intent = resolve_place_relevance_intent(query)
    if intent is None:
        return PlaceRelevanceFilterResult(
            items=items,
            enabled=False,
            dropped_count=0,
            fallback=False,
            mode="off",
        )

    kept: list[LivePlaceSearchItem] = []
    for item in items:
        if venue_matches_relevance_intent(name=item.name, intent=intent):
            kept.append(item)

    dropped_count = len(items) - len(kept)
    if not kept:
        logger.info(
            "relevance_filter_fallback query=%r group=%s dropped=%s",
            query,
            intent.search_group,
            dropped_count,
        )
        return PlaceRelevanceFilterResult(
            items=items,
            enabled=True,
            dropped_count=dropped_count,
            fallback=True,
            mode="negative_only",
        )

    return PlaceRelevanceFilterResult(
        items=kept,
        enabled=True,
        dropped_count=dropped_count,
        fallback=False,
        mode="negative_only",
    )


def local_favorite_rank_key(*, name: str, city: str | None, search_group: str | None) -> int:
    """Siralama: yerel favori onceligi (dusuk=onde). Eslesme yoksa 999."""
    if not city or not search_group:
        return 999
    return local_favorite_sort_priority(name=name, city=city, search_group=search_group)
