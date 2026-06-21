from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.main import app


@pytest.fixture
def sqlite_db() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    session = sessionmaker(bind=engine)()
    session.execute(text("SELECT 1"))
    try:
        yield session
    finally:
        session.close()


def test_health_returns_ok_when_database_is_reachable(sqlite_db: Session) -> None:
    def override_get_db():
        yield sqlite_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        response = client.get("/api/v1/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"]["ok"] is True
        assert "error" not in data["database"]
        assert "rate_limit" in data
    finally:
        app.dependency_overrides.clear()


def test_health_returns_503_when_database_is_unreachable() -> None:
    def broken_db():
        db = MagicMock()
        db.execute.side_effect = RuntimeError("connection refused")
        yield db

    app.dependency_overrides[get_db] = broken_db
    try:
        client = TestClient(app)
        response = client.get("/api/v1/health")

        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database"]["ok"] is False
        assert data["database"]["error"] == "RuntimeError"
    finally:
        app.dependency_overrides.clear()
