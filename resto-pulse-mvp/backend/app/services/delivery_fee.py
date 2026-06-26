"""Mesafe baremine gore getirme ucreti — panel tier'lari gelene kadar platform varsayilani."""

from __future__ import annotations

from typing import Any

# Gecici varsayilan barem; panelden ownership.delivery_fee_tiers ile override edilecek.
DEFAULT_DELIVERY_FEE_TIERS: list[dict[str, float]] = [
    {"max_km": 2.0, "fee_tl": 35.0},
    {"max_km": 5.0, "fee_tl": 50.0},
    {"max_km": 8.0, "fee_tl": 75.0},
    {"max_km": 12.0, "fee_tl": 95.0},
]


def normalize_delivery_fee_tiers(raw: Any) -> list[dict[str, float]] | None:
    if not isinstance(raw, list) or not raw:
        return None
    tiers: list[dict[str, float]] = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        try:
            max_km = float(row.get("max_km"))
            fee_tl = float(row.get("fee_tl"))
        except (TypeError, ValueError):
            continue
        if max_km <= 0 or fee_tl < 0:
            continue
        tiers.append({"max_km": max_km, "fee_tl": fee_tl})
    if not tiers:
        return None
    tiers.sort(key=lambda item: item["max_km"])
    return tiers


def resolve_delivery_fee_tl(
    distance_meters: float | None,
    *,
    tiers: list[dict[str, float]] | None = None,
) -> int | None:
    if distance_meters is None:
        return None
    active = tiers or DEFAULT_DELIVERY_FEE_TIERS
    if not active:
        return None
    km = max(0.0, distance_meters / 1000.0)
    for tier in sorted(active, key=lambda item: item["max_km"]):
        if km <= tier["max_km"]:
            return int(round(tier["fee_tl"]))
    return int(round(active[-1]["fee_tl"]))
