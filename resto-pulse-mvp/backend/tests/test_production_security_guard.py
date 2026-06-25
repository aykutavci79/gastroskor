"""Production secret guard ve bearer auth zorunlulugu testleri."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.core.config import Settings
from app.core.production_guard import assert_production_secrets
from app.services.panel_admin import assert_admin_grant_allowed, require_panel_admin_access
from app.services.request_identity import RequestAuth, auth_require_bearer, set_request_auth
from uuid import uuid4


def _production_settings(**overrides: object) -> Settings:
    base = {
        "environment": "production",
        "jwt_secret": "prod-jwt-secret",
        "cron_secret": "prod-cron-secret",
        "panel_admin_secret": "prod-panel-secret",
        "otp_pepper": "prod-otp-pepper-secret",
    }
    base.update(overrides)
    return Settings(**base)


def test_production_startup_rejects_missing_cron_secret() -> None:
    with pytest.raises(RuntimeError, match="CRON_SECRET"):
        assert_production_secrets(_production_settings(cron_secret=None))


def test_production_startup_rejects_placeholder_panel_admin_secret() -> None:
    with pytest.raises(RuntimeError, match="PANEL_ADMIN_SECRET"):
        assert_production_secrets(_production_settings(panel_admin_secret="change-me-panel-admin"))


def test_production_startup_rejects_placeholder_otp_pepper() -> None:
    with pytest.raises(RuntimeError, match="OTP_PEPPER"):
        assert_production_secrets(_production_settings(otp_pepper="dev-otp-pepper-change-me"))


def test_production_startup_accepts_valid_secrets() -> None:
    assert_production_secrets(_production_settings()) is None


def test_production_startup_rejects_placeholder_jwt_secret() -> None:
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        assert_production_secrets(_production_settings(jwt_secret="change-me"))


def test_production_startup_rejects_empty_jwt_secret() -> None:
    with pytest.raises(RuntimeError, match="JWT_SECRET"):
        assert_production_secrets(_production_settings(jwt_secret=""))


def test_production_startup_rejects_order_phone_test_bypass() -> None:
    with pytest.raises(RuntimeError, match="ORDER_PHONE_TEST_BYPASS"):
        assert_production_secrets(_production_settings(order_phone_test_bypass="+905321234567"))


def test_auth_require_bearer_forced_in_production_even_when_flag_false(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.settings.environment", "production")
    monkeypatch.setattr("app.services.request_identity.settings.auth_require_bearer", False)
    assert auth_require_bearer() is True


def test_auth_require_bearer_honors_dev_flag(monkeypatch) -> None:
    monkeypatch.setattr("app.services.request_identity.settings.environment", "development")
    monkeypatch.setattr("app.services.request_identity.settings.auth_require_bearer", False)
    assert auth_require_bearer() is False


def test_require_panel_admin_rejects_secret_without_jwt(monkeypatch) -> None:
    monkeypatch.setattr("app.services.panel_admin.settings.panel_admin_secret", "prod-panel-secret")
    set_request_auth(None)
    with pytest.raises(HTTPException) as exc:
        require_panel_admin_access(secret_header="prod-panel-secret")
    assert exc.value.status_code == 401


def test_assert_admin_grant_requires_jwt_not_secret_only(monkeypatch) -> None:
    monkeypatch.setattr("app.services.panel_admin.settings.panel_admin_secret", "prod-panel-secret")
    monkeypatch.setattr("app.services.panel_admin.settings.panel_admin_emails", "admin@example.com")
    monkeypatch.setattr("app.services.request_identity.auth_require_bearer", lambda: True)
    set_request_auth(None)
    with pytest.raises(HTTPException) as exc:
        assert_admin_grant_allowed(user_email="admin@example.com", secret_header="prod-panel-secret")
    assert exc.value.status_code == 401


def test_require_panel_admin_accepts_jwt_admin_and_secret(monkeypatch) -> None:
    monkeypatch.setattr("app.services.panel_admin.settings.panel_admin_secret", "prod-panel-secret")
    monkeypatch.setattr("app.services.panel_admin.settings.panel_admin_emails", "admin@example.com")
    set_request_auth(RequestAuth(user_id=uuid4(), email="admin@example.com"))
    auth = require_panel_admin_access(secret_header="prod-panel-secret")
    assert auth.email == "admin@example.com"
