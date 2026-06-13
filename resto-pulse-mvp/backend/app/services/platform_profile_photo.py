from __future__ import annotations

from datetime import datetime, timezone

from app.core.config import settings
from app.integrations.google_places_live import build_place_photo_url
from app.models.entities import RestaurantPlatformProfile


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def photo_reference_from_place_details(details: dict) -> str | None:
    ref = details.get("photo_reference")
    if ref:
        return str(ref)
    return None


def google_photo_url_from_reference(photo_reference: str | None) -> str | None:
    if not settings.google_card_photos_enabled or not photo_reference:
        return None
    return build_place_photo_url(photo_reference)


def google_photo_url_for_profile(profile: RestaurantPlatformProfile | None) -> str | None:
    if not settings.google_card_photos_enabled:
        return None
    if not profile or not profile.photo_reference:
        return None
    return build_place_photo_url(profile.photo_reference)


def sync_profile_photo_from_details(profile: RestaurantPlatformProfile, details: dict) -> bool:
    ref = photo_reference_from_place_details(details)
    if not ref:
        return False
    if profile.photo_reference == ref:
        return False
    profile.photo_reference = ref
    profile.last_synced_at = _utcnow()
    return True
