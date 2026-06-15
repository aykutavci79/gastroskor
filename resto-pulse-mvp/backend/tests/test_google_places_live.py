"""Google Places arama stratejisi."""

from unittest.mock import AsyncMock, patch

import pytest

from app.integrations.google_places_live import (
    GooglePlacesLiveClient,
    LivePlaceResult,
    prefers_open_text_search,
    resolve_google_nearby_place_type,
)


def test_resolve_nearby_type_for_pastane() -> None:
    assert resolve_google_nearby_place_type("rojen pastane") == "bakery"
    assert resolve_google_nearby_place_type("doner") == "restaurant"
    assert resolve_google_nearby_place_type("kahve") == "cafe"


def test_prefers_open_text_for_named_pastane() -> None:
    assert prefers_open_text_search("rojen pastanesi")
    assert prefers_open_text_search("baklava")
    assert not prefers_open_text_search("doner")


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


@pytest.mark.asyncio
async def test_pastane_search_uses_open_text_first() -> None:
    client = GooglePlacesLiveClient()
    pastane_row = LivePlaceResult(
        place_id="ChIJrojen",
        name="Rojen Pastanesi",
        formatted_address="Bursa",
        rating=4.4,
        user_ratings_total=120,
        latitude=40.2,
        longitude=29.05,
        types=("bakery", "food", "point_of_interest", "establishment"),
    )

    with (
        patch.object(client, "_text_search", new_callable=AsyncMock, return_value=[pastane_row]) as text,
        patch.object(client, "_nearby_search", new_callable=AsyncMock) as nearby,
        patch("app.integrations.google_places_live.settings.google_places_api_key", "test-key"),
    ):
        rows = await client.search_places("rojen pastane", city="Bursa", limit=8)

    assert len(rows) == 1
    assert rows[0].name == "Rojen Pastanesi"
    text.assert_awaited_once()
    nearby.assert_not_awaited()
    assert text.await_args.kwargs.get("place_type") is None
