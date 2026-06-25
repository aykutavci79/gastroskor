"""Panel remedy endpoint IDOR guard tests."""

from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.v1 import panel_routes
from app.services.request_identity import RequestAuth, set_request_auth


@pytest.fixture(autouse=True)
def _clear_request_auth():
    set_request_auth(None)
    yield
    set_request_auth(None)


def test_panel_list_pending_remedy_rejects_mismatched_email(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    set_request_auth(RequestAuth(user_id=uuid4(), email="owner@example.com"))

    with pytest.raises(HTTPException) as exc:
        panel_routes.panel_list_pending_remedy_reviews(
            user_email="other@example.com",
            limit=50,
            db=object(),  # type: ignore[arg-type]
        )

    assert exc.value.status_code == 403


def test_panel_list_pending_remedy_uses_verified_email(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    captured: list[str] = []

    def _fake_list(db, *, user_email: str, limit: int):
        captured.append(user_email)
        return []

    monkeypatch.setattr(panel_routes, "list_pending_remedy_for_panel", _fake_list)
    set_request_auth(RequestAuth(user_id=uuid4(), email="owner@example.com"))

    panel_routes.panel_list_pending_remedy_reviews(
        user_email="owner@example.com",
        limit=50,
        db=object(),  # type: ignore[arg-type]
    )

    assert captured == ["owner@example.com"]


def test_panel_issue_remedy_offer_rejects_mismatched_email(monkeypatch) -> None:
    from app.schemas.review_remedy import ReviewRemedyOfferCreate

    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    set_request_auth(RequestAuth(user_id=uuid4(), email="owner@example.com"))

    payload = ReviewRemedyOfferCreate(user_email="other@example.com", discount_percent=10)

    with pytest.raises(HTTPException) as exc:
        panel_routes.panel_issue_remedy_offer(
            review_id=uuid4(),
            payload=payload,
            db=object(),  # type: ignore[arg-type]
        )

    assert exc.value.status_code == 403
