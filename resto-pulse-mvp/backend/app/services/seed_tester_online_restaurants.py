"""Tester online siparis — 5 deneme restorani olustur / guncelle."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.constants.tester_online_restaurants import (
    BURSA_LAT,
    BURSA_LNG,
    TESTER_OWNER_EMAIL,
    TESTER_RESTAURANTS,
    TesterRestaurantSeed,
)
from app.constants.voice_product_catalog import get_voice_product
from app.models import (
    PlatformName,
    Restaurant,
    RestaurantMenuItem,
    RestaurantOwnership,
    RestaurantPlatformProfile,
    RestaurantSubscription,
)
from app.services.user_accounts import get_or_create_user


def _place_id_for(seed: TesterRestaurantSeed) -> str:
    return f"gastro-tester-{seed.key}"


def _upsert_tester_restaurant(db: Session, owner_id, seed: TesterRestaurantSeed) -> dict:
    place_id = _place_id_for(seed)
    ownership = db.scalar(
        select(RestaurantOwnership)
        .where(RestaurantOwnership.google_place_id == place_id)
        .options(
            selectinload(RestaurantOwnership.restaurant),
            selectinload(RestaurantOwnership.subscription),
            selectinload(RestaurantOwnership.menu_items),
        )
    )

    restaurant: Restaurant
    created = False
    if ownership:
        restaurant = ownership.restaurant
    else:
        restaurant = Restaurant(
            name=seed.name,
            city="Bursa",
            district=seed.district,
            address=f"Tester lokasyonu — {seed.district}, Bursa",
            latitude=BURSA_LAT + seed.lat_offset,
            longitude=BURSA_LNG + seed.lng_offset,
            category=seed.category_label,
            is_active=True,
        )
        db.add(restaurant)
        db.flush()
        ownership = RestaurantOwnership(
            user_id=owner_id,
            restaurant_id=restaurant.id,
            google_place_id=place_id,
            verification_status="verified",
            verification_method="tester_seed",
            panel_tier="full",
            verified_at=datetime.now(timezone.utc),
            promo_has_own_courier=True,
            online_orders_enabled=True,
            online_order_category_tags=list(seed.online_order_categories),
            promo_direct_order_text="Tester — online siparis acik",
            promo_direct_order_phone="05550000001",
            card_emoji=seed.card_emoji,
        )
        db.add(ownership)
        db.flush()
        created = True

    restaurant.name = seed.name
    restaurant.city = "Bursa"
    restaurant.district = seed.district
    restaurant.address = f"Tester lokasyonu — {seed.district}, Bursa"
    restaurant.latitude = BURSA_LAT + seed.lat_offset
    restaurant.longitude = BURSA_LNG + seed.lng_offset
    restaurant.category = seed.category_label
    restaurant.is_active = True

    ownership.promo_has_own_courier = True
    ownership.online_orders_enabled = True
    ownership.online_order_category_tags = list(seed.online_order_categories)
    ownership.promo_direct_order_text = "Tester — online siparis acik"
    ownership.promo_direct_order_phone = "05550000001"
    ownership.card_emoji = seed.card_emoji
    ownership.verification_status = "verified"

    if ownership.subscription is None:
        now = datetime.now(timezone.utc)
        ownership.subscription = RestaurantSubscription(
            ownership_id=ownership.id,
            status="trial",
            trial_started_at=now,
            trial_ends_at=now + timedelta(days=365),
        )
        db.add(ownership.subscription)
    else:
        ownership.subscription.status = "trial"
        db.add(ownership.subscription)

    profile = db.scalar(
        select(RestaurantPlatformProfile).where(
            RestaurantPlatformProfile.restaurant_id == restaurant.id,
            RestaurantPlatformProfile.platform == PlatformName.google_maps,
        )
    )
    if not profile:
        profile = RestaurantPlatformProfile(
            restaurant_id=restaurant.id,
            platform=PlatformName.google_maps,
            external_id=place_id,
            avg_rating=seed.google_rating,
            review_count=seed.review_count,
        )
        db.add(profile)
    else:
        profile.avg_rating = seed.google_rating
        profile.review_count = seed.review_count
        profile.external_id = place_id

    existing_items = list(ownership.menu_items)
    for sort_order, row in enumerate(seed.menu):
        voice_slug = row.voice_slug
        label = row.name
        if voice_slug:
            product = get_voice_product(voice_slug)
            if product:
                label = product.label
        match = next(
            (
                item
                for item in existing_items
                if item.voice_product_slug == voice_slug
                or (voice_slug is None and item.name == label)
            ),
            None,
        )
        if match:
            match.name = label
            match.price_tl = row.price_tl
            match.category = row.category
            match.voice_product_slug = voice_slug
            match.sort_order = sort_order
            match.is_active = True
            db.add(match)
        else:
            db.add(
                RestaurantMenuItem(
                    ownership_id=ownership.id,
                    name=label,
                    price_tl=row.price_tl,
                    category=row.category,
                    voice_product_slug=voice_slug,
                    sort_order=sort_order,
                    is_active=True,
                )
            )
    seed_keys = {(row.voice_slug, row.name if not row.voice_slug else None) for row in seed.menu}
    for item in existing_items:
        key = (item.voice_product_slug, item.name if not item.voice_product_slug else None)
        if key not in seed_keys and item.is_active:
            item.is_active = False
            db.add(item)

    db.add(restaurant)
    db.add(ownership)
    return {
        "key": seed.key,
        "name": seed.name,
        "restaurant_id": str(restaurant.id),
        "created": created,
        "menu_items": len(seed.menu),
        "categories": list(seed.online_order_categories),
        "google_rating": seed.google_rating,
    }


def seed_tester_online_restaurants(db: Session) -> dict:
    owner = get_or_create_user(
        db,
        email=TESTER_OWNER_EMAIL,
        full_name="GastroSkor Tester Restoranlari",
        avatar_url=None,
        google_sub=None,
    )
    rows = [_upsert_tester_restaurant(db, owner.id, seed) for seed in TESTER_RESTAURANTS]
    db.commit()
    return {
        "owner_email": owner.email,
        "restaurants": rows,
        "count": len(rows),
        "note": "Online siparis ve Gastro Siparis testleri icin hazir. Bursa konumunda listelenir.",
    }
