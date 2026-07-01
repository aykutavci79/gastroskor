from __future__ import annotations

import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from threading import Lock
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class RateLimitRule:
    limit: int
    window_sec: int


class RateLimiterBackend(Protocol):
    def allow(self, key: str, rule: RateLimitRule) -> bool: ...


class InMemoryRateLimiter:
    """Sliding-window limiter — tek instance veya Redis fallback icin."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        now = time.monotonic()
        cutoff = now - rule.window_sec
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= rule.limit:
                return False
            bucket.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class RedisRateLimiter:
    """Fixed-window limiter: INCR + EXPIRE (ilk istekte pencere baslar)."""

    def __init__(self, redis_url: str, key_prefix: str) -> None:
        self._redis_url = redis_url
        self._key_prefix = key_prefix.rstrip(":")
        self._client = None

    def _redis_key(self, key: str) -> str:
        return f"{self._key_prefix}:{key}"

    def _get_client(self):
        if self._client is None:
            import redis

            self._client = redis.from_url(
                self._redis_url,
                decode_responses=True,
                socket_connect_timeout=1.0,
                socket_timeout=1.0,
                health_check_interval=30,
            )
        return self._client

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        import redis

        full_key = self._redis_key(key)
        client = self._get_client()
        try:
            count = int(client.incr(full_key))
            if count == 1:
                client.expire(full_key, rule.window_sec)
            return count <= rule.limit
        except redis.RedisError:
            self._client = None
            raise

    def ping(self) -> bool:
        import redis

        try:
            return bool(self._get_client().ping())
        except redis.RedisError:
            self._client = None
            return False


class HybridRateLimiter:
    """Redis birincil; baglanti kopunca in-memory fallback (fail-open degil, koruma devam)."""

    def __init__(
        self,
        redis_url: str | None,
        fallback: InMemoryRateLimiter,
        key_prefix: str,
        redis_retry_sec: float = 60.0,
    ) -> None:
        self._fallback = fallback
        self._redis_retry_sec = redis_retry_sec
        self._redis_down_until = 0.0
        self._redis: RedisRateLimiter | None = (
            RedisRateLimiter(redis_url, key_prefix) if redis_url and redis_url.strip() else None
        )

    @property
    def uses_redis(self) -> bool:
        return self._redis is not None

    def allow(self, key: str, rule: RateLimitRule) -> bool:
        if self._redis is not None and time.monotonic() >= self._redis_down_until:
            try:
                return self._redis.allow(key, rule)
            except Exception as exc:
                logger.warning(
                    "Redis rate limit kullanilamadi, in-memory fallback: %s",
                    exc,
                    exc_info=settings.environment.lower() != "production",
                )
                self._redis_down_until = time.monotonic() + self._redis_retry_sec
        return self._fallback.allow(key, rule)

    def reset(self) -> None:
        self._fallback.reset()
        self._redis_down_until = 0.0

    def status(self) -> dict[str, bool | str]:
        if self._redis is None:
            return {"backend": "memory", "redis_configured": False, "redis_ok": False}
        redis_ok = self._redis.ping()
        return {"backend": "redis", "redis_configured": True, "redis_ok": redis_ok}


def rate_limit_key(*parts: str | None) -> str:
    return "|".join(part.strip().lower() for part in parts if part and part.strip())


def path_rate_limit_rule(path: str, method: str, client_ip: str) -> tuple[RateLimitRule, str] | None:
    """Path bazli limitler — IP anahtarinin parcasi."""
    if path.startswith("/api/v1/auth/google/") or path.startswith("/api/v1/auth/apple/") or path in {"/api/v1/auth/refresh", "/api/v1/auth/logout"}:
        return RateLimitRule(limit=20, window_sec=60), rate_limit_key("auth", client_ip)
    if path == "/api/v1/users/sync":
        return RateLimitRule(limit=30, window_sec=60), rate_limit_key("sync", client_ip)
    if path.startswith("/api/v1/live/places/search"):
        return RateLimitRule(limit=60, window_sec=60), rate_limit_key("search", client_ip)
    if path == "/api/v1/voice/transcribe" and method == "POST":
        return RateLimitRule(limit=30, window_sec=60), rate_limit_key("voice", client_ip)
    if path == "/api/v1/order-phone/send-otp" and method == "POST":
        return RateLimitRule(limit=5, window_sec=3600), rate_limit_key("order-phone-send", client_ip)
    if path == "/api/v1/order-phone/verify-otp" and method == "POST":
        return RateLimitRule(limit=30, window_sec=3600), rate_limit_key("order-phone-verify", client_ip)
    if path.endswith("/claim/send-otp") and method == "POST":
        return RateLimitRule(limit=5, window_sec=3600), rate_limit_key("claim-otp-send", client_ip)
    if path.endswith("/claim/verify-otp") and method == "POST":
        return RateLimitRule(limit=30, window_sec=3600), rate_limit_key("claim-otp-verify", client_ip)
    if path == "/api/v1/jeton/referral/click" and method == "POST":
        return RateLimitRule(limit=10, window_sec=3600), rate_limit_key("referral-click", client_ip)
    if path == "/api/v1/eglence/kelime-sofrasi/attempts" and method == "POST":
        return RateLimitRule(limit=120, window_sec=60), rate_limit_key("sofra-attempt", client_ip)
    if path == "/api/v1/eglence/kelime-sofrasi/puzzle" and method == "GET":
        return RateLimitRule(limit=180, window_sec=60), rate_limit_key("sofra-puzzle", client_ip)
    if method == "POST" and path.endswith("/reviews"):
        return RateLimitRule(limit=20, window_sec=3600), rate_limit_key("reviews", client_ip)
    if path.startswith("/api/v1/social/"):
        return RateLimitRule(limit=120, window_sec=60), rate_limit_key("social", client_ip)
    if path.startswith("/api/v1/panel/"):
        return RateLimitRule(limit=180, window_sec=60), rate_limit_key("panel", client_ip)
    return None


def user_global_rate_limit_rule(user_id: str) -> tuple[RateLimitRule, str]:
    limit = max(1, settings.rate_limit_user_global_per_minute)
    window = max(1, settings.rate_limit_user_global_window_sec)
    return RateLimitRule(limit=limit, window_sec=window), rate_limit_key("global-user", user_id)


def user_account_deletion_rate_limit_rule(user_id: str) -> tuple[RateLimitRule, str]:
    """DELETE /users/me — kullanici bazli, IP degil."""
    return RateLimitRule(limit=3, window_sec=3600), rate_limit_key("account-delete", user_id)


def user_data_export_rate_limit_rule(user_id: str) -> tuple[RateLimitRule, str]:
    """GET /users/me/export — agir sorgu, saatte 5."""
    return RateLimitRule(limit=5, window_sec=3600), rate_limit_key("data-export", user_id)


def user_order_phone_send_rate_limit_rule(user_id: str) -> tuple[RateLimitRule, str]:
    """POST /order-phone/send-otp — SMS maliyeti; kullanici bazli."""
    return RateLimitRule(limit=5, window_sec=3600), rate_limit_key("order-phone-send-user", user_id)


PATH_RATE_LIMIT_RULES: tuple[tuple[str, str, int, int, str], ...] = (
    ("/api/v1/auth/*", "ANY", 20, 60, "auth"),
    ("/api/v1/users/sync", "ANY", 30, 60, "sync"),
    ("/api/v1/live/places/search*", "ANY", 60, 60, "search"),
    ("/api/v1/voice/transcribe", "POST", 30, 60, "voice"),
    ("/api/v1/order-phone/send-otp", "POST", 5, 3600, "order-phone-send"),
    ("/api/v1/order-phone/verify-otp", "POST", 30, 3600, "order-phone-verify"),
    ("/api/v1/panel/claim/send-otp", "POST", 5, 3600, "claim-otp-send"),
    ("/api/v1/panel/claim/verify-otp", "POST", 30, 3600, "claim-otp-verify"),
    ("/api/v1/jeton/referral/click", "POST", 10, 3600, "referral-click"),
    ("/api/v1/eglence/kelime-sofrasi/attempts", "POST", 120, 60, "sofra-attempt"),
    ("/api/v1/eglence/kelime-sofrasi/puzzle", "GET", 180, 60, "sofra-puzzle"),
    ("*/reviews", "POST", 20, 3600, "reviews"),
    ("/api/v1/social/*", "ANY", 120, 60, "social"),
    ("/api/v1/panel/*", "ANY", 180, 60, "panel"),
)


def build_rate_limiter() -> HybridRateLimiter:
    return HybridRateLimiter(
        redis_url=settings.redis_url,
        fallback=InMemoryRateLimiter(),
        key_prefix=settings.rate_limit_redis_key_prefix,
    )


rate_limiter = build_rate_limiter()
