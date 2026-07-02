from unittest.mock import MagicMock, patch

import pytest

from app.services.delivery_address import (
    DeliveryAddressError,
    format_address_label,
    validate_delivery_gps,
)


class Row:
    def __init__(self, name: str, level: str = "street"):
        self.name = name
        self.level = level


def test_format_address_label_with_door():
    label = format_address_label(
        [
            Row("Osmangazi", "district"),
            Row("Yeni Karaman", "neighborhood"),
            Row("7. Tepe Sok.", "street"),
        ],
        door_number="15",
        note="Daire 3",
    )
    assert "Bursa" in label
    assert "No: 15" in label
    assert "Daire 3" in label


def test_validate_delivery_gps_ok():
    validate_delivery_gps(
        delivery_lat=40.2,
        delivery_lng=29.0,
        device_lat=40.2001,
        device_lng=29.0001,
    )


def test_validate_delivery_gps_mismatch():
    with pytest.raises(DeliveryAddressError) as exc:
        validate_delivery_gps(
            delivery_lat=40.2,
            delivery_lng=29.0,
            device_lat=40.25,
            device_lng=29.1,
        )
    assert exc.value.code == "gps_mismatch"


@patch("app.services.delivery_address.geocode_delivery_address", return_value=(40.2, 29.0))
def test_resolve_delivery_address(mock_geocode):
    from app.models.entities import AddressNodeCache
    from app.services.delivery_address import resolve_delivery_address

    rows = {
        3000001: AddressNodeCache(tradres_id=3000001, parent_id=2000001, level="street", name="Demo Sok"),
        2000001: AddressNodeCache(tradres_id=2000001, parent_id=1832, level="neighborhood", name="Demo Mah"),
        1832: AddressNodeCache(tradres_id=1832, parent_id=16, level="district", name="Osmangazi"),
        16: AddressNodeCache(tradres_id=16, parent_id=None, level="province", name="Bursa"),
    }
    db = MagicMock()
    db.get.side_effect = lambda _model, node_id: rows.get(node_id)

    formatted, lat, lng = resolve_delivery_address(
        db,
        street_node_id=3000001,
        door_number="7",
        address_note=None,
        device_lat=40.2,
        device_lng=29.0,
    )
    assert "No: 7" in formatted
    assert lat == 40.2
    mock_geocode.assert_called_once()
