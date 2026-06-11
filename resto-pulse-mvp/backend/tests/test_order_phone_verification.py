"""Siparis telefonu SMS dogrulama."""

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.services.order_phone_test_bypass import order_phone_test_bypass_set
from app.services.order_phone_verification import (
    mask_order_phone,
    order_phone_status_for_user,
    user_has_verified_order_phone,
)
from app.services.phone_tr import normalize_tr_mobile


def test_normalize_tr_mobile():
    assert normalize_tr_mobile("0532 123 45 67") == "+905321234567"


def test_mask_order_phone():
    assert mask_order_phone("+905321234567") == "0532 *** ** 67"


def test_user_has_verified_order_phone():
    user = SimpleNamespace(
        order_phone_e164="+905321234567",
        order_phone_verified_at=datetime.now(timezone.utc),
    )
    assert user_has_verified_order_phone(user, "+905321234567") is True
    assert user_has_verified_order_phone(user, "+905551234567") is False


def test_order_phone_test_bypass_set_empty_by_default(monkeypatch):
    monkeypatch.setattr("app.services.order_phone_test_bypass.settings.order_phone_test_bypass", "")
    order_phone_test_bypass_set.cache_clear()
    assert order_phone_test_bypass_set() == frozenset()


def test_order_phone_test_bypass_set_parses_numbers(monkeypatch):
    monkeypatch.setattr(
        "app.services.order_phone_test_bypass.settings.order_phone_test_bypass",
        "0532 123 45 67,+905551112233",
    )
    order_phone_test_bypass_set.cache_clear()
    assert order_phone_test_bypass_set() == frozenset({"+905321234567", "+905551112233"})


def test_order_phone_status_unverified():
    user = SimpleNamespace(order_phone_e164=None, order_phone_verified_at=None)
    status = order_phone_status_for_user(user)
    assert status["verified"] is False
