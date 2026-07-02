"""Tradres public adres hiyerarsisi — il / ilce / mahalle / sokak / kapı no."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from app.core.config import settings

try:
    import certifi
except ImportError:
    certifi = None

TRADRES_BASE_DEFAULT = "https://api.tradres.com.tr/public/v1/catalog/providers/localsqlite"
TRADRES_BASE_FALLBACK = "https://tradres.com.tr/public/v1/catalog/providers/localsqlite"
BUILDING_LEVELS = frozenset(
    {
        "building",
        "buildingnumber",
        "doornumber",
        "outerdoor",
        "numarataj",
        "kapino",
        "doorno",
    }
)


@dataclass(frozen=True)
class TradresNode:
    id: int
    name: str
    level: str
    parent_id: int | None


def _verify_ssl() -> bool | str:
    return certifi.where() if certifi is not None else True


def _parse_node(row: dict[str, Any]) -> TradresNode | None:
    try:
        node_id = int(row["id"])
        name = str(row.get("name") or "").strip()
        level = str(row.get("level") or "").strip()
    except (KeyError, TypeError, ValueError):
        return None
    if not name:
        return None
    parent_raw = row.get("parentId")
    parent_id = int(parent_raw) if parent_raw is not None else None
    return TradresNode(id=node_id, name=name, level=level, parent_id=parent_id)


def is_building_level(level: str) -> bool:
    return level.strip().lower().replace(" ", "") in BUILDING_LEVELS or level.strip().lower() in {
        "building",
        "building number",
        "door number",
    }


def _tradres_bases() -> list[str]:
    override = (getattr(settings, "tradres_base_url", None) or "").strip().rstrip("/")
    if override:
        return [override]
    return [TRADRES_BASE_DEFAULT, TRADRES_BASE_FALLBACK]


def fetch_tradres_children(*, parent_id: int | None = None) -> list[TradresNode]:
    params: dict[str, str | int] = {}
    if parent_id is not None:
        params["parentId"] = parent_id
    headers: dict[str, str] = {}
    api_key = (settings.tradres_api_key or "").strip()
    if api_key:
        headers["X-Api-Key"] = api_key
    timeout = max(5.0, settings.places_timeout_ms / 1000.0)
    last_exc: Exception | None = None
    payload: object | None = None
    for base in _tradres_bases():
        url = f"{base}/nodes"
        try:
            with httpx.Client(timeout=timeout, verify=_verify_ssl()) as client:
                response = client.get(url, params=params, headers=headers)
                response.raise_for_status()
                payload = response.json()
                break
        except Exception as exc:
            last_exc = exc
            continue
    if payload is None:
        host = _tradres_bases()[0].split("/")[2]
        hint = (
            f"Tradres API'ye baglanilamadi ({host}:443). "
            "Ag/VPN/firewall veya TRADRES_API_KEY kontrol et."
        )
        raise ConnectionError(hint) from last_exc
    if not isinstance(payload, list):
        return []
    nodes: list[TradresNode] = []
    for row in payload:
        if not isinstance(row, dict):
            continue
        parsed = _parse_node(row)
        if parsed:
            nodes.append(parsed)
    nodes.sort(key=lambda item: item.name.casefold())
    return nodes
