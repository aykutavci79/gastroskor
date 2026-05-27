#!/usr/bin/env python3
"""
GastroSkor — Bursa ornek veri seed script'i.

Kullanim:
  cd backend
  python seed.py
  python seed.py --reset   # Bursa seed kayitlarini silip yeniden yukler
  python seed.py --dry-run # Veritabanina yazmadan ozet gosterir
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

# backend/ kokunden calistirildiginda app paketini bul
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sqlalchemy import delete, select

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.place_resolve import find_google_place_id, resolve_maps_short_url
from app.models import (
    PlatformName,
    Restaurant,
    RestaurantPlatformProfile,
    Review,
)
from seed_data.bursa_restaurants import BURSA_RESTAURANTS, BursaRestaurantSeed


def resolve_place_id(entry: BursaRestaurantSeed) -> str | None:
    if entry.google_place_id:
        return entry.google_place_id

    if entry.maps_short_url:
        resolved = resolve_maps_short_url(entry.maps_short_url)
        if resolved:
            return resolved

    return find_google_place_id(entry.google_place_query)


def restaurant_exists(db, entry: BursaRestaurantSeed) -> Restaurant | None:
    stmt = select(Restaurant).where(
        Restaurant.name == entry.name,
        Restaurant.city.ilike("Bursa"),
    )
    return db.scalar(stmt)


def clear_bursa_seed(db) -> None:
    names = [item.name for item in BURSA_RESTAURANTS]
    restaurant_ids = db.scalars(
        select(Restaurant.id).where(Restaurant.city.ilike("Bursa"), Restaurant.name.in_(names))
    ).all()
    if not restaurant_ids:
        return
    db.execute(delete(Review).where(Review.restaurant_id.in_(restaurant_ids)))
    db.execute(
        delete(RestaurantPlatformProfile).where(RestaurantPlatformProfile.restaurant_id.in_(restaurant_ids))
    )
    db.execute(delete(Restaurant).where(Restaurant.id.in_(restaurant_ids)))
    db.commit()


def seed_bursa(db, *, dry_run: bool = False) -> None:
    created = 0
    skipped = 0
    missing_place_ids: list[str] = []

    for entry in BURSA_RESTAURANTS:
        if restaurant_exists(db, entry):
            print(f"[atla] Zaten var: {entry.name}")
            skipped += 1
            continue

        place_id = resolve_place_id(entry)
        if not place_id:
            missing_place_ids.append(entry.name)

        if dry_run:
            print(f"[dry-run] {entry.name} | place_id={place_id or 'YOK'}")
            created += 1
            continue

        restaurant = Restaurant(
            name=entry.name,
            city="Bursa",
            district=entry.district,
            address=entry.address,
            latitude=entry.latitude,
            longitude=entry.longitude,
            category=entry.category,
            geo_indications=[
                {
                    "product": gi.product,
                    "region": gi.region,
                    "registry_note": gi.registry_note,
                }
                for gi in entry.geo_indications
            ],
            has_geographical_indication=entry.has_geographical_indication,
            gi_product_name=entry.gi_product_name,
            is_active=True,
        )
        db.add(restaurant)
        db.flush()

        if place_id:
            profile = RestaurantPlatformProfile(
                restaurant_id=restaurant.id,
                platform=PlatformName.google_maps,
                external_id=place_id,
                profile_url=f"https://www.google.com/maps/place/?q=place_id:{place_id}",
                avg_rating=entry.google_avg_rating,
                review_count=entry.google_review_count,
            )
            db.add(profile)
        else:
            print(f"[uyari] Google Place ID yok: {entry.name} (Google yorum butonu calismaz)")

        for sample in entry.sample_reviews:
            db.add(
                Review(
                    restaurant_id=restaurant.id,
                    rating=sample.rating,
                    review_text=sample.review_text,
                    review_lang="tr",
                    is_demo=True,
                )
            )

        print(f"[eklendi] {entry.name} | place_id={place_id or '-'}")
        created += 1

    if not dry_run:
        db.commit()

    print()
    print(f"Ozet: {created} eklendi, {skipped} atlandi.")
    if missing_place_ids:
        print()
        print("Asagidaki mekanlar icin Place ID cozulemedi:")
        for name in missing_place_ids:
            print(f"  - {name}")
        print()
        print("Cozum: backend/.env dosyasina GOOGLE_PLACES_API_KEY ekleyip seed'i tekrar calistirin.")
        print("      (veya --reset ile sifirdan yukleyin)")


def main() -> None:
    parser = argparse.ArgumentParser(description="GastroSkor Bursa ornek veri seed")
    parser.add_argument("--reset", action="store_true", help="Once Bursa seed kayitlarini sil")
    parser.add_argument("--dry-run", action="store_true", help="DB'ye yazma, sadece ozet")
    args = parser.parse_args()

    print("GastroSkor seed")
    print(f"Veritabani: {settings.database_url}")
    if settings.google_places_api_key:
        print("Google Places API: aktif (eksik place_id'ler otomatik cozulur)")
    else:
        print("Google Places API: kapali (sadece onceden tanimli place_id'ler kullanilir)")

    db = SessionLocal()
    try:
        if args.reset and not args.dry_run:
            print("\nBursa seed kayitlari temizleniyor...")
            clear_bursa_seed(db)
            print("Temizlendi.\n")

        seed_bursa(db, dry_run=args.dry_run)
    finally:
        db.close()


if __name__ == "__main__":
    main()
