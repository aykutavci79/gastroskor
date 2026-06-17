"""Sorgu-mekan alaka filtresi — yemek niyetine uymayan adaylari listeden cikar."""

from __future__ import annotations

import logging
from dataclasses import dataclass

from app.constants.voice_product_catalog import (
    EXCLUDE_MARKERS_BY_INTENT,
    RELEVANCE_FILTER_DISABLED_GROUPS,
    _normalize_query,
    get_voice_product,
    infer_voice_product_slug_from_menu_name,
    resolve_voice_search_token,
)
from app.schemas.live_places import LivePlaceSearchItem
from app.schemas.restaurant import RestaurantMenuItemPublic
from app.services.query_parser import parse_search_query

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PlaceRelevanceIntent:
    search_group: str
    allowed_slugs: frozenset[str]
    exclude_markers: frozenset[str]
    allowed_name_keys: frozenset[str]


@dataclass(frozen=True)
class PlaceRelevanceFilterResult:
    items: list[LivePlaceSearchItem]
    enabled: bool
    dropped_count: int
    fallback: bool


def _name_keys_for_slugs(slugs: frozenset[str]) -> frozenset[str]:
    keys: set[str] = set()
    for slug in slugs:
        product = get_voice_product(slug)
        if product is None:
            continue
        for candidate in (product.slug, product.search_group, *product.aliases):
            folded = _normalize_query(candidate)
            if len(folded) >= 3:
                keys.add(folded)
    return frozenset(keys)


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

    allowed = frozenset(slugs)
    exclude_raw = EXCLUDE_MARKERS_BY_INTENT.get(token, ())
    exclude_markers = frozenset(_normalize_query(marker) for marker in exclude_raw if marker.strip())
    return PlaceRelevanceIntent(
        search_group=token,
        allowed_slugs=allowed,
        exclude_markers=exclude_markers,
        allowed_name_keys=_name_keys_for_slugs(allowed),
    )


def _menu_preview_matches(intent: PlaceRelevanceIntent, menu_preview: list[RestaurantMenuItemPublic]) -> bool:
    for row in menu_preview:
        slug = infer_voice_product_slug_from_menu_name(row.name)
        if slug and slug in intent.allowed_slugs:
            return True
    return False


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
    menu_preview: list[RestaurantMenuItemPublic],
    intent: PlaceRelevanceIntent,
) -> bool:
    folded_name = _normalize_query(name)
    if len(folded_name) < 2:
        return False

    for marker in intent.exclude_markers:
        if marker and _compact_contains(folded_name, marker):
            return False

    for key in intent.allowed_name_keys:
        if _compact_contains(folded_name, key):
            return True

    return _menu_preview_matches(intent, menu_preview)


def apply_place_relevance_filter(
    items: list[LivePlaceSearchItem],
    *,
    query: str,
) -> PlaceRelevanceFilterResult:
    intent = resolve_place_relevance_intent(query)
    if intent is None:
        return PlaceRelevanceFilterResult(items=items, enabled=False, dropped_count=0, fallback=False)

    kept: list[LivePlaceSearchItem] = []
    for item in items:
        if venue_matches_relevance_intent(
            name=item.name,
            menu_preview=item.menu_preview,
            intent=intent,
        ):
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
        )

    return PlaceRelevanceFilterResult(
        items=kept,
        enabled=True,
        dropped_count=dropped_count,
        fallback=False,
    )
