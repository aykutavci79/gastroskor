from __future__ import annotations

from uuid import uuid4
from unittest.mock import MagicMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.db.base import Base
from app.models.entities import (
    PlatformName,
    Restaurant,
    RestaurantMenuItem,
    RestaurantOwnership,
    RestaurantPlatformProfile,
    RestaurantSubscription,
    Review,
    ReviewCategoryScore,
    ReviewKind,
    User,
)
from app.services.online_orders_discovery import (
    ONLINE_ORDER_SORT_DISCOUNT,
    _visit_avg_rating,
    list_online_order_restaurants,
)


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _seed_online_restaurant(
    db: Session,
    *,
    name: str,
    discount_text: str,
    google_rating: float = 4.4,
    latitude: float = 40.195,
    longitude: float = 29.06,
) -> Restaurant:
    owner = User(email=f"{uuid4()}@owner.test", full_name="Owner")
    restaurant = Restaurant(
        name=name,
        city="Bursa",
        district="Osmangazi",
        category="Kebap",
        latitude=latitude,
        longitude=longitude,
        is_active=True,
    )
    db.add_all([owner, restaurant])
    db.flush()

    ownership = RestaurantOwnership(
        user_id=owner.id,
        restaurant_id=restaurant.id,
        google_place_id=f"place-{restaurant.id}",
        verification_status="verified",
        promo_has_own_courier=True,
        online_orders_enabled=True,
        online_order_category_tags=["kebap"],
        promo_direct_order_text=discount_text,
    )
    db.add(ownership)
    db.flush()
    db.add_all(
        [
            RestaurantSubscription(ownership_id=ownership.id, status="active"),
            RestaurantMenuItem(
                ownership_id=ownership.id,
                name="Lahmacun",
                price_tl=120,
                voice_product_slug="lahmacun",
                is_active=True,
            ),
            RestaurantPlatformProfile(
                restaurant_id=restaurant.id,
                platform=PlatformName.google_maps,
                external_id=f"google-{restaurant.id}",
                avg_rating=google_rating,
                review_count=250,
            ),
        ]
    )
    db.flush()
    return restaurant


def test_visit_avg_rating_falls_back_without_visit_filter():
    db = MagicMock()
    nested = MagicMock()
    nested.__enter__ = MagicMock(return_value=None)
    nested.__exit__ = MagicMock(return_value=False)
    db.begin_nested.return_value = nested

    call_count = {"n": 0}

    def scalar_side_effect(_stmt):
        call_count["n"] += 1
        if call_count["n"] == 1:
            raise RuntimeError("review_kind missing")
        return 4.2

    db.scalar.side_effect = scalar_side_effect

    assert _visit_avg_rating(db, "00000000-0000-0000-0000-000000000001") == 4.2
    assert db.begin_nested.call_count == 2


def test_list_online_order_restaurants_sorts_by_discount_and_exposes_fee(db: Session) -> None:
    _seed_online_restaurant(
        db,
        name="Dusuk Indirim",
        discount_text="12% indirim",
        latitude=40.196,
        longitude=29.061,
    )
    high_discount = _seed_online_restaurant(
        db,
        name="Yuksek Indirim",
        discount_text="%25 indirim",
        latitude=40.1955,
        longitude=29.0605,
    )
    db.commit()

    rows = list_online_order_restaurants(
        db,
        city="Bursa",
        origin_lat=40.195,
        origin_lng=29.06,
        sort=ONLINE_ORDER_SORT_DISCOUNT,
    )

    assert [row["name"] for row in rows[:2]] == ["Yuksek Indirim", "Dusuk Indirim"]
    first = rows[0]
    assert first["id"] == str(high_discount.id)
    assert first["online_menu_discount_percent"] == 25
    assert first["promo"]["online_menu_discount_percent"] == 25
    assert first["delivery_fee_tl"] == 35
    assert first["distance_meters"] is not None


def test_list_online_order_restaurants_attaches_online_order_rating_summary(db: Session) -> None:
    restaurant = _seed_online_restaurant(db, name="Puanli Siparis", discount_text="%15 indirim")
    author = User(email=f"{uuid4()}@reviewer.test", full_name="Reviewer")
    db.add(author)
    db.flush()

    online_review = Review(
        restaurant_id=restaurant.id,
        author_id=author.id,
        review_kind=ReviewKind.online_order,
        rating=5,
        review_text="Sicak geldi",
        review_lang="tr",
    )
    visit_review = Review(
        restaurant_id=restaurant.id,
        author_id=author.id,
        review_kind=ReviewKind.visit,
        rating=1,
        review_text="Mekan yorumu siparis puanina karismamali",
        review_lang="tr",
    )
    db.add_all([online_review, visit_review])
    db.flush()
    db.add_all(
        [
            ReviewCategoryScore(review_id=online_review.id, category="lezzet", score=5),
            ReviewCategoryScore(review_id=online_review.id, category="servis", score=4),
            ReviewCategoryScore(review_id=online_review.id, category="kurye", score=3),
        ]
    )
    db.commit()

    rows = list_online_order_restaurants(db, city="Bursa")

    assert len(rows) == 1
    assert rows[0]["order_ratings"] == {
        "lezzet_avg": 5.0,
        "servis_avg": 4.0,
        "kurye_avg": 3.0,
        "review_count": 1,
    }
