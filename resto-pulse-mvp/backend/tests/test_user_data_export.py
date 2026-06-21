"""KVKK veri export — GET /api/v1/users/me/export"""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import JetonLedger, JetonLedgerSource, JetonLedgerStatus, User, Wallet
from app.services.access_token import create_access_token
from app.services.user_data_export import build_user_data_export

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


def _make_user(db: Session, *, email: str = "export@example.com") -> User:
    user = User(
        id=uuid4(),
        email=email,
        full_name="Export User",
        nickname="exportuser",
        kvkk_consent_at=datetime.now(timezone.utc),
        kvkk_consent_version="2026-06",
    )
    db.add(user)
    db.add(Wallet(user_id=user.id, balance=42))
    db.add(
        JetonLedger(
            id=uuid4(),
            user_id=user.id,
            source=JetonLedgerSource.review,
            amount=10,
            status=JetonLedgerStatus.posted,
            idempotency_key=f"daily-{user.id}",
        )
    )
    db.commit()
    return user


def test_export_requires_auth(db: Session) -> None:
    response = client.get("/api/v1/users/me/export")
    assert response.status_code == 401


def test_export_returns_profile_and_wallet(db: Session) -> None:
    user = _make_user(db)
    response = client.get("/api/v1/users/me/export", headers=_auth_headers(user))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/json")
    assert "attachment" in response.headers.get("content-disposition", "")

    payload = response.json()
    assert payload["export_version"] == "1.0"
    assert payload["user_id"] == str(user.id)
    assert payload["profile"]["email"] == user.email
    assert payload["wallet"]["balance"] == 42
    assert payload["jeton_ledger"]["total"] == 1
    assert payload["jeton_ledger"]["items"][0]["amount"] == 10


def test_export_only_own_data_via_jwt(db: Session) -> None:
    user_a = _make_user(db, email="a@example.com")
    user_b = _make_user(db, email="b@example.com")

    response = client.get("/api/v1/users/me/export", headers=_auth_headers(user_a))
    assert response.status_code == 200
    payload = response.json()
    assert payload["profile"]["email"] == "a@example.com"
    assert payload["user_id"] == str(user_a.id)
    assert payload["user_id"] != str(user_b.id)


def test_build_user_data_export_deleted_user_not_found(db: Session) -> None:
    user = _make_user(db)
    user_id = user.id
    db.delete(user)
    db.commit()
    with pytest.raises(ValueError, match="user_not_found"):
        build_user_data_export(db, user_id=user_id)
