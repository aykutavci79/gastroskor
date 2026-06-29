"""180 dk oturma penceresi — slot cakismasi."""

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
    DEFAULT_SEATING_DURATION_MINUTES,
    list_user_reservations,
    reservation_blocks_slot,
    reservations_overlap,
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


def _dt(hour: int, minute: int = 0) -> datetime:
    return datetime(2026, 6, 25, hour, minute, tzinfo=timezone.utc)


def _seed_reservation(
    db: Session,
    *,
    restaurant_id,
    table_id: str = "m1",
    reserved_at: datetime,
    status: RestaurantTableReservationStatus = RestaurantTableReservationStatus.pending_restaurant,
) -> None:
    user = User(id=uuid4(), email=f"{uuid4()}@example.com", full_name="Guest", role="user")
    db.add(user)
    db.add(
        RestaurantTableReservation(
            id=uuid4(),
            restaurant_id=restaurant_id,
            user_id=user.id,
            table_id=table_id,
            table_label="M1",
            zone="salon",
            party_size=2,
            reserved_at=reserved_at,
            customer_phone="+905551112233",
            customer_name="Ali Veli",
            status=status,
        )
    )
    db.commit()


def test_reservation_blocks_slot_within_180_minutes() -> None:
    start = _dt(17, 0)
    assert reservation_blocks_slot(start, _dt(17, 0)) is True
    assert reservation_blocks_slot(start, _dt(18, 15)) is True
    assert reservation_blocks_slot(start, _dt(19, 59)) is True
    assert reservation_blocks_slot(start, _dt(20, 0)) is False
    assert reservation_blocks_slot(start, _dt(20, 5)) is False


def test_reservations_overlap_half_open_window() -> None:
    existing = _dt(17, 0)
    assert reservations_overlap(existing, _dt(18, 0)) is True
    assert reservations_overlap(existing, _dt(19, 30)) is True
    assert reservations_overlap(existing, _dt(20, 0)) is False
    assert reservations_overlap(_dt(20, 5), existing) is False


def test_reservations_overlap_backward_when_existing_starts_later() -> None:
    """18:10 rezervasyonu varken 18:00 yeni slot cakismali (geriye donuk kapanma)."""
    existing = _dt(18, 10)
    assert reservations_overlap(existing, _dt(18, 0)) is True
    assert reservations_overlap(existing, _dt(15, 11)) is True
    assert reservations_overlap(existing, _dt(15, 10)) is False


def test_table_is_reserved_blocks_backward_overlap(db: Session) -> None:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    db.add(restaurant)
    db.commit()
    _seed_reservation(db, restaurant_id=restaurant.id, reserved_at=_dt(18, 10))

    assert table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(18, 0))
    assert table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(18, 15))
    assert not table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(15, 10))


def test_reserved_table_ids_shows_backward_blocked_tables(db: Session) -> None:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    db.add(restaurant)
    db.commit()
    _seed_reservation(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(18, 10))

    blocked = reserved_table_ids_for_slot(db, restaurant_id=restaurant.id, reserved_at=_dt(18, 0))
    assert blocked == {"m1"}


def test_table_is_reserved_uses_seating_window(db: Session) -> None:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    db.add(restaurant)
    db.commit()
    _seed_reservation(db, restaurant_id=restaurant.id, reserved_at=_dt(17, 0))

    assert table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(18, 15))
    assert not table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(20, 5))


def test_reserved_table_ids_for_slot_blocks_overlapping_tables(db: Session) -> None:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    db.add(restaurant)
    db.commit()
    _seed_reservation(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(17, 0))
    _seed_reservation(db, restaurant_id=restaurant.id, table_id="m2", reserved_at=_dt(23, 10))

    blocked = reserved_table_ids_for_slot(db, restaurant_id=restaurant.id, reserved_at=_dt(18, 15))
    assert blocked == {"m1"}

    blocked_later = reserved_table_ids_for_slot(db, restaurant_id=restaurant.id, reserved_at=_dt(20, 5))
    assert blocked_later == set()


def test_list_user_reservations_includes_restaurant_name(db: Session) -> None:
    user = User(id=uuid4(), email="guest@example.com", full_name="Guest", role="user")
    restaurant = Restaurant(id=uuid4(), name="Atlas Sofra", city="Bursa", is_active=True)
    db.add_all([user, restaurant])
    db.add(
        RestaurantTableReservation(
            id=uuid4(),
            restaurant_id=restaurant.id,
            user_id=user.id,
            table_id="m1",
            table_label="M1",
            zone="salon",
            party_size=2,
            reserved_at=_dt(19, 0),
            customer_phone="+905551112233",
            customer_name="Ali Veli",
            status=RestaurantTableReservationStatus.confirmed,
        )
    )
    db.commit()

    reservations = list_user_reservations(db, user_id=user.id)

    assert len(reservations) == 1
    assert reservations[0]["restaurant_name"] == "Atlas Sofra"
    assert reservations[0]["table_label"] == "M1"


def test_rejected_reservation_does_not_block(db: Session) -> None:
    restaurant = Restaurant(id=uuid4(), name="Deneme", city="Bursa", is_active=True)
    db.add(restaurant)
    db.commit()
    _seed_reservation(
        db,
        restaurant_id=restaurant.id,
        reserved_at=_dt(17, 0),
        status=RestaurantTableReservationStatus.rejected,
    )

    assert not table_is_reserved(db, restaurant_id=restaurant.id, table_id="m1", reserved_at=_dt(17, 0))


def test_default_seating_duration_is_180_minutes() -> None:
    assert DEFAULT_SEATING_DURATION_MINUTES == 180
