"""Google place catalog — kalici arama havuzu."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.integrations.google_places_live import LivePlaceResult
from app.models.entities import GooglePlaceCatalog
from app.services.google_place_catalog import (
    count_catalog_places,
    persist_live_place_results,
    search_catalog_places,
)


@pytest.fixture(autouse=True)
def _skip_partner_lookup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "app.services.google_place_catalog._restaurant_id_for_place",
        lambda _db, _place_id: None,
    )


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    GooglePlaceCatalog.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_persist_and_search_catalog(db: Session) -> None:
    rows = [
        LivePlaceResult(
            place_id="ChIJlahmacun",
            name="Ozkanlar Kebap ve Pide",
            formatted_address="Bursa",
            rating=4.3,
            user_ratings_total=170,
            latitude=40.19,
            longitude=29.06,
            photo_reference="photo1",
        ),
        LivePlaceResult(
            place_id="ChIJdoner",
            name="Yeni Donerci",
            formatted_address="Bursa",
            rating=4.5,
            user_ratings_total=29,
            latitude=40.20,
            longitude=29.07,
            photo_reference=None,
        ),
    ]
    saved = persist_live_place_results(db, [rows[0]], city="Bursa", source_query="lahmacun")
    persist_live_place_results(db, [rows[1]], city="Bursa", source_query="doner")
    assert saved == 1
    assert count_catalog_places(db, city="Bursa") == 2

    lahmacun_hits = search_catalog_places(db, query="lahmacun", city="Bursa", limit=10)
    assert len(lahmacun_hits) == 1
    assert lahmacun_hits[0].place_id == "ChIJlahmacun"

    saved_again = persist_live_place_results(db, rows[:1], city="Bursa", source_query="lahmacun")
    assert saved_again == 1
    assert count_catalog_places(db, city="Bursa") == 2


def test_upsert_updates_rating(db: Session) -> None:
    place = LivePlaceResult(
        place_id="ChIJupdate",
        name="Test Lokanta",
        formatted_address="Bursa",
        rating=4.0,
        user_ratings_total=10,
        latitude=40.19,
        longitude=29.06,
        photo_reference=None,
    )
    persist_live_place_results(db, [place], city="Bursa", source_query="test")
    place.rating = 4.6
    place.user_ratings_total = 20
    persist_live_place_results(db, [place], city="Bursa", source_query="test")

    hits = search_catalog_places(db, query="Test", city="Bursa", limit=5)
    assert len(hits) == 1
    assert hits[0].rating == 4.6
    assert hits[0].user_ratings_total == 20
