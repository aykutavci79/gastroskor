from __future__ import annotations

from urllib.parse import quote


def build_google_maps_directions_url(
    *,
    place_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    query: str | None = None,
) -> str | None:
    """
    Google Maps yol tarifi (Directions) URL.
    origin verilmezse cihazin mevcut konumundan baslar.
    https://developers.google.com/maps/documentation/urls/get-started#directions-action
    """
    params: list[str] = ["api=1", "travelmode=driving"]

    if place_id:
        if query:
            params.append(f"destination={quote(query)}")
        params.append(f"destination_place_id={quote(place_id, safe='')}")
        return f"https://www.google.com/maps/dir/?{'&'.join(params)}"

    if latitude is not None and longitude is not None:
        params.append(f"destination={latitude},{longitude}")
        return f"https://www.google.com/maps/dir/?{'&'.join(params)}"

    if query:
        params.append(f"destination={quote(query)}")
        return f"https://www.google.com/maps/dir/?{'&'.join(params)}"

    return None


def build_destination_label(
    *,
    name: str | None = None,
    address: str | None = None,
    city: str | None = None,
) -> str | None:
    parts = [part for part in (name, address, city) if part]
    if not parts:
        return None
    return ", ".join(parts)


def build_google_maps_search_url(
    *,
    place_id: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    query: str | None = None,
) -> str | None:
    if place_id:
        return (
            "https://www.google.com/maps/search/?api=1"
            f"&query=Google&query_place_id={quote(place_id, safe='')}"
        )
    if latitude is not None and longitude is not None:
        return (
            "https://www.google.com/maps/search/?api=1"
            f"&query={latitude},{longitude}"
        )
    if query:
        return f"https://www.google.com/maps/search/?api=1&query={quote(query)}"
    return None
