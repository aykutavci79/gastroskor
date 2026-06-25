"""IDOR guard tests for feedback_authz actor resolution."""

from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import User
from app.services.feedback_authz import (
    resolve_authenticated_feedback_user_id,
    resolve_user_identity,
)
from app.services.request_identity import RequestAuth, set_request_auth


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
def _clear_request_auth():
    set_request_auth(None)
    yield
    set_request_auth(None)


def test_resolve_user_identity_rejects_mismatched_email(db, monkeypatch) -> None:
    monkeypatch.setattr("app.services.feedback_authz.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="owner@example.com"))

    with pytest.raises(HTTPException) as exc:
        resolve_user_identity(db, user_id=None, email="attacker@example.com")

    assert exc.value.status_code == 403


def test_resolve_user_identity_rejects_mismatched_user_id(db, monkeypatch) -> None:
    monkeypatch.setattr("app.services.feedback_authz.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="owner@example.com"))

    with pytest.raises(HTTPException) as exc:
        resolve_user_identity(db, user_id=str(uuid4()), email="owner@example.com")

    assert exc.value.status_code == 403


def test_resolve_user_identity_uses_jwt_session_when_actor_params_match(db, monkeypatch) -> None:
    monkeypatch.setattr("app.services.feedback_authz.auth_require_bearer", lambda: True)
    from app.models import User

    user = User(email="owner@example.com", nickname="owner", role="user")
    db.add(user)
    db.commit()
    db.refresh(user)

    set_request_auth(RequestAuth(user_id=user.id, email=user.email))
    actor = resolve_user_identity(db, user_id=str(user.id), email=user.email)

    assert actor.id == user.id
    assert actor.email == user.email


def test_resolve_authenticated_feedback_user_id_rejects_spoofed_actor(monkeypatch) -> None:
    monkeypatch.setattr("app.services.feedback_authz.auth_require_bearer", lambda: True)
    victim_id = uuid4()
    set_request_auth(RequestAuth(user_id=uuid4(), email="attacker@example.com"))

    with pytest.raises(HTTPException) as exc:
        resolve_authenticated_feedback_user_id(user_id=str(victim_id), email=None)

    assert exc.value.status_code == 403


def test_resolve_authenticated_feedback_user_id_returns_jwt_user_id(monkeypatch) -> None:
    monkeypatch.setattr("app.services.feedback_authz.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="author@example.com"))

    assert resolve_authenticated_feedback_user_id(user_id=str(user_id), email="author@example.com") == user_id
