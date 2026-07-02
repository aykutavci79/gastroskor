"""GET /restaurants/{id}/reservations/active — ownership telefonsuz senaryo."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.v1.reservation_routes import get_restaurant_reservation_active
from app.db.base import Base
from app.models.entities import Restaurant, RestaurantOwnership, RestaurantSubscription, User


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


def test_reservation_active_without_ownership_phone(db: Session) -> None:
    """Ownership'te telefon yokken restaurant.phone fallback AttributeError vermemeli."""
    user = User(id=uuid4(), email="owner@example.com", full_name="Owner", role="user")
    restaurant = Restaurant(id=uuid4(), name="Deneme Rezervasyon", city="Bursa", is_active=True)
    ownership = RestaurantOwnership(
        id=uuid4(),
        user_id=user.id,
        restaurant_id=restaurant.id,
        google_place_id="ChIJReservationActivePhoneFallback",
        verification_status="verified_sms",
        online_reservations_enabled=True,
    )
    subscription = RestaurantSubscription(id=uuid4(), ownership_id=ownership.id, status="trial")
    db.add_all([user, restaurant, ownership, subscription])
    db.commit()

    response = get_restaurant_reservation_active(restaurant_id=restaurant.id, reserved_at=None, user_email=None, db=db)

    assert response.online_reservations_available is True
    assert response.contact_phone is None
    assert response.floor_plan is None
