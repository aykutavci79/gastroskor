"""Masa rezervasyonu slot butunlugu testleri."""

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
from app.services.table_reservations import (
    ReservationError,
    decide_reservation,
    reserved_table_ids_for_slot,
    table_is_reserved,
)


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


def _seed_restaurant_and_user(db: Session) -> tuple[Restaurant, User]:
    restaurant = Restaurant(id=uuid4(), name="Rezervasyon Test", city="Bursa", is_active=True)
    user = User(id=uuid4(), email=f"user-{uuid4()}@example.com", full_name="Test User", role="user")
    db.add_all([restaurant, user])
    db.commit()
    return restaurant, user


def _reservation(
    restaurant: Restaurant,
    user: User,
    *,
    slot: datetime,
    status: RestaurantTableReservationStatus,
    expires_at: datetime | None = None,
) -> RestaurantTableReservation:
    return RestaurantTableReservation(
        id=uuid4(),
        restaurant_id=restaurant.id,
        user_id=user.id,
        table_id="masa-1",
        table_label="M1",
        zone="salon",
        party_size=2,
        reserved_at=slot,
        customer_phone="+905321234567",
        customer_name="Test User",
        status=status,
        customer_confirm_expires_at=expires_at,
    )


def test_expired_restaurant_approval_does_not_lock_slot(db: Session) -> None:
    restaurant, user = _seed_restaurant_and_user(db)
    slot = datetime.now(timezone.utc) + timedelta(days=3)
    expired_approval = _reservation(
        restaurant,
        user,
        slot=slot,
        status=RestaurantTableReservationStatus.approved_by_restaurant,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )
    db.add(expired_approval)
    db.commit()

    assert table_is_reserved(db, restaurant_id=restaurant.id, table_id="masa-1", reserved_at=slot) is False
    assert reserved_table_ids_for_slot(db, restaurant_id=restaurant.id, reserved_at=slot) == set()


def test_duplicate_pending_slot_allows_only_one_approval(db: Session) -> None:
    restaurant, first_user = _seed_restaurant_and_user(db)
    second_user = User(id=uuid4(), email="second@example.com", full_name="Second User", role="user")
    slot = datetime.now(timezone.utc) + timedelta(days=4)
    first = _reservation(
        restaurant,
        first_user,
        slot=slot,
        status=RestaurantTableReservationStatus.pending_restaurant,
    )
    second = _reservation(
        restaurant,
        second_user,
        slot=slot,
        status=RestaurantTableReservationStatus.pending_restaurant,
    )
    db.add_all([second_user, first, second])
    db.commit()

    approved = decide_reservation(
        db,
        reservation_id=first.id,
        restaurant_id=restaurant.id,
        decision="approved",
    )
    assert approved.status == RestaurantTableReservationStatus.approved_by_restaurant

    with pytest.raises(ReservationError, match="baska bir rezervasyon"):
        decide_reservation(
            db,
            reservation_id=second.id,
            restaurant_id=restaurant.id,
            decision="approved",
        )

    db.refresh(second)
    assert second.status == RestaurantTableReservationStatus.pending_restaurant
