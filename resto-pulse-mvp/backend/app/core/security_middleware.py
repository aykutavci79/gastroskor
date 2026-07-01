from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request, Response
from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings
from app.core.request_ip import get_client_ip
from app.core.rate_limit import (
    path_rate_limit_rule,
    rate_limiter,
    user_account_deletion_rate_limit_rule,
    user_data_export_rate_limit_rule,
    user_global_rate_limit_rule,
    user_order_phone_send_rate_limit_rule,
)
from app.services.access_token import decode_access_token
from app.services.active_user import ACCOUNT_DELETED_DETAIL, user_account_is_deleted
from app.services.request_identity import RequestAuth, auth_require_bearer, set_request_auth

logger = logging.getLogger(__name__)

PUBLIC_PREFIXES = (
    "/api/v1/health",
    "/api/v1/auth/refresh",
    "/api/v1/auth/google/",
    "/api/v1/auth/apple/",
    "/api/v1/auth/dev/",
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


def _path_always_requires_bearer(path: str, method: str) -> bool:
    return path == "/api/v1/voice/transcribe" and method == "POST"


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
    if path.startswith("/api/v1/jeton/"):
        return True
    if path.startswith("/api/v1/metrics/admin/"):
        return True
    if path.startswith("/api/v1/foodcast/") and method in {"POST", "DELETE", "PATCH"}:
        return True
    return False


class SecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        set_request_auth(None)
        path = request.url.path
        method = request.method.upper()

        client_ip = get_client_ip(request)
        rule_info = path_rate_limit_rule(path, method, client_ip)
        if rule_info is not None:
            rule, key = rule_info
            if not rate_limiter.allow(key, rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Cok fazla istek. Lutfen kisa bir sure sonra tekrar deneyin."},
                )

        auth_header = request.headers.get("authorization", "")
        token = ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

        always_requires_bearer = _path_always_requires_bearer(path, method)

        auth: RequestAuth | None = None
        if token:
            try:
                claims = decode_access_token(token)
                auth = RequestAuth.from_claims(claims)
                set_request_auth(auth)
            except ValueError:
                if always_requires_bearer or (
                    auth_require_bearer() and _path_requires_auth(path, method)
                ):
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Gecersiz veya suresi dolmus oturum."},
                    )
        if auth is not None:
            if await run_in_threadpool(user_account_is_deleted, auth.user_id):
                set_request_auth(None)
                return JSONResponse(
                    status_code=401,
                    content={"detail": ACCOUNT_DELETED_DETAIL},
                )
        if auth is not None and path == "/api/v1/users/me" and method == "DELETE":
            delete_rule, delete_key = user_account_deletion_rate_limit_rule(str(auth.user_id))
            if not rate_limiter.allow(delete_key, delete_rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Hesap silme istegi limiti asildi. Lutfen bir saat sonra tekrar deneyin."},
                )
        if auth is not None and path == "/api/v1/users/me/export" and method == "GET":
            export_rule, export_key = user_data_export_rate_limit_rule(str(auth.user_id))
            if not rate_limiter.allow(export_key, export_rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Veri indirme limiti asildi. Lutfen bir saat sonra tekrar deneyin."},
                )
        if auth is not None and path == "/api/v1/order-phone/send-otp" and method == "POST":
            otp_rule, otp_key = user_order_phone_send_rate_limit_rule(str(auth.user_id))
            if not rate_limiter.allow(otp_key, otp_rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "SMS kodu istegi limiti asildi. Lutfen bir saat sonra tekrar deneyin."},
                )
        if auth is not None:
            user_rule, user_key = user_global_rate_limit_rule(str(auth.user_id))
            if not rate_limiter.allow(user_key, user_rule):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Cok fazla istek. Lutfen kisa bir sure sonra tekrar deneyin."},
                )

        if always_requires_bearer and auth is None:
            return JSONResponse(
                status_code=401,
                content={"detail": "Oturum gerekli. Google ile giris yapip tekrar deneyin."},
            )
        if auth_require_bearer() and _path_requires_auth(path, method) and auth is None:
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
