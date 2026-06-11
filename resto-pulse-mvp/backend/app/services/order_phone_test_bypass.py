"""Siparis SMS dogrulama — test numaralari (Railway env ile)."""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.services.phone_tr import normalize_tr_mobile


@lru_cache
def order_phone_test_bypass_set() -> frozenset[str]:
    raw = (settings.order_phone_test_bypass or "").strip()
    if not raw:
        return frozenset()
    phones: set[str] = set()
    for chunk in raw.split(","):
        normalized = normalize_tr_mobile(chunk.strip())
        if normalized:
            phones.add(normalized)
    return frozenset(phones)


def is_order_phone_test_bypass(phone_e164: str) -> bool:
    return phone_e164 in order_phone_test_bypass_set()
