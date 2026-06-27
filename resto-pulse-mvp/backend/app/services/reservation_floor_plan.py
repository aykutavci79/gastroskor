"""Salon plani JSON — masa + POI dogrulama."""

from __future__ import annotations

from typing import Any
from uuid import uuid4

TABLE_ZONES = frozenset({"salon", "bahce", "teras"})
POI_KINDS = frozenset({"entrance", "exit", "live_music", "bar", "other"})
ZONES = frozenset({"salon", "bahce", "teras"})


class FloorPlanError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def _clamp01(value: Any) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError) as exc:
        raise FloorPlanError("Masa konumu gecersiz.") from exc
    if n < 0 or n > 1:
        raise FloorPlanError("Masa konumu 0–1 araliginda olmali.")
    return round(n, 4)


def empty_layout() -> dict[str, Any]:
    return {"version": 1, "tables": [], "pois": []}


def normalize_layout(raw: dict[str, Any] | None) -> dict[str, Any]:
    if not raw:
        return empty_layout()
    tables_in = raw.get("tables") if isinstance(raw.get("tables"), list) else []
    pois_in = raw.get("pois") if isinstance(raw.get("pois"), list) else []
    tables: list[dict[str, Any]] = []
    pois: list[dict[str, Any]] = []
    seen_table_ids: set[str] = set()

    for row in tables_in:
        if not isinstance(row, dict):
            raise FloorPlanError("Masa satiri gecersiz.")
        table_id = str(row.get("id") or "").strip() or str(uuid4())
        if table_id in seen_table_ids:
            raise FloorPlanError("Ayni masa kimligi iki kez kullanilamaz.")
        seen_table_ids.add(table_id)
        zone = str(row.get("zone") or "salon").strip().lower()
        if zone not in TABLE_ZONES:
            raise FloorPlanError("Masa bolgesi salon, bahce veya teras olmali.")
        label = str(row.get("label") or "").strip()[:40]
        if not label:
            raise FloorPlanError("Her masanin adi/numarasi olmali.")
        try:
            seats_min = int(row.get("seats_min") or row.get("seats") or 1)
            seats_max = int(row.get("seats_max") or row.get("seats") or seats_min)
        except (TypeError, ValueError) as exc:
            raise FloorPlanError("Kisi sayisi gecersiz.") from exc
        seats_min = max(1, seats_min)
        seats_max = max(seats_min, seats_max)
        tables.append(
            {
                "id": table_id,
                "zone": zone,
                "label": label,
                "seats_min": seats_min,
                "seats_max": seats_max,
                "x": _clamp01(row.get("x")),
                "y": _clamp01(row.get("y")),
            }
        )

    for row in pois_in:
        if not isinstance(row, dict):
            raise FloorPlanError("POI satiri gecersiz.")
        poi_id = str(row.get("id") or "").strip() or str(uuid4())
        kind = str(row.get("kind") or "other").strip().lower()
        if kind not in POI_KINDS:
            raise FloorPlanError("POI turu gecersiz.")
        label = str(row.get("label") or "").strip()[:60]
        if not label:
            raise FloorPlanError("POI etiketi zorunlu.")
        zone = str(row.get("zone") or "salon").strip().lower()
        if zone not in ZONES:
            zone = "salon"
        pois.append(
            {
                "id": poi_id,
                "kind": kind,
                "label": label,
                "zone": zone,
                "x": _clamp01(row.get("x")),
                "y": _clamp01(row.get("y")),
            }
        )

    return {"version": 1, "tables": tables, "pois": pois}


def find_table(layout: dict[str, Any], table_id: str) -> dict[str, Any] | None:
    for row in layout.get("tables") or []:
        if isinstance(row, dict) and str(row.get("id")) == table_id:
            return row
    return None


def zone_label_tr(zone: str) -> str:
    mapping = {"salon": "Salon", "bahce": "Bahce", "teras": "Teras"}
    return mapping.get(zone, zone)
