from uuid import uuid4

import pytest

from app.services.access_token import create_access_token, create_token_pair, decode_access_token


def test_create_and_decode_access_token() -> None:
    user_id = uuid4()
    email = "tester@example.com"
    token, expires_in = create_access_token(user_id=user_id, email=email)
    assert token
    assert expires_in > 0

    claims = decode_access_token(token)
    assert claims.user_id == user_id
    assert claims.email == email


def test_create_token_pair_returns_refresh() -> None:
    user_id = uuid4()
    tokens = create_token_pair(user_id=user_id, email="tester@example.com")
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens["expires_in"] > 0
    assert tokens["refresh_expires_in"] > 0


def test_decode_rejects_invalid_signature() -> None:
    user_id = uuid4()
    token, _ = create_access_token(user_id=user_id, email="tester@example.com")
    broken = f"{token}invalid"
    with pytest.raises(ValueError):
        decode_access_token(broken)
