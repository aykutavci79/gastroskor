"""Online siparis servisi — telefon normalizasyonu ve uygunluk kurallari."""

from types import SimpleNamespace

import pytest

from datetime import date

from app.services.restaurant_orders import OrderError, format_order_number, normalize_phone, online_orders_available


def test_normalize_phone_turkish_mobile():
    assert normalize_phone("0532 123 45 67") == "+905321234567"
    assert normalize_phone("5321234567") == "+905321234567"
    assert normalize_phone("+905321234567") == "+905321234567"


def test_normalize_phone_too_short():
    with pytest.raises(OrderError):
        normalize_phone("53212")


def _ownership(
    *,
    subscription_status: str | None = "active",
    has_courier: bool = True,
    online_enabled: bool = True,
    menu_active: bool = True,
):
    subscription = (
        SimpleNamespace(status=subscription_status) if subscription_status else None
    )
    menu_items = [SimpleNamespace(is_active=menu_active)] if menu_active else []
    return SimpleNamespace(
        subscription=subscription,
        promo_has_own_courier=has_courier,
        online_orders_enabled=online_enabled,
        menu_items=menu_items,
    )


def test_online_orders_available_when_all_conditions_met():
    assert online_orders_available(_ownership()) is True


def test_online_orders_unavailable_without_ownership():
    assert online_orders_available(None) is False


def test_online_orders_unavailable_without_courier():
    assert online_orders_available(_ownership(has_courier=False)) is False


def test_online_orders_unavailable_when_disabled():
    assert online_orders_available(_ownership(online_enabled=False)) is False


def test_online_orders_unavailable_without_menu():
    assert online_orders_available(_ownership(menu_active=False)) is False


def test_online_orders_unavailable_without_subscription():
    assert online_orders_available(_ownership(subscription_status=None)) is False


def test_format_order_number():
    assert format_order_number(date(2026, 6, 8), 3) == "08.06.2026-0003"
    assert format_order_number(None, 3) is None
    assert format_order_number(date(2026, 6, 8), None) is None
