"""Google Geocoding — teslimat binasi koordinati (tek seferlik cache)."""

from __future__ import annotations

import httpx

from app.core.config import settings

try:
    import certifi
except ImportError:
    certifi = None


def _verify_ssl() -> bool | str:
    return certifi.where() if certifi is not None else True


def geocode_delivery_address(query: str) -> tuple[float, float] | None:
    api_key = (settings.google_places_api_key or "").strip()
    clean = (query or "").strip()
    if not api_key or len(clean) < 8:
        return None
    params = {
        "address": clean,
        "key": api_key,
        "region": "tr",
        "language": "tr",
    }
    timeout = max(5.0, settings.places_timeout_ms / 1000.0)
    with httpx.Client(timeout=timeout, verify=_verify_ssl()) as client:
        response = client.get("https://maps.googleapis.com/maps/api/geocode/json", params=params)
        response.raise_for_status()
        payload = response.json()
    if payload.get("status") not in {"OK", "ZERO_RESULTS"}:
        return None
    results = payload.get("results")
    if not isinstance(results, list) or not results:
        return None
    geometry = results[0].get("geometry", {}).get("location", {})
    try:
        lat = float(geometry["lat"])
        lng = float(geometry["lng"])
    except (KeyError, TypeError, ValueError):
        return None
    return lat, lng
