"""Musteri onay suresi dolunca otomatik expired."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.entities import (
    Restaurant,
    RestaurantTableReservation,
    RestaurantTableReservationStatus,
    User,
)
from app.services.table_reservations import expire_stale_customer_confirm_reservations


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


def _seed_approved_reservation(
    db: Session,
    *,
    expires_at: datetime,
) -> RestaurantTableReservation:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    user = User(id=uuid4(), email=f"{uuid4()}@example.com", full_name="Guest", role="user")
    row = RestaurantTableReservation(
        id=uuid4(),
        restaurant_id=restaurant.id,
        user_id=user.id,
        table_id="m1",
        table_label="M1",
        zone="salon",
        party_size=2,
        reserved_at=datetime(2026, 7, 2, 19, 0, tzinfo=timezone.utc),
        customer_phone="+905551112233",
        customer_name="Ali Veli",
        status=RestaurantTableReservationStatus.approved_by_restaurant,
        customer_confirm_expires_at=expires_at,
    )
    db.add(restaurant)
    db.add(user)
    db.add(row)
    db.commit()
    return row


def test_expire_stale_customer_confirm_reservations_marks_expired(db: Session) -> None:
    now = datetime(2026, 7, 2, 12, 0, tzinfo=timezone.utc)
    row = _seed_approved_reservation(db, expires_at=now - timedelta(minutes=1))

    count = expire_stale_customer_confirm_reservations(db, now=now)

    db.refresh(row)
    assert count == 1
    assert row.status == RestaurantTableReservationStatus.expired


def test_expire_stale_customer_confirm_skips_future_deadline(db: Session) -> None:
    now = datetime(2026, 7, 2, 12, 0, tzinfo=timezone.utc)
    row = _seed_approved_reservation(db, expires_at=now + timedelta(hours=2))

    count = expire_stale_customer_confirm_reservations(db, now=now)

    db.refresh(row)
    assert count == 0
    assert row.status == RestaurantTableReservationStatus.approved_by_restaurant
