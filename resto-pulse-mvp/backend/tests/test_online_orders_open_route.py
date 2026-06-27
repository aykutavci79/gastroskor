"""online-orders-open route — import/regresyon."""

from __future__ import annotations

from app.api.v1 import routes as api_routes


def test_online_orders_open_route_imports_discovery_helpers() -> None:
    assert api_routes.list_online_order_restaurants is not None
    assert api_routes.categories_payload is not None
