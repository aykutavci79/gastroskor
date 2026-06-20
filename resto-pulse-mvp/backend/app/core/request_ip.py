from __future__ import annotations

from fastapi import Request


def get_client_ip(request: Request) -> str:
    """Railway/proxy arkasinda gercek istemci IP'si (X-Forwarded-For)."""
    forwarded = (request.headers.get("x-forwarded-for") or "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"
