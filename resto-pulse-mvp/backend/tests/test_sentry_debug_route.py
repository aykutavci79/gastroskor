from __future__ import annotations

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


def test_cron_sentry_test_requires_secret(monkeypatch) -> None:
    monkeypatch.setattr("app.api.v1.routes.settings.cron_secret", "test-cron-secret")
    client = TestClient(app)
    response = client.post("/api/v1/internal/cron/sentry-test")
    assert response.status_code == 401


def test_cron_sentry_test_sends_event_when_initialized(monkeypatch) -> None:
    monkeypatch.setattr("app.api.v1.routes.settings.cron_secret", "test-cron-secret")
    with (
        patch("app.core.sentry_setup.is_sentry_initialized", return_value=True),
        patch("app.core.sentry_setup.capture_sentry_test_event", return_value="abc123") as capture,
    ):
        client = TestClient(app)
        response = client.post(
            "/api/v1/internal/cron/sentry-test",
            headers={"X-Cron-Secret": "test-cron-secret"},
        )
    assert response.status_code == 200
    assert response.json() == {"ok": True, "event_id": "abc123"}
    capture.assert_called_once()
