from __future__ import annotations

import re

import httpx

from app.core.config import settings

FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"
BURSA_BIAS = "circle:25000@40.1885,29.0610"


def find_google_place_id(query: str) -> str | None:
    """Resolve a Google Place ID (ChIJ...) via Places API Find Place."""
    if not settings.google_places_api_key:
        return None

    params = {
        "input": query,
        "inputtype": "textquery",
        "fields": "place_id,name,formatted_address",
        "locationbias": BURSA_BIAS,
        "key": settings.google_places_api_key,
    }

    with httpx.Client(timeout=20) as client:
        response = client.get(FIND_PLACE_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    status = payload.get("status")
    if status != "OK":
        return None

    candidates = payload.get("candidates") or []
    if not candidates:
        return None

    return candidates[0].get("place_id")


def resolve_maps_short_url(maps_url: str) -> str | None:
    """Follow a maps.app.goo.gl link and return ChIJ or 0x feature id from the final URL."""
    with httpx.Client(
        follow_redirects=True,
        verify=False,
        timeout=20,
        headers={"User-Agent": "GastroSkor-Seed/1.0"},
    ) as client:
        response = client.get(maps_url)
        final_url = str(response.url)
        html = response.text

    chij = re.findall(r"ChIJ[A-Za-z0-9_-]{20,45}", html)
    for candidate in chij:
        if 20 <= len(candidate) <= 45:
            return candidate

    hex_match = re.search(r"!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)", final_url)
    if hex_match:
        return hex_match.group(1)

    return None
