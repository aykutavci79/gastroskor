from unittest.mock import patch

import pytest

from app.services.delivery_address import (
    DeliveryAddressError,
    format_address_label,
    validate_delivery_gps,
)
from app.integrations.tradres_client import is_building_level


def test_is_building_level():
    assert is_building_level("BuildingNumber")
    assert is_building_level("DoorNumber")
    assert not is_building_level("Street")


def test_format_address_label():
    class Row:
        def __init__(self, name: str):
            self.name = name

    label = format_address_label(
        [Row("Osmangazi"), Row("Yeni Karaman"), Row("7. Tepe Sok."), Row("15")],
        note="Daire 3",
    )
    assert "Bursa" in label
    assert "15" in label
    assert "Daire 3" in label


def test_validate_delivery_gps_ok():
    validate_delivery_gps(
        delivery_lat=40.1885,
        delivery_lng=29.061,
        device_lat=40.1886,
        device_lng=29.0611,
    )


def test_validate_delivery_gps_mismatch():
    with pytest.raises(DeliveryAddressError) as exc:
        validate_delivery_gps(
            delivery_lat=40.1885,
            delivery_lng=29.061,
            device_lat=40.2,
            device_lng=29.2,
        )
    assert exc.value.code == "gps_mismatch"


def test_validate_delivery_gps_requires_device():
    with pytest.raises(DeliveryAddressError) as exc:
        validate_delivery_gps(
            delivery_lat=40.1885,
            delivery_lng=29.061,
            device_lat=None,
            device_lng=None,
        )
    assert exc.value.code == "location_required"
