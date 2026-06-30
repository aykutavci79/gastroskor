"""Rezervasyon vitrin eligibility ve listeleme kurallari."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from app.models.entities import ReservationVitrinStatus
from app.services.reservation_vitrin import (
    evaluate_reservation_vitrin_eligibility,
    reservation_vitrin_listed,
)


def _ownership(**kwargs):
    defaults = {
        "online_reservations_enabled": True,
        "reservation_vitrin_status": ReservationVitrinStatus.approved,
        "online_order_category_tags": ["kebap-izgara"],
        "subscription": SimpleNamespace(status="active", trial_ends_at=None),
    }
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _restaurant(**kwargs):
    defaults = {"name": "Atlas Sofra", "category": "Kebap"}
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def _plan(table_count: int, seats_each: int = 4):
    tables = [
        {
            "id": f"t{i}",
            "label": f"M{i + 1}",
            "zone": "salon",
            "x": 0.1,
            "y": 0.1,
            "seats_min": seats_each,
            "seats_max": seats_each,
            "reservation_closed": False,
        }
        for i in range(table_count)
    ]
    return SimpleNamespace(published_layout={"tables": tables, "pois": [], "version": 1})


def test_vitrin_listed_requires_approved_and_configured():
    ownership = _ownership(
        reservation_vitrin_status=ReservationVitrinStatus.approved,
        online_reservations_enabled=True,
    )
    assert reservation_vitrin_listed(ownership) is True

    ownership.reservation_vitrin_status = ReservationVitrinStatus.pending
    assert reservation_vitrin_listed(ownership) is False

    ownership.reservation_vitrin_status = ReservationVitrinStatus.approved
    ownership.online_reservations_enabled = False
    assert reservation_vitrin_listed(ownership) is False


def test_eligibility_passes_for_sit_down_restaurant():
    ownership = _ownership()
    restaurant = _restaurant()
    plan = _plan(10, seats_each=4)
    result = evaluate_reservation_vitrin_eligibility(
        ownership=ownership,
        restaurant=restaurant,
        plan=plan,
    )
    assert result.passed is True
    assert result.auto_reject is False
    assert result.can_apply is True


def test_eligibility_auto_rejects_blocked_name():
    ownership = _ownership()
    restaurant = _restaurant(name="Hizli Cig Kofte Paket")
    plan = _plan(10, seats_each=4)
    result = evaluate_reservation_vitrin_eligibility(
        ownership=ownership,
        restaurant=restaurant,
        plan=plan,
    )
    assert result.auto_reject is True
    assert result.can_apply is False
    assert any(item.code == "name" and not item.passed for item in result.items)


def test_eligibility_fails_low_table_count_without_auto_reject():
    ownership = _ownership()
    restaurant = _restaurant()
    plan = _plan(5, seats_each=4)
    result = evaluate_reservation_vitrin_eligibility(
        ownership=ownership,
        restaurant=restaurant,
        plan=plan,
    )
    assert result.auto_reject is False
    assert result.can_apply is True
    assert result.passed is False
    assert any(item.code == "table_count" and not item.passed for item in result.items)
