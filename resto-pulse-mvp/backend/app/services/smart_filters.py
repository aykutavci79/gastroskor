from __future__ import annotations

from dataclasses import dataclass

from app.schemas.live_places import LivePlaceSearchItem
from app.services.query_parser import ParsedSearchQuery

DISTANCE_BANDS: dict[str, tuple[float, float | None]] = {
    "0-250": (0, 250),
    "251-500": (251, 500),
    "501-1000": (501, 1000),
    "1100-2000": (1100, 2000),
    "2100+": (2100, None),
}

RATING_BANDS: dict[str, tuple[float, float]] = {
    "3.0-3.9": (3.0, 3.9),
    "4.0-4.4": (4.0, 4.4),
    "4.5-5.0": (4.5, 5.0),
}


@dataclass
class SmartFilterCriteria:
    distance_band: str | None = None
    rating_band: str | None = None
    min_rating: float | None = None
    max_distance_m: float | None = None
    min_distance_m: float | None = None


def merge_criteria(
    parsed: ParsedSearchQuery,
    *,
    distance_band: str | None = None,
    rating_band: str | None = None,
) -> SmartFilterCriteria:
    return SmartFilterCriteria(
        distance_band=distance_band,
        rating_band=rating_band,
        min_rating=parsed.min_rating,
        max_distance_m=parsed.max_distance_m,
        min_distance_m=parsed.min_distance_m,
    )


def _distance_in_band(meters: float | None, band: str) -> bool:
    if meters is None:
        return False
    low, high = DISTANCE_BANDS[band]
    if high is None:
        return meters >= low
    return low <= meters <= high


def _rating_in_band(rating: float | None, band: str) -> bool:
    if rating is None:
        return False
    low, high = RATING_BANDS[band]
    return low <= rating <= high


def apply_smart_filters(
    items: list[LivePlaceSearchItem],
    criteria: SmartFilterCriteria,
) -> list[LivePlaceSearchItem]:
    filtered = items

    if criteria.distance_band:
        filtered = [item for item in filtered if _distance_in_band(item.distance_meters, criteria.distance_band)]

    if criteria.rating_band:
        filtered = [item for item in filtered if _rating_in_band(item.rating, criteria.rating_band)]

    if criteria.min_rating is not None:
        filtered = [
            item
            for item in filtered
            if item.rating is not None and item.rating >= criteria.min_rating
        ]

    if criteria.max_distance_m is not None:
        filtered = [
            item
            for item in filtered
            if item.distance_meters is not None and item.distance_meters <= criteria.max_distance_m
        ]

    if criteria.min_distance_m is not None:
        filtered = [
            item
            for item in filtered
            if item.distance_meters is not None and item.distance_meters >= criteria.min_distance_m
        ]

    return filtered
