from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.core.rate_limit import (
    HybridRateLimiter,
    InMemoryRateLimiter,
    RateLimitRule,
    RedisRateLimiter,
    path_rate_limit_rule,
    user_account_deletion_rate_limit_rule,
    user_global_rate_limit_rule,
)
from app.main import app


@pytest.fixture(autouse=True)
def reset_global_rate_limiter():
    from app.core import rate_limit as rate_limit_module

    rate_limit_module.rate_limiter.reset()
    yield
    rate_limit_module.rate_limiter.reset()


def test_in_memory_rate_limiter_blocks_after_limit() -> None:
    limiter = InMemoryRateLimiter()
    rule = RateLimitRule(limit=3, window_sec=60)
    key = "test|1.2.3.4"

    assert limiter.allow(key, rule) is True
    assert limiter.allow(key, rule) is True
    assert limiter.allow(key, rule) is True
    assert limiter.allow(key, rule) is False


def test_redis_rate_limiter_uses_incr_expire() -> None:
    mock_client = MagicMock()
    mock_client.incr.side_effect = [1, 2, 3, 4]
    limiter = RedisRateLimiter("redis://localhost:6379/0", "test:rl")
    limiter._client = mock_client
    rule = RateLimitRule(limit=3, window_sec=60)

    assert limiter.allow("auth|ip", rule) is True
    mock_client.expire.assert_called_once_with("test:rl:auth|ip", 60)

    assert limiter.allow("auth|ip", rule) is True
    assert limiter.allow("auth|ip", rule) is True
    assert limiter.allow("auth|ip", rule) is False
    assert mock_client.incr.call_count == 4


def test_hybrid_falls_back_to_memory_when_redis_fails() -> None:
    fallback = InMemoryRateLimiter()
    hybrid = HybridRateLimiter("redis://localhost:6379/0", fallback, "test:rl", redis_retry_sec=3600)
    mock_redis = MagicMock()
    mock_redis.allow.side_effect = RuntimeError("connection refused")
    hybrid._redis = mock_redis
    rule = RateLimitRule(limit=2, window_sec=60)
    key = "voice|10.0.0.1"

    assert hybrid.allow(key, rule) is True
    assert hybrid.allow(key, rule) is True
    assert hybrid.allow(key, rule) is False
    assert mock_redis.allow.call_count == 1


@pytest.mark.parametrize(
    ("path", "method", "expected_limit", "expected_window"),
    [
        ("/api/v1/auth/refresh", "POST", 20, 60),
        ("/api/v1/users/sync", "POST", 30, 60),
        ("/api/v1/live/places/search", "GET", 60, 60),
        ("/api/v1/voice/transcribe", "POST", 30, 60),
        ("/api/v1/order-phone/send-otp", "POST", 5, 3600),
        ("/api/v1/order-phone/verify-otp", "POST", 30, 3600),
        ("/api/v1/panel/claim/send-otp", "POST", 5, 3600),
        ("/api/v1/panel/claim/verify-otp", "POST", 30, 3600),
        ("/api/v1/jeton/referral/click", "POST", 10, 3600),
        ("/api/v1/eglence/kelime-sofrasi/attempts", "POST", 120, 60),
        ("/api/v1/eglence/kelime-sofrasi/puzzle", "GET", 180, 60),
        ("/api/v1/restaurants/abc/reviews", "POST", 20, 3600),
        ("/api/v1/social/rooms", "GET", 120, 60),
        ("/api/v1/panel/dashboard", "GET", 180, 60),
    ],
)
def test_path_rate_limit_rules(path: str, method: str, expected_limit: int, expected_window: int) -> None:
    info = path_rate_limit_rule(path, method, "203.0.113.9")
    assert info is not None
    rule, key = info
    assert rule.limit == expected_limit
    assert rule.window_sec == expected_window
    assert "203.0.113.9" in key


def test_user_global_rate_limit_rule() -> None:
    user_id = str(uuid4())
    rule, key = user_global_rate_limit_rule(user_id)
    assert rule.limit >= 1
    assert rule.window_sec >= 1
    assert user_id in key


def test_user_account_deletion_rate_limit_rule() -> None:
    user_id = str(uuid4())
    rule, key = user_account_deletion_rate_limit_rule(user_id)
    assert rule.limit == 3
    assert rule.window_sec == 3600
    assert user_id in key
    assert "account-delete" in key


def test_auth_refresh_returns_429_after_ip_limit() -> None:
    client = TestClient(app)
    path = "/api/v1/auth/refresh"

    for _ in range(20):
        response = client.post(path, json={"refresh_token": "invalid"})
        assert response.status_code != 429

    blocked = client.post(path, json={"refresh_token": "invalid"})
    assert blocked.status_code == 429
    assert "Cok fazla istek" in blocked.json()["detail"]


def test_authenticated_user_global_cap_returns_429(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core import rate_limit as rate_limit_module
    from app.services.access_token import create_access_token

    monkeypatch.setattr("app.core.security_middleware.user_account_is_deleted", lambda _user_id: False)
    monkeypatch.setattr(rate_limit_module.settings, "rate_limit_user_global_per_minute", 2)
    monkeypatch.setattr(rate_limit_module.settings, "rate_limit_user_global_window_sec", 60)

    user_id = uuid4()
    token, _ = create_access_token(user_id=user_id, email="limit@test.com")
    headers = {"Authorization": f"Bearer {token}"}
    client = TestClient(app)

    for _ in range(2):
        response = client.get("/api/v1/me/profile", headers=headers)
        assert response.status_code != 429

    blocked = client.get("/api/v1/me/profile", headers=headers)
    assert blocked.status_code == 429
