from __future__ import annotations

import re
from copy import deepcopy
from typing import Any

SENTRY_REDACTED = "[REDACTED]"

_SENSITIVE_KEY = re.compile(
    r"^(authorization|access[_-]?token|refresh[_-]?token|password|jwt|secret|api[_-]?key|id[_-]?token|bearer|cookie|set-cookie)$",
    re.IGNORECASE,
)
_PII_KEY = re.compile(
    r"^(email|user_email|author_email|actor_user_email|phone|order_phone|telefon|e164|full_name|nickname|name)$",
    re.IGNORECASE,
)
_JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")
_BEARER_PATTERN = re.compile(r"Bearer\s+[A-Za-z0-9._-]+", re.IGNORECASE)
_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
_LOOSE_EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
)
_PHONE_PATTERN = re.compile(r"^\+?\d[\d\s()-]{6,}$")


def _mask_email(value: str) -> str:
    trimmed = value.strip()
    at = trimmed.find("@")
    if at <= 0:
        return SENTRY_REDACTED
    return f"***{trimmed[at:]}"


def _mask_emails_in_text(value: str) -> str:
    return _LOOSE_EMAIL_PATTERN.sub(lambda match: _mask_email(match.group(0)), value)


def _scrub_string(value: str, key_hint: str | None = None) -> str:
    if key_hint and _SENSITIVE_KEY.search(key_hint):
        return SENTRY_REDACTED
    if key_hint and _PII_KEY.search(key_hint):
        if _EMAIL_PATTERN.match(value.strip()):
            return _mask_email(value)
        if _PHONE_PATTERN.match(value.strip()):
            return SENTRY_REDACTED
        return SENTRY_REDACTED
    next_value = value
    if next_value.strip().lower().startswith("bearer "):
        return f"Bearer {SENTRY_REDACTED}"
    if _JWT_PATTERN.search(next_value.strip()):
        return SENTRY_REDACTED
    next_value = _BEARER_PATTERN.sub(f"Bearer {SENTRY_REDACTED}", next_value)
    next_value = _JWT_PATTERN.sub(SENTRY_REDACTED, next_value)
    return _mask_emails_in_text(next_value)


def _scrub_unknown(value: Any, key_hint: str | None = None, depth: int = 0) -> Any:
    if depth > 14:
        return SENTRY_REDACTED
    if value is None:
        return value
    if isinstance(value, str):
        return _scrub_string(value, key_hint)
    if isinstance(value, (int, float, bool)):
        return value
    if isinstance(value, list):
        return [_scrub_unknown(item, key_hint, depth + 1) for item in value]
    if isinstance(value, dict):
        output: dict[str, Any] = {}
        for key, nested in value.items():
            if _SENSITIVE_KEY.search(key):
                output[key] = SENTRY_REDACTED
                continue
            if _PII_KEY.search(key) and isinstance(nested, str):
                output[key] = _scrub_string(nested, key)
                continue
            output[key] = _scrub_unknown(nested, key, depth + 1)
        return output
    return value


def scrub_sentry_event(event: dict[str, Any]) -> dict[str, Any]:
    return _scrub_unknown(deepcopy(event))


def create_sentry_before_send():
    def before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
        return scrub_sentry_event(event)

    return before_send
