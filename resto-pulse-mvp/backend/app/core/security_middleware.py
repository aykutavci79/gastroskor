from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.rate_limit import RateLimitRule, rate_limit_key, rate_limiter
from app.services.access_token import decode_access_token
from app.services.request_identity import RequestAuth, auth_require_bearer, set_request_auth

logger = logging.getLogger(__name__)

PUBLIC_PREFIXES = (
    "/api/v1/health",
    "/api/v1/auth/refresh",
    "/api/v1/auth/google/",
    "/api/v1/users/avatar-presets",
    "/api/v1/panel/applications",
    "/api/v1/internal/cron/",
    "/media/",
)

PUBLIC_GET_PREFIXES = (
    "/api/v1/restaurants",
    "/api/v1/live/places",
    "/api/v1/regional",
    "/api/v1/users/nickname/check",
)


def _panel_admin_secret_trusted(request: Request) -> bool:
    expected = (settings.panel_admin_secret or "").strip()
    if not expected:
        return False
    header = (request.headers.get("x-panel-admin-secret") or "").strip()
    return bool(header) and header == expected


def _path_requires_auth(path: str, method: str) -> bool:
    if not path.startswith("/api/v1/"):
        return False
    if any(path.startswith(prefix) for prefix in PUBLIC_PREFIXES):
        return False
    if method == "GET" and any(path.startswith(prefix) for prefix in PUBLIC_GET_PREFIXES):
        return False
    if path in {"/api/v1/dev/seed-panel-demo", "/api/v1/dev/seed-tester-online-restaurants"}:
        return False
    if path.startswith("/api/v1/panel/"):
        return True
    if path.startswith("/api/v1/social/"):
        return True
    if path.startswith("/api/v1/discover/"):
        return True
    if path.startswith("/api/v1/gourmet-chat/") and method != "GET":
        return True
    if path.startswith("/api/v1/me/"):
        return True
    if path.startswith("/api/v1/users/"):
        return True
    if path.startswith("/api/v1/feedback/"):
        return True
    if path.startswith("/api/v1/reviews/remedy"):
        return True
    if "/reviews" in path and method in {"POST", "PATCH", "PUT", "DELETE"}:
        return True
    if path.startswith("/api/v1/restaurants/") and method in {"POST", "PATCH", "PUT", "DELETE"}:
        if path.endswith("/follow") or "/orders" in path or path.endswith("/check-in"):
            return True
    if path.startswith("/api/v1/order-phone/"):
        return True
    return False


def _rate_limit_rule(path: str, method: str, client_ip: str) -> tuple[RateLimitRule, str] | None:
    if path.startswith("/api/v1/auth/google/") or path == "/api/v1/auth/refresh":
        return RateLimitRule(limit=20, window_sec=60), rate_limit_key("auth", client_ip)
    if path == "/api/v1/users/sync":
        return RateLimitRule(limit=30, window_sec=60), rate_limit_key("sync", client_ip)
    if path.startswith("/api/v1/live/places/search"):
        return RateLimitRule(limit=60, window_sec=60), rate_limit_key("search", client_ip)
    if path == "/api/v1/voice/transcribe" and method == "POST":
        return RateLimitRule(limit=30, window_sec=60), rate_limit_key("voice", client_ip)
    if method == "POST" and path.endswith("/reviews"):
        return RateLimitRule(limit=20, window_sec=3600), rate_limit_key("reviews", client_ip)
    if path.startswith("/api/v1/social/"):
        return RateLimitRule(limit=120, window_sec=60), rate_limit_key("social", client_ip)
    if path.startswith("/api/v1/panel/"):
        return RateLimitRule(limit=180, window_sec=60), rate_limit_key("panel", client_ip)
    return None


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        set_request_auth(None)
        path = request.url.path
        method = request.method.upper()

        client_ip = request.client.host if request.client else "unknown"
        client_ip = request.client.host if request.client else "unknown"
        rule_info = _rate_limit_rule(path, method, client_ip)
        if rule_info is not None:
            rule, key = rule_info
            keyed = rate_limit_key(key, client_ip)
            if not rate_limiter.allow(keyed, rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Cok fazla istek. Lutfen kisa bir sure sonra tekrar deneyin."},
                )

        auth_header = request.headers.get("authorization", "")
        token = ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

        panel_admin_trusted = path.startswith("/api/v1/panel/admin/") and _panel_admin_secret_trusted(request)

        auth: RequestAuth | None = None
        if token:
            try:
                claims = decode_access_token(token)
                auth = RequestAuth.from_claims(claims)
                set_request_auth(auth)
            except ValueError:
                if auth_require_bearer() and _path_requires_auth(path, method) and not panel_admin_trusted:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Gecersiz veya suresi dolmus oturum."},
                    )
        if auth_require_bearer() and _path_requires_auth(path, method) and auth is None and not panel_admin_trusted:
            return JSONResponse(
                status_code=401,
                content={"detail": "Oturum gerekli. Google ile giris yapip tekrar deneyin."},
            )

        if settings.environment.lower() == "production" and path in {
            "/api/v1/dev/seed-panel-demo",
            "/api/v1/dev/seed-tester-online-restaurants",
        }:
            return JSONResponse(status_code=404, content={"detail": "Not found"})

        return await call_next(request)
