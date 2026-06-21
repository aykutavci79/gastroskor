"""KVKK hesap silme — DELETE /api/v1/users/me"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import (
    DmMessage,
    DmThread,
    GourmetChatMessage,
    GourmetChatRoom,
    JetonLedger,
    JetonLedgerSource,
    JetonLedgerStatus,
    Referral,
    ReferralStatus,
    Restaurant,
    RestaurantOrder,
    RestaurantOrderLine,
    RestaurantOrderStatus,
    RestaurantOwnership,
    Review,
    User,
    UserFriendship,
    Wallet,
)
from app.services.access_token import create_access_token, create_refresh_token
from app.services.account_deletion import (
    DELETION_CONFIRMATION_PHRASE,
    delete_user_account,
    is_deletion_confirmation_valid,
)

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
def override_db(db: Session, monkeypatch: pytest.MonkeyPatch):
    app.dependency_overrides[get_db] = lambda: db
    test_session_local = sessionmaker(bind=db.get_bind(), autoflush=False, autocommit=False)
    monkeypatch.setattr("app.services.active_user.SessionLocal", test_session_local)
    yield
    app.dependency_overrides.clear()


def _auth_headers(user: User) -> dict[str, str]:
    token, _ = create_access_token(user_id=user.id, email=user.email)
    return {"Authorization": f"Bearer {token}"}


def _make_end_user(db: Session, *, email: str = "user@example.com") -> User:
    user = User(
        id=uuid4(),
        email=email,
        full_name="Test User",
        google_sub=f"google-{email}",
        nickname="Tester01",
        order_phone_e164="+905551112233",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_is_deletion_confirmation_valid_accepts_turkish_phrase() -> None:
    assert is_deletion_confirmation_valid("EVET SİL") is True
    assert is_deletion_confirmation_valid("evet sil") is True
    assert is_deletion_confirmation_valid("EVET SIL") is True
    assert is_deletion_confirmation_valid("hayir") is False


def test_delete_my_account_success_returns_204(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db)
    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=_auth_headers(user),
        json={"confirmation": DELETION_CONFIRMATION_PHRASE},
    )
    assert response.status_code == 204
    db.refresh(user)
    assert user.deleted_at is not None
    assert user.google_sub is None
    assert user.email.startswith("deleted-")


def test_delete_my_account_rejects_wrong_confirmation(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db)
    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=_auth_headers(user),
        json={"confirmation": "SIL"},
    )
    assert response.status_code == 422
    db.refresh(user)
    assert user.deleted_at is None


def test_delete_my_account_user_rate_limit_blocks_after_three_attempts(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db, email="rate-limit-delete@example.com")
    headers = _auth_headers(user)
    payload = {"confirmation": "SIL"}

    for _ in range(3):
        response = client.request("DELETE", "/api/v1/users/me", headers=headers, json=payload)
        assert response.status_code == 422

    blocked = client.request("DELETE", "/api/v1/users/me", headers=headers, json=payload)
    assert blocked.status_code == 429
    assert "Hesap silme istegi limiti" in blocked.json()["detail"]
    db.refresh(user)
    assert user.deleted_at is None


def test_refresh_rejected_after_account_deletion(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db)
    refresh_token, _ = create_refresh_token(user_id=user.id, email=user.email)

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()
    db.refresh(user)

    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 401


def test_deleted_user_profile_fields_anonymized(db: Session) -> None:
    user = _make_end_user(db, email="anon@example.com")
    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()
    db.refresh(user)

    assert user.deleted_at is not None
    assert user.google_sub is None
    assert user.full_name is None
    assert user.nickname is None
    assert user.order_phone_e164 is None
    assert user.email.endswith("@anon.gastroskor.invalid")


def test_order_pii_anonymized_but_order_rows_remain(db: Session) -> None:
    user = _make_end_user(db)
    restaurant = Restaurant(id=uuid4(), name="Test Resto", city="Bursa", is_active=True)
    db.add(restaurant)
    db.flush()

    order = RestaurantOrder(
        id=uuid4(),
        restaurant_id=restaurant.id,
        user_id=user.id,
        customer_phone="+905551112233",
        customer_name="Ali Veli",
        customer_address="Gizli Mahalle 1",
        note="Kapıda bekleyin",
        status=RestaurantOrderStatus.accepted,
        total_tl=Decimal("120.50"),
        order_day=date(2026, 6, 20),
        daily_no=7,
    )
    db.add(order)
    db.flush()
    db.add(
        RestaurantOrderLine(
            id=uuid4(),
            order_id=order.id,
            name_snapshot="Doner",
            quantity=2,
            price_snapshot=Decimal("60.25"),
        )
    )
    db.commit()

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()

    persisted_order = db.get(RestaurantOrder, order.id)
    assert persisted_order is not None
    assert persisted_order.customer_name is None
    assert persisted_order.customer_address is None
    assert persisted_order.note is None
    assert persisted_order.customer_phone == "+00000000000"
    assert persisted_order.total_tl == Decimal("120.50")
    lines = db.scalars(select(RestaurantOrderLine).where(RestaurantOrderLine.order_id == order.id)).all()
    assert len(lines) == 1
    assert lines[0].name_snapshot == "Doner"


def test_reviews_anonymized_author_keeps_text(db: Session) -> None:
    user = _make_end_user(db)
    restaurant = Restaurant(id=uuid4(), name="Yorum Resto", city="Bursa", is_active=True)
    db.add(restaurant)
    db.flush()
    review = Review(
        id=uuid4(),
        restaurant_id=restaurant.id,
        author_id=user.id,
        rating=5,
        review_text="Harika bir deneyimdi",
    )
    db.add(review)
    db.commit()

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()

    db.refresh(review)
    assert review.author_id is None
    assert review.review_text == "Harika bir deneyimdi"


def test_dm_and_friendships_removed(db: Session) -> None:
    user = _make_end_user(db, email="alice@example.com")
    other = User(id=uuid4(), email="bob@example.com", full_name="Bob")
    db.add(other)
    db.flush()

    low_id, high_id = sorted([user.id, other.id], key=str)
    thread = DmThread(id=uuid4(), user_low_id=low_id, user_high_id=high_id)
    db.add(thread)
    db.flush()
    db.add(
        DmMessage(
            id=uuid4(),
            thread_id=thread.id,
            sender_id=user.id,
            body="Merhaba",
        )
    )
    db.add(UserFriendship(id=uuid4(), user_id=user.id, friend_user_id=other.id))
    db.commit()
    thread_id = thread.id

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()

    assert db.scalar(select(DmThread).where(DmThread.id == thread_id)) is None
    assert (
        db.scalar(
            select(UserFriendship).where(
                UserFriendship.user_id == user.id,
                UserFriendship.friend_user_id == other.id,
            )
        )
        is None
    )


def test_panel_owner_account_deletion_blocked(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db, email="owner@example.com")
    restaurant = Restaurant(id=uuid4(), name="Panel Resto", city="Bursa", is_active=True)
    db.add(restaurant)
    db.flush()
    db.add(
        RestaurantOwnership(
            id=uuid4(),
            user_id=user.id,
            restaurant_id=restaurant.id,
            google_place_id="ChIJ-test",
            verification_status="verified",
        )
    )
    db.commit()

    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=_auth_headers(user),
        json={"confirmation": DELETION_CONFIRMATION_PHRASE},
    )
    assert response.status_code == 409
    assert "panel" in response.json()["detail"].lower()
    db.refresh(user)
    assert user.deleted_at is None


def test_jeton_referral_anonymized_without_user_link(db: Session) -> None:
    user = _make_end_user(db)
    other = User(id=uuid4(), email="ref@example.com", full_name="Ref")
    db.add(other)
    db.flush()
    db.add(Wallet(user_id=user.id, balance=42))
    db.add(
        JetonLedger(
            id=uuid4(),
            user_id=user.id,
            source=JetonLedgerSource.review,
            amount=10,
            status=JetonLedgerStatus.posted,
            idempotency_key=f"review-{uuid4()}",
        )
    )
    db.add(
        Referral(
            id=uuid4(),
            referrer_id=other.id,
            referred_id=user.id,
            device_hash="device-hash-123",
            ip_at_signup="203.0.113.1",
            status=ReferralStatus.rewarded,
        )
    )
    db.commit()

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()

    assert db.get(Wallet, user.id) is None
    ledger = db.scalars(select(JetonLedger)).all()
    assert len(ledger) == 1
    assert ledger[0].user_id is None
    referral = db.scalars(select(Referral)).one()
    assert referral.device_hash is None
    assert referral.ip_at_signup is None
    assert referral.referred_id is None
    assert referral.referrer_id == other.id


def test_pending_order_blocks_account_deletion(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _make_end_user(db)
    restaurant = Restaurant(id=uuid4(), name="Pending Resto", city="Bursa", is_active=True)
    db.add(restaurant)
    db.flush()
    db.add(
        RestaurantOrder(
            id=uuid4(),
            restaurant_id=restaurant.id,
            user_id=user.id,
            customer_phone="+905551112233",
            status=RestaurantOrderStatus.pending,
            total_tl=Decimal("50.00"),
        )
    )
    db.commit()

    response = client.request(
        "DELETE",
        "/api/v1/users/me",
        headers=_auth_headers(user),
        json={"confirmation": DELETION_CONFIRMATION_PHRASE},
    )
    assert response.status_code == 409
    assert "bekleyen" in response.json()["detail"].lower()
    db.refresh(user)
    assert user.deleted_at is None


def test_gourmet_chat_message_placeholder(db: Session) -> None:
    user = _make_end_user(db)
    room = GourmetChatRoom(
        id=uuid4(),
        slug="test-room",
        title="Test",
        description="",
        emoji="💬",
        sort_order=1,
    )
    db.add(room)
    db.flush()
    message = GourmetChatMessage(
        id=uuid4(),
        room_id=room.id,
        author_id=user.id,
        city="Bursa",
        body="Gizli mesaj",
    )
    db.add(message)
    db.commit()

    delete_user_account(db, user_id=user.id, confirmation=DELETION_CONFIRMATION_PHRASE)
    db.commit()
    db.refresh(message)
    assert message.body == "[silindi]"
