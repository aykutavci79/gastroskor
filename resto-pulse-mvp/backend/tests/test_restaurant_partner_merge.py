"""merge_partner_into_row ve tester place detay."""

from __future__ import annotations

from app.services.restaurant_partner import merge_partner_into_row


def test_merge_partner_into_row_applies_partner_fields():
    row: dict = {"place_id": "ChIJabc"}
    partner = {
        "is_premium_partner": True,
        "online_orders_available": True,
        "online_reservations_available": True,
        "online_order_categories": ["kebap-izgara"],
        "promo": {"has_own_courier": True},
        "menu_preview": [{"name": "Lahmacun"}],
        "menu_item_count": 3,
        "card_emoji": "🥙",
        "seo_noindex": False,
        "restaurant_id": "11111111-1111-4111-8111-111111111111",
    }
    out = merge_partner_into_row(row, partner)
    assert out["restaurant_id"] == partner["restaurant_id"]
    assert out["online_orders_available"] is True
    assert out["online_reservations_available"] is True
    assert out["menu_item_count"] == 3


def test_merge_partner_into_row_empty_partner():
    row: dict = {"place_id": "ChIJabc"}
    out = merge_partner_into_row(row, None)
    assert out["is_premium_partner"] is False
    assert out["online_orders_available"] is False
