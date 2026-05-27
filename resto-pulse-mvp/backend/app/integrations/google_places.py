from __future__ import annotations

import httpx

from app.core.config import settings

try:
    import certifi
except ImportError:
    certifi = None


class GooglePlacesClient:
    BASE_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    async def search_restaurants(self, query: str, location: str | None = None) -> dict:
        if not settings.google_places_api_key:
            raise ValueError("GOOGLE_PLACES_API_KEY is not configured.")

        params = {"query": query, "key": settings.google_places_api_key}
        if location:
            params["location"] = location

        verify = certifi.where() if certifi is not None else True
        if settings.environment == "development":
            verify = False

        async with httpx.AsyncClient(timeout=20, verify=verify) as client:
            response = await client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            return response.json()


def build_google_review_link(place_id: str) -> str:
    return f"https://search.google.com/local/writereview?placeid={place_id}"

