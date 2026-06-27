"""Admin unlink ownership — subscription ile birlikte silinmeli."""

from __future__ import annotations

from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.entities import Restaurant, RestaurantOwnership, RestaurantSubscription, User
from app.services.panel_admin import release_user_panel_ownership


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


def test_release_user_panel_ownership_deletes_subscription(db: Session) -> None:
    user = User(id=uuid4(), email="admin@example.com", full_name="Admin", role="admin")
    restaurant = Restaurant(id=uuid4(), name="Ozşark Yaprak Döner", city="Bursa")
    ownership = RestaurantOwnership(
        id=uuid4(),
        user_id=user.id,
        restaurant_id=restaurant.id,
        google_place_id="ChIJ-test-ozsark",
        verification_status="verified_sms",
    )
    subscription = RestaurantSubscription(
        id=uuid4(),
        ownership_id=ownership.id,
        status="trial",
    )
    db.add_all([user, restaurant, ownership, subscription])
    db.commit()

    result = release_user_panel_ownership(db, user=user)

    assert result == {"removed": True, "restaurant_name": "Ozşark Yaprak Döner"}
    assert db.scalar(select(RestaurantOwnership).where(RestaurantOwnership.user_id == user.id)) is None
    assert db.scalar(select(RestaurantSubscription).where(RestaurantSubscription.ownership_id == ownership.id)) is None
    assert db.get(Restaurant, restaurant.id) is not None


def test_release_user_panel_ownership_no_record(db: Session) -> None:
    user = User(id=uuid4(), email="nobody@example.com", full_name="Nobody", role="user")
    db.add(user)
    db.commit()

    result = release_user_panel_ownership(db, user=user)

    assert result == {"removed": False, "restaurant_name": None}
