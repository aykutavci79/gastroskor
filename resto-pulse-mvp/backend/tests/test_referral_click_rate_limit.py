"""POST /jeton/referral/click — IP bazli rate limit."""

from __future__ import annotations

from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.entities import User

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


def test_referral_click_returns_429_after_ip_limit(db: Session) -> None:
    from app.core import rate_limit as rate_limit_module

    referrer = User(id=uuid4(), email="referrer@example.com", google_sub="sub-ref")
    db.add(referrer)
    db.commit()

    rate_limit_module.rate_limiter.reset()
    path = "/api/v1/jeton/referral/click"
    payload = {"referrer_id": str(referrer.id), "device_hash": "device-abc"}

    for _ in range(10):
        response = client.post(path, json=payload)
        assert response.status_code == 200

    blocked = client.post(path, json=payload)
    assert blocked.status_code == 429
    assert "Cok fazla istek" in blocked.json()["detail"]
