from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.access_token import create_refresh_token, decode_refresh_token

client = TestClient(app)


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


def test_refresh_rejects_access_token_type() -> None:
    from app.services.access_token import create_access_token

    user_id = uuid4()
    access, _ = create_access_token(user_id=user_id, email="tester@example.com")
    with pytest.raises(ValueError):
        decode_refresh_token(access)


def test_refresh_endpoint_returns_new_tokens(monkeypatch) -> None:
    from app.models import User
    from app.services import user_accounts

    user_id = uuid4()
    fake_user = User(id=user_id, email="refresh@example.com", google_sub="sub-1")

    def fake_get_user(db, uid):
        return fake_user if uid == user_id else None

    monkeypatch.setattr("app.api.v1.auth_refresh_routes.get_user_by_id", fake_get_user)

    refresh_token, _ = create_refresh_token(user_id=user_id, email=fake_user.email)
    response = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token})
    assert response.status_code == 200
    body = response.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["expires_in"] > 0
    assert body["refresh_expires_in"] > 0
