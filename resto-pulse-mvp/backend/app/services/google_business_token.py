from __future__ import annotations

import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256((settings.jwt_secret or "change-me").encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt_refresh_token(token: str) -> str:
    return _fernet().encrypt(token.encode()).decode()


def decrypt_refresh_token(payload: str) -> str | None:
    if not payload:
        return None
    try:
        return _fernet().decrypt(payload.encode()).decode()
    except InvalidToken:
        return None
