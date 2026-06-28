"""Atlas Sofra tester — yayinlanmis salon plani sablonu."""

from __future__ import annotations

from app.services.reservation_floor_plan import normalize_layout


def _grid_tables(
    *,
    zone: str,
    prefix: str,
    count: int,
    x_start: float,
    y_start: float,
    x_step: float,
    y_step: float,
    cols: int,
    seats_min: int = 2,
    seats_max: int = 4,
) -> list[dict]:
    rows: list[dict] = []
    for index in range(count):
        col = index % cols
        row = index // cols
        rows.append(
            {
                "id": f"{prefix}-{index + 1}",
                "zone": zone,
                "label": f"{prefix.upper()}{index + 1}" if prefix.isalpha() else f"M{index + 1}",
                "seats_min": seats_min,
                "seats_max": seats_max,
                "x": round(x_start + col * x_step, 3),
                "y": round(y_start + row * y_step, 3),
            }
        )
    return rows


def build_atlas_sofra_floor_layout() -> dict:
    tables: list[dict] = []
    for i in range(1, 17):
        col = (i - 1) % 2
        row = (i - 1) // 2
        tables.append(
            {
                "id": f"m-salon-{i}",
                "zone": "salon",
                "label": f"M{i}",
                "seats_min": 2,
                "seats_max": 4,
                "x": round(0.22 + col * 0.18, 3),
                "y": round(0.12 + row * 0.09, 3),
            }
        )
    for i in range(1, 7):
        col = (i - 1) % 2
        row = (i - 1) // 2
        tables.append(
            {
                "id": f"b-bahce-{i}",
                "zone": "bahce",
                "label": f"B{i}",
                "seats_min": 2,
                "seats_max": 6,
                "x": round(0.62 + col * 0.16, 3),
                "y": round(0.14 + row * 0.11, 3),
            }
        )
    for i in range(1, 8):
        tables.append(
            {
                "id": f"t-teras-{i}",
                "zone": "teras",
                "label": f"T{i}",
                "seats_min": 2,
                "seats_max": 4,
                "x": round(0.58 + (i % 3) * 0.12, 3),
                "y": round(0.58 + (i // 3) * 0.1, 3),
            }
        )
    return normalize_layout(
        {
            "tables": tables,
            "pois": [{"id": "p-giris", "kind": "entrance", "label": "Giris", "x": 0.08, "y": 0.48}],
        }
    )


ATLAS_SOFRA_PUBLISHED_LAYOUT = build_atlas_sofra_floor_layout()
