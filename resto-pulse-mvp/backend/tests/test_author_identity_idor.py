"""IDOR guard tests for resolve_authenticated_email / resolve_actor_user."""

from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.services.request_identity import RequestAuth, resolve_authenticated_email, set_request_auth


@pytest.fixture(autouse=True)
def _clear_request_auth():
    set_request_auth(None)
    yield
    set_request_auth(None)


def test_resolve_authenticated_email_rejects_mismatched_claim(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="alice@example.com"))

    with pytest.raises(HTTPException) as exc:
        resolve_authenticated_email(claimed_email="bob@example.com")

    assert exc.value.status_code == 403


def test_resolve_authenticated_email_uses_jwt_when_claim_matches(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="alice@example.com"))

    assert resolve_authenticated_email(claimed_email="alice@example.com") == "alice@example.com"


def test_resolve_authenticated_email_uses_jwt_when_claim_omitted(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    user_id = uuid4()
    set_request_auth(RequestAuth(user_id=user_id, email="alice@example.com"))

    assert resolve_authenticated_email(claimed_email=None) == "alice@example.com"
