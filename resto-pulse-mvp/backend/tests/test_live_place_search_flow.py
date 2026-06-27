"""Canli arama akisi — query log ve Google filtreleme."""

from unittest.mock import AsyncMock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.integrations.google_places_live import LivePlaceResult
from app.services.google_place_catalog import persist_live_place_results
from app.models.entities import GooglePlaceCatalog, SearchQueryLog
from app.services.live_place_search_service import (
    _filter_new_google_rows,
    search_live_places_optimized,
)
from app.services.query_parser import parse_search_query
from app.services.search_query_log import record_google_search_fetch
from app.services.smart_filters import merge_criteria


@pytest.fixture(autouse=True)
def _skip_partner_lookup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.google_place_catalog._restaurant_id_for_place",
        lambda _db, _place_id: None,
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.partner_listings_by_google_place_ids",
        lambda _db, _ids: {},
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.batch_avg_ratings",
        lambda _db, _ids, visit_only=False: {},
    )
    monkeypatch.setattr(
        "app.services.restaurant_check_in.visitor_counts_for_restaurants",
        lambda _db, _ids: {},
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.read_place_search_cache",
        lambda _key: None,
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.write_place_search_cache",
        lambda _key, payload: payload,
    )


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    GooglePlaceCatalog.__table__.create(engine)
    SearchQueryLog.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def _place(place_id: str, name: str) -> LivePlaceResult:
    return LivePlaceResult(
        place_id=place_id,
        name=name,
        formatted_address="Bursa",
        rating=4.5,
        user_ratings_total=100,
        latitude=40.19,
        longitude=29.06,
        photo_reference=None,
    )


def test_filter_new_google_rows_excludes_known_ids() -> None:
    known = {"ChIJknown"}
    rows = [_place("ChIJknown", "A"), _place("ChIJnew", "B")]
    filtered = _filter_new_google_rows(rows, known)
    assert [row.place_id for row in filtered] == ["ChIJnew"]


@pytest.mark.asyncio
async def test_repeat_query_skips_google_when_query_log_covers_prefetch(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.live_place_search_service.search_catalog_places",
        lambda _db, **kwargs: [_place("ChIJone", "Durak"), _place("ChIJtwo", "Durak 2")],
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.search_restaurants_in_db",
        lambda *_args, **_kwargs: [],
    )
    google_mock = AsyncMock(return_value=[_place("ChIJthree", "Google Only")])
    monkeypatch.setattr(
        "app.services.live_place_search_service.google_client.search_places",
        google_mock,
    )

    record_google_search_fetch(db, query_key="durak", city_key="bursa", result_count=2)
    parsed = parse_search_query("durak")
    criteria = merge_criteria(parsed)

    result = await search_live_places_optimized(
        db,
        q="durak",
        city="Bursa",
        limit=10,
        origin_lat=None,
        origin_lng=None,
        criteria=criteria,
        parsed=parsed,
        distance_band=None,
        rating_band=None,
    )

    google_mock.assert_not_called()
    assert result.filters_applied.get("source") == "query_log"
    assert len(result.items) >= 2


@pytest.mark.asyncio
async def test_google_persists_only_new_catalog_rows(
    db: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    existing = _place("ChIJexisting", "Mevcut Mekan")
    persist_live_place_results(db, [existing], city="Bursa", source_query="ozel mekan")
    monkeypatch.setattr(
        "app.services.live_place_search_service.search_catalog_places",
        lambda _db, **kwargs: [existing],
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.search_restaurants_in_db",
        lambda *_args, **_kwargs: [],
    )
    google_mock = AsyncMock(
        return_value=[
            existing,
            _place("ChIJfresh", "Yeni Mekan"),
        ],
    )
    monkeypatch.setattr(
        "app.services.live_place_search_service.google_client.search_places",
        google_mock,
    )

    parsed = parse_search_query("ozel mekan")
    criteria = merge_criteria(parsed)
    await search_live_places_optimized(
        db,
        q="ozel mekan",
        city="Bursa",
        limit=10,
        origin_lat=None,
        origin_lng=None,
        criteria=criteria,
        parsed=parsed,
        distance_band=None,
        rating_band=None,
    )

    google_mock.assert_called_once()
    rows = db.query(GooglePlaceCatalog).all()
    assert len(rows) == 2
    names = {row.name for row in rows}
    assert names == {"Mevcut Mekan", "Yeni Mekan"}

    log = db.query(SearchQueryLog).one()
    assert log.result_count == 2
