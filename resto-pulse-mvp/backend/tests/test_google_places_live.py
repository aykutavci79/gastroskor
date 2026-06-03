"""Google Places arama stratejisi."""

from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.google_places_live import GooglePlacesLiveClient, LivePlaceResult


@pytest.mark.asyncio
async def test_search_without_gps_uses_city_nearby_before_text() -> None:
    client = GooglePlacesLiveClient()
    nearby_row = LivePlaceResult(
        place_id="ChIJnear",
        name="Yakin Doner",
        formatted_address="Bursa",
        rating=4.6,
        user_ratings_total=50,
        latitude=40.19,
        longitude=29.06,
    )

    with (
        patch.object(client, "_nearby_search", new_callable=AsyncMock, return_value=[nearby_row]) as nearby,
        patch.object(client, "_text_search", new_callable=AsyncMock) as text,
        patch("app.integrations.google_places_live.settings.google_places_api_key", "test-key"),
    ):
        rows = await client.search_places("doner", city="Bursa", limit=20)

    assert len(rows) == 1
    assert rows[0].place_id == "ChIJnear"
    nearby.assert_awaited_once()
    text.assert_not_awaited()
