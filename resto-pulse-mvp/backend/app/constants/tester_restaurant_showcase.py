"""Tester rezervasyon vitrin — demo restoran galeri URL'leri."""

from __future__ import annotations

SHOWCASE_IMAGE_BASE = "https://www.gastroskor.com.tr/images/demo-restaurant"

ATLAS_SOFRA_PLACE_ID = "gastro-tester-deneme-2"

ATLAS_SOFRA_GALLERY_URLS: tuple[str, ...] = (
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-garden-day.webp",
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-terrace-day.webp",
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-indoor-day.webp",
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-garden-evening.webp",
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-terrace-evening.webp",
    f"{SHOWCASE_IMAGE_BASE}/atlas-sofra-indoor-evening.webp",
)

ATLAS_SOFRA_FLOOR_BACKGROUND_URL = None

_SHOWCASE_BY_PLACE_ID: dict[str, tuple[str, ...]] = {
    ATLAS_SOFRA_PLACE_ID: ATLAS_SOFRA_GALLERY_URLS,
}


def gallery_urls_for_place(place_id: str | None) -> list[str]:
    if not place_id:
        return []
    rows = _SHOWCASE_BY_PLACE_ID.get(place_id.strip())
    return list(rows) if rows else []


def floor_background_for_place(place_id: str | None) -> str | None:
    if place_id == ATLAS_SOFRA_PLACE_ID:
        return ATLAS_SOFRA_FLOOR_BACKGROUND_URL
    return None
