"""Online siparis calisma saati kurallari."""

from datetime import datetime
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app.services.online_order_hours import (
    default_online_order_hours,
    online_order_hours_status,
    online_orders_within_hours,
    validate_online_order_hours,
)

IST = ZoneInfo("Europe/Istanbul")


def test_validate_default_hours_ok():
    validate_online_order_hours(default_online_order_hours())


def test_validate_requires_one_open_day():
    hours = default_online_order_hours()
    for key in hours["weekly"]:
        hours["weekly"][key]["closed"] = True
    try:
        validate_online_order_hours(hours)
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "En az bir gun" in str(exc)


def test_within_hours_at_noon():
    ownership = SimpleNamespace(online_order_hours=default_online_order_hours())
    noon = datetime(2026, 6, 25, 12, 0, tzinfo=IST)
    assert online_orders_within_hours(ownership, now=noon) is True


def test_closed_after_closing_time():
    ownership = SimpleNamespace(online_order_hours=default_online_order_hours())
    late = datetime(2026, 6, 25, 23, 30, tzinfo=IST)
    assert online_orders_within_hours(ownership, now=late) is False
    status = online_order_hours_status(ownership, now=late)
    assert status["open_now"] is False
    assert "Kapali" in status["label"]


def test_online_orders_within_hours_only():
    ownership = SimpleNamespace(
        subscription=SimpleNamespace(status="active"),
        promo_has_own_courier=True,
        online_orders_enabled=True,
        online_order_hours=default_online_order_hours(),
        menu_items=[SimpleNamespace(is_active=True)],
    )
    open_time = datetime(2026, 6, 25, 18, 0, tzinfo=IST)
    closed_time = datetime(2026, 6, 25, 23, 15, tzinfo=IST)
    assert online_orders_within_hours(ownership, now=open_time) is True
    assert online_orders_within_hours(ownership, now=closed_time) is False
