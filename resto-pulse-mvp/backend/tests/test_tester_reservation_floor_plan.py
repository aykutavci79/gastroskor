"""Atlas Sofra demo salon plani."""

from app.constants.tester_reservation_floor_plan import build_atlas_sofra_floor_layout


def test_atlas_sofra_layout_has_three_zones():
    layout = build_atlas_sofra_floor_layout()
    zones = {row["zone"] for row in layout["tables"]}
    assert zones == {"salon", "bahce", "teras"}
    assert len(layout["tables"]) == 29
