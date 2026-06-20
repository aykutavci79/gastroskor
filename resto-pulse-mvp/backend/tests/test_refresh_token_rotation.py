from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.main import app
from app.models.entities import RevokedRefreshToken, User
from app.services.access_token import create_refresh_token, decode_refresh_token
from app.services.refresh_token_revocation import (
    cleanup_expired_revoked_refresh_tokens,
    is_refresh_token_revoked,
    revoke_refresh_token,
)

client = TestClient(app)


@pytest.fixture
def db() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    User.__table__.create(engine, checkfirst=True)
    RevokedRefreshToken.__table__.create(engine, checkfirst=True)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_refresh_token_rotation_rejects_reuse(db: Session) -> None:
    user = User(id=uuid4(), email="rotate@example.com", google_sub="sub-rotate")
    db.add(user)
    db.commit()

    refresh_token, _ = create_refresh_token(user_id=user.id, email=user.email)
    claims = decode_refresh_token(refresh_token)

    app.dependency_overrides[get_db] = lambda: db
    try:
        first = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert first.status_code == 200
        new_refresh = first.json()["refresh_token"]
        assert new_refresh != refresh_token
        assert is_refresh_token_revoked(db, claims.jti)

        reuse = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert reuse.status_code == 401

        second = client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
        assert second.status_code == 200
        assert second.json()["refresh_token"] != new_refresh
    finally:
        app.dependency_overrides.clear()


def test_logout_revokes_refresh_token(db: Session) -> None:
    user = User(id=uuid4(), email="logout@example.com", google_sub="sub-logout")
    db.add(user)
    db.commit()

    refresh_token, _ = create_refresh_token(user_id=user.id, email=user.email)
    claims = decode_refresh_token(refresh_token)

    app.dependency_overrides[get_db] = lambda: db
    try:
        logout = client.post("/api/v1/auth/logout", json={"refresh_token": refresh_token})
        assert logout.status_code == 204

        refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
        assert refresh.status_code == 401
    finally:
        app.dependency_overrides.clear()

    assert is_refresh_token_revoked(db, claims.jti)


def test_cleanup_expired_revoked_refresh_tokens(db: Session) -> None:
    from datetime import datetime, timedelta, timezone

    user_id = uuid4()
    past = datetime.now(timezone.utc) - timedelta(days=1)
    future = datetime.now(timezone.utc) + timedelta(days=29)

    db.add(
        RevokedRefreshToken(
            jti="expired-jti",
            user_id=user_id,
            expires_at=past,
            revoked_at=past,
        )
    )
    db.add(
        RevokedRefreshToken(
            jti="active-jti",
            user_id=user_id,
            expires_at=future,
            revoked_at=datetime.now(timezone.utc),
        )
    )
    db.commit()

    removed = cleanup_expired_revoked_refresh_tokens(db)
    db.commit()

    assert removed == 1
    assert is_refresh_token_revoked(db, "expired-jti") is False
    assert is_refresh_token_revoked(db, "active-jti") is True


def test_revoke_refresh_token_is_idempotent(db: Session) -> None:
    from datetime import datetime, timedelta, timezone

    user_id = uuid4()
    expires_at = datetime.now(timezone.utc) + timedelta(days=30)
    revoke_refresh_token(db, jti="same-jti", user_id=user_id, expires_at=expires_at)
    revoke_refresh_token(db, jti="same-jti", user_id=user_id, expires_at=expires_at)
    db.commit()
    assert is_refresh_token_revoked(db, "same-jti")
