from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import Restaurant, RestaurantOwnership, RestaurantSubscription, User


client = TestClient(app)


@pytest.fixture()
def db() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def override_db(db: Session):
    app.dependency_overrides[get_db] = lambda: db
    yield
    app.dependency_overrides.clear()


def _seed_online_promo_owner(db: Session) -> RestaurantOwnership:
    user = User(id=uuid4(), email="owner@example.com")
    restaurant = Restaurant(id=uuid4(), name="Online Resto", city="Istanbul")
    ownership = RestaurantOwnership(
        id=uuid4(),
        user_id=user.id,
        restaurant_id=restaurant.id,
        google_place_id="place-online-resto",
        verification_status="verified_sms",
        panel_tier="full",
        promo_has_own_courier=True,
        online_orders_enabled=True,
        online_order_category_tags=["pizza"],
        promo_direct_order_text="Telefonla siparis icin arayin",
        promo_direct_order_phone="05550000000",
        promo_direct_order_whatsapp="05550000000",
        promo_direct_order_url="https://example.com/order",
        promo_card_cover_image_url="https://example.com/old.jpg",
    )
    subscription = RestaurantSubscription(
        id=uuid4(),
        ownership_id=ownership.id,
        status="active",
        activated_at=datetime.now(timezone.utc),
    )
    db.add_all([user, restaurant, ownership, subscription])
    db.commit()
    db.refresh(ownership)
    return ownership


def test_partial_promo_update_preserves_online_order_settings(db: Session) -> None:
    ownership = _seed_online_promo_owner(db)

    response = client.patch(
        "/api/v1/panel/promo",
        json={
            "user_email": "owner@example.com",
            "card_cover_image_url": "https://example.com/new.jpg",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["has_own_courier"] is True
    assert payload["online_orders_enabled"] is True
    assert payload["online_order_category_tags"] == ["pizza"]
    assert payload["direct_order_text"] == "Telefonla siparis icin arayin"
    assert payload["direct_order_phone"] == "05550000000"
    assert payload["direct_order_whatsapp"] == "05550000000"
    assert payload["direct_order_url"] == "https://example.com/order"

    db.refresh(ownership)
    assert ownership.promo_has_own_courier is True
    assert ownership.online_orders_enabled is True
    assert ownership.online_order_category_tags == ["pizza"]
    assert ownership.promo_direct_order_text == "Telefonla siparis icin arayin"
    assert ownership.promo_direct_order_phone == "05550000000"
    assert ownership.promo_direct_order_whatsapp == "05550000000"
    assert ownership.promo_direct_order_url == "https://example.com/order"
