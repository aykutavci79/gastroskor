from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.main import app
from app.models.entities import RevokedRefreshToken, User
from app.services.access_token import create_access_token, create_refresh_token, decode_refresh_token

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


def test_create_and_decode_refresh_token() -> None:
    user_id = uuid4()
    email = "tester@example.com"
    token, expires_in = create_refresh_token(user_id=user_id, email=email)
    assert token
    assert expires_in > 0

    claims = decode_refresh_token(token)
    assert claims.user_id == user_id
    assert claims.email == email
    assert claims.jti
    assert claims.expires_at


def test_refresh_rejects_access_token_type() -> None:
    user_id = uuid4()
    access, _ = create_access_token(user_id=user_id, email="tester@example.com")
    with pytest.raises(ValueError):
        decode_refresh_token(access)


def test_refresh_endpoint_returns_new_tokens(db: Session) -> None:
    user = User(id=uuid4(), email="refresh@example.com", google_sub="sub-1")
    db.add(user)
    db.commit()

    refresh_token, _ = create_refresh_token(user_id=user.id, email=user.email)

    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["refresh_token"] != refresh_token
    assert body["expires_in"] > 0
    assert body["refresh_expires_in"] > 0


def test_refresh_rejects_email_mismatch_with_db_user(db: Session) -> None:
    user = User(id=uuid4(), email="new-email@example.com", google_sub="sub-1")
    db.add(user)
    db.commit()

    refresh_token, _ = create_refresh_token(user_id=user.id, email="old-email@example.com")

    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 401
    assert response.json()["detail"] == "Oturum bulunamadi."
