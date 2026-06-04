"""Mevcut Google profillerine foto referansi yazar (tek seferlik).

Kullanim (backend dizininden):
  python scripts/backfill_google_photos.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from app.db.session import SessionLocal
from app.integrations.google_places_live import GooglePlacesLiveClient
from app.models import PlatformName, RestaurantPlatformProfile
from app.services.platform_profile_photo import sync_profile_photo_from_details

google_client = GooglePlacesLiveClient()


async def main() -> int:
    db = SessionLocal()
    try:
        profiles = db.scalars(
            select(RestaurantPlatformProfile).where(
                RestaurantPlatformProfile.platform == PlatformName.google_maps,
                RestaurantPlatformProfile.external_id.isnot(None),
                RestaurantPlatformProfile.photo_reference.is_(None),
            )
        ).all()
        updated = 0
        for profile in profiles:
            place_id = profile.external_id
            if not place_id:
                continue
            try:
                details = await google_client.get_place_details(place_id)
            except Exception as exc:
                print(f"[atla] {place_id}: {exc}")
                continue
            if sync_profile_photo_from_details(profile, details):
                db.add(profile)
                updated += 1
                print(f"[ok] {place_id}")
        db.commit()
        print(f"Guncellenen profil: {updated} / {len(profiles)}")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
