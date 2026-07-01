from __future__ import annotations

import time

import httpx
from jose import jwt
from jose.exceptions import JWTError

APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
APPLE_ISSUER = "https://appleid.apple.com"
_JWKS_TTL_SEC = 60 * 60


class AppleIdTokenError(ValueError):
    pass


_jwks_cache: dict | None = None
_jwks_fetched_at: float = 0.0


def _fetch_apple_jwks() -> dict:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache and now - _jwks_fetched_at < _JWKS_TTL_SEC:
        return _jwks_cache
    try:
        response = httpx.get(APPLE_JWKS_URL, timeout=10.0)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPError as exc:
        raise AppleIdTokenError("Apple oturum anahtarlari alinamadi.") from exc
    if not isinstance(payload, dict) or not payload.get("keys"):
        raise AppleIdTokenError("Apple JWKS gecersiz.")
    _jwks_cache = payload
    _jwks_fetched_at = now
    return payload


def _resolve_apple_public_key(kid: str) -> dict:
    def lookup(keys_payload: dict) -> dict | None:
        for key in keys_payload.get("keys") or []:
            if isinstance(key, dict) and key.get("kid") == kid:
                return key
        return None

    found = lookup(_fetch_apple_jwks())
    if found:
        return found

    global _jwks_cache, _jwks_fetched_at
    _jwks_cache = None
    _jwks_fetched_at = 0.0
    found = lookup(_fetch_apple_jwks())
    if found:
        return found
    raise AppleIdTokenError("Apple oturum anahtari bulunamadi.")


def verify_apple_identity_token(token: str, audience: str) -> dict:
    audience = audience.strip()
    if not audience:
        raise AppleIdTokenError("Apple bundle ID yapilandirilmamis.")

    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise AppleIdTokenError("Apple oturum jetonu okunamadi.") from exc

    kid = str(header.get("kid") or "").strip()
    if not kid:
        raise AppleIdTokenError("Apple oturum jetonu kid eksik.")

    public_key = _resolve_apple_public_key(kid)
    try:
        claims = jwt.decode(
            token,
            public_key,
            algorithms=[str(header.get("alg") or "RS256")],
            audience=audience,
            issuer=APPLE_ISSUER,
            options={"verify_at_hash": False},
        )
    except JWTError as exc:
        raise AppleIdTokenError("Apple oturum jetonu dogrulanamadi.") from exc

    if not isinstance(claims, dict):
        raise AppleIdTokenError("Apple oturum yaniti gecersiz.")
    return claims
