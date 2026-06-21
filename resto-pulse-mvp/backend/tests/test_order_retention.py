"""Siparis retention cron — POST /api/v1/internal/cron/order-retention"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import Restaurant, RestaurantOrder, RestaurantOrderLine, RestaurantOrderStatus, User
from app.services.account_deletion import ANONYMIZED_ORDER_PHONE
from app.services.order_retention import run_order_retention

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


@pytest.fixture(autouse=True)
def cron_secret(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(settings, "cron_secret", "test-cron-secret")


def _cron_headers() -> dict[str, str]:
    return {"X-Cron-Secret": "test-cron-secret"}


def _seed_old_order(db: Session, *, user_id, restaurant_id, phone: str = "+905551112233") -> RestaurantOrder:
    order = RestaurantOrder(
        id=uuid4(),
        restaurant_id=restaurant_id,
        user_id=user_id,
        customer_phone=phone,
        customer_name="Ali",
        customer_address="Adres",
        note="Not",
        status=RestaurantOrderStatus.accepted,
        total_tl=Decimal("120.00"),
        created_at=datetime.now(timezone.utc) - timedelta(days=365 * 6),
    )
    db.add(order)
    db.flush()
    db.add(
        RestaurantOrderLine(
            id=uuid4(),
            order_id=order.id,
            name_snapshot="Kebap",
            price_snapshot=Decimal("120.00"),
            quantity=1,
        )
    )
    db.commit()
    return order


def test_retention_cron_disabled_by_default(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "order_retention_cron_enabled", False)
    response = client.post("/api/v1/internal/cron/order-retention", headers=_cron_headers())
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is False
    assert payload["skipped"] is True


def test_retention_dry_run_allowed_when_disabled(db: Session) -> None:
    user = User(id=uuid4(), email="retention@example.com")
    restaurant = Restaurant(id=uuid4(), name="Test Resto", city="Istanbul")
    db.add_all([user, restaurant])
    db.commit()
    _seed_old_order(db, user_id=user.id, restaurant_id=restaurant.id)

    stats = run_order_retention(db, dry_run=True)
    assert stats["anonymized"] == 1
    assert stats["deleted"] == 1
    assert db.scalar(select(RestaurantOrder.id)) is not None


def test_retention_anonymizes_and_deletes_old_orders(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "order_retention_cron_enabled", True)
    user = User(id=uuid4(), email="old@example.com")
    restaurant = Restaurant(id=uuid4(), name="Eski Resto", city="Ankara")
    db.add_all([user, restaurant])
    db.commit()
    order = _seed_old_order(db, user_id=user.id, restaurant_id=restaurant.id)

    stats = run_order_retention(db, dry_run=False)
    assert stats["deleted"] == 1
    assert db.get(RestaurantOrder, order.id) is None


def test_retention_skips_pending_orders(db: Session) -> None:
    user = User(id=uuid4(), email="pending@example.com")
    restaurant = Restaurant(id=uuid4(), name="Pending Resto", city="Izmir")
    db.add_all([user, restaurant])
    db.commit()

    pending = RestaurantOrder(
        id=uuid4(),
        restaurant_id=restaurant.id,
        user_id=user.id,
        customer_phone="+905551112233",
        status=RestaurantOrderStatus.pending,
        total_tl=Decimal("50.00"),
        created_at=datetime.now(timezone.utc) - timedelta(days=365 * 6),
    )
    db.add(pending)
    db.commit()

    stats = run_order_retention(db, dry_run=False)
    assert stats["deleted"] == 0
    assert db.get(RestaurantOrder, pending.id) is not None


def test_retention_deletes_already_anonymized_old_orders(db: Session) -> None:
    user = User(id=uuid4(), email="anon@example.com")
    restaurant = Restaurant(id=uuid4(), name="Anon Resto", city="Bursa")
    db.add_all([user, restaurant])
    db.commit()
    order = _seed_old_order(
        db,
        user_id=user.id,
        restaurant_id=restaurant.id,
        phone=ANONYMIZED_ORDER_PHONE,
    )
    order.customer_name = None
    order.customer_address = None
    order.note = None
    db.add(order)
    db.commit()

    stats = run_order_retention(db, dry_run=False)
    assert stats["anonymized"] == 0
    assert stats["deleted"] == 1
    assert db.get(RestaurantOrder, order.id) is None
