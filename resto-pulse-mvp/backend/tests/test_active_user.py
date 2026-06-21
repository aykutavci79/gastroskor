"""Silinmis hesap — middleware ve aktif kullanici resolver testleri."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import User
from app.services.access_token import create_access_token
from app.services.active_user import ACCOUNT_DELETED_DETAIL, resolve_active_user_by_email
from app.services.request_identity import RequestAuth, set_request_auth

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


@pytest.fixture(autouse=True)
def _clear_request_auth():
    set_request_auth(None)
    yield
    set_request_auth(None)


def _deleted_user(db: Session, *, email: str = "deleted-user@example.com") -> User:
    user = User(
        id=uuid4(),
        email=email,
        full_name="Deleted",
        google_sub="google-deleted",
        deleted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _auth_headers(user: User) -> dict[str, str]:
    token, _ = create_access_token(user_id=user.id, email=user.email)
    return {"Authorization": f"Bearer {token}"}


def test_middleware_blocks_deleted_user_on_jeton_route(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _deleted_user(db)
    response = client.get(
        f"/api/v1/jeton/me/wallet?user_email={user.email}",
        headers=_auth_headers(user),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == ACCOUNT_DELETED_DETAIL


def test_middleware_blocks_deleted_user_on_social_route(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _deleted_user(db)
    response = client.get(
        f"/api/v1/social/me/friends?user_email={user.email}",
        headers=_auth_headers(user),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == ACCOUNT_DELETED_DETAIL


def test_middleware_blocks_deleted_user_on_panel_route(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _deleted_user(db)
    response = client.get(
        f"/api/v1/panel/dashboard?user_email={user.email}",
        headers=_auth_headers(user),
    )
    assert response.status_code == 401
    assert response.json()["detail"] == ACCOUNT_DELETED_DETAIL


def test_resolve_active_user_by_email_rejects_deleted(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = _deleted_user(db)
    set_request_auth(RequestAuth(user_id=user.id, email=user.email))
    with pytest.raises(HTTPException) as exc:
        resolve_active_user_by_email(db, user.email)
    assert exc.value.status_code == 401
    assert exc.value.detail == ACCOUNT_DELETED_DETAIL


def test_active_user_access_with_valid_jwt_before_deletion_still_blocked_after_delete(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user = User(id=uuid4(), email="live@example.com", google_sub="sub-live")
    db.add(user)
    db.commit()

    token, _ = create_access_token(user_id=user.id, email=user.email)
    headers = {"Authorization": f"Bearer {token}"}

    user.deleted_at = datetime.now(timezone.utc)
    db.add(user)
    db.commit()

    response = client.get(
        f"/api/v1/jeton/me/wallet?user_email={user.email}",
        headers=headers,
    )
    assert response.status_code == 401
    assert response.json()["detail"] == ACCOUNT_DELETED_DETAIL
