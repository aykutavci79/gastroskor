from __future__ import annotations

import re


def normalize_tr_mobile(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if digits.startswith("90") and len(digits) >= 12:
        digits = digits[2:]
    if digits.startswith("0"):
        digits = digits[1:]
    if len(digits) == 10 and digits[0] == "5":
        return f"+90{digits}"
    return None


def is_tr_mobile(raw: str | None) -> bool:
    return normalize_tr_mobile(raw) is not None


def mask_phone_e164(phone_e164: str) -> str:
    digits = re.sub(r"\D", "", phone_e164)
    if len(digits) >= 4:
        return f"*** *** {digits[-2:]} {digits[-2:]}"
    return "***"
