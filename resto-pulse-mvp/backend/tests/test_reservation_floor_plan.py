"""Online rezervasyon — layout dogrulama testleri."""

from __future__ import annotations

import pytest

from app.services.reservation_floor_plan import FloorPlanError, find_table, normalize_layout, zone_label_tr


def test_empty_layout():
    layout = normalize_layout(None)
    assert layout == {"version": 1, "tables": [], "pois": []}


def test_normalize_table_and_poi():
    layout = normalize_layout(
        {
            "tables": [
                {
                    "id": "t1",
                    "zone": "bahce",
                    "label": "B12",
                    "seats_min": 2,
                    "seats_max": 4,
                    "x": 0.25,
                    "y": 0.75,
                }
            ],
            "pois": [{"id": "p1", "kind": "entrance", "label": "Giris", "x": 0.1, "y": 0.1}],
        }
    )
    assert len(layout["tables"]) == 1
    assert layout["tables"][0]["zone"] == "bahce"
    assert find_table(layout, "t1")["label"] == "B12"
    assert zone_label_tr("teras") == "Teras"


def test_reject_invalid_zone():
    with pytest.raises(FloorPlanError):
        normalize_layout({"tables": [{"id": "x", "zone": "sigara", "label": "A", "x": 0.5, "y": 0.5}]})


def test_reject_duplicate_table_id():
    row = {"id": "dup", "zone": "salon", "label": "1", "seats_min": 2, "seats_max": 4, "x": 0.2, "y": 0.2}
    with pytest.raises(FloorPlanError):
        normalize_layout({"tables": [row, row]})


def test_clamps_swapped_seats():
    layout = normalize_layout(
        {
            "tables": [
                {
                    "id": "t1",
                    "zone": "salon",
                    "label": "M1",
                    "seats_min": 8,
                    "seats_max": 2,
                    "x": 0.5,
                    "y": 0.5,
                }
            ],
        }
    )
    assert layout["tables"][0]["seats_min"] == 8
    assert layout["tables"][0]["seats_max"] == 8


def test_reservation_closed_flag():
    layout = normalize_layout(
        {
            "tables": [
                {
                    "id": "t1",
                    "zone": "salon",
                    "label": "M1",
                    "seats_min": 2,
                    "seats_max": 6,
                    "x": 0.5,
                    "y": 0.5,
                    "reservation_closed": True,
                }
            ],
        }
    )
    assert layout["tables"][0]["reservation_closed"] is True
