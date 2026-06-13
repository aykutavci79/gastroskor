"""Live search metrics — sorgu gruplama ve kaynak istatistikleri."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.models.entities import GooglePlaceCatalog
from app.services.google_place_catalog import build_catalog_stats
from app.services.live_search_metrics import (
    build_live_search_source_stats,
    normalize_catalog_source_query,
)


@pytest.fixture()
def db() -> Session:
    engine = create_engine("sqlite:///:memory:")
    GooglePlaceCatalog.__table__.create(engine)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_normalize_catalog_source_query_groups_kebap_variants() -> None:
    assert normalize_catalog_source_query("iskender kebap") == "iskender"
    assert normalize_catalog_source_query("iskender") == "iskender"
    assert normalize_catalog_source_query("Lahmacun ara") == "lahmacun"


def test_build_live_search_source_stats(monkeypatch: pytest.MonkeyPatch) -> None:
    class FakeRow:
        def __init__(self, metadata):
            self.metadata_json = metadata

    fake_rows = [
        FakeRow({"source": "cache", "google_called": False, "google_free": True, "query_group": "lahmacun"}),
        FakeRow({"source": "db_only", "google_called": False, "google_free": True, "query_group": "iskender"}),
        FakeRow({"source": "db_and_google", "google_called": True, "google_free": False, "query_group": "iskender"}),
    ]

    class FakeDb:
        def scalars(self, _stmt):
            class Result:
                def all(inner_self):
                    return [row.metadata_json for row in fake_rows]

            return Result()

    stats = build_live_search_source_stats(FakeDb(), days=30)  # type: ignore[arg-type]
    assert stats["tracked_searches"] == 3
    assert stats["file_cache_hits"] == 1
    assert stats["google_api_calls"] == 1
    assert stats["google_free_searches"] == 2
    assert stats["google_free_rate_pct"] == pytest.approx(66.7, rel=0.1)
    assert stats["file_cache_hit_rate_pct"] == pytest.approx(33.3, rel=0.1)
    assert stats["top_query_groups"][0]["query"] == "iskender"
    assert stats["top_query_groups"][0]["count"] == 2


def test_build_catalog_stats_groups_queries(db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.integrations.google_places_live import LivePlaceResult
    from app.services.google_place_catalog import persist_live_place_results

    monkeypatch.setattr(
        "app.services.google_place_catalog.build_live_search_source_stats",
        lambda *_args, **_kwargs: {
            "period_days": 30,
            "total_live_searches": 0,
            "tracked_searches": 0,
            "file_cache_hits": 0,
            "google_api_calls": 0,
            "google_free_searches": 0,
            "file_cache_hit_rate_pct": None,
            "google_free_rate_pct": None,
            "by_source": [],
        },
    )

    monkeypatch.setattr(
        "app.services.google_place_catalog._restaurant_id_for_place",
        lambda _db, _place_id: None,
    )

    rows = [
        LivePlaceResult(
            place_id="ChIJ1",
            name="Iskenderci",
            formatted_address="Bursa",
            rating=4.5,
            user_ratings_total=100,
            latitude=40.19,
            longitude=29.06,
            photo_reference=None,
        ),
        LivePlaceResult(
            place_id="ChIJ1b",
            name="Iskenderci B",
            formatted_address="Bursa",
            rating=4.3,
            user_ratings_total=90,
            latitude=40.191,
            longitude=29.061,
            photo_reference=None,
        ),
        LivePlaceResult(
            place_id="ChIJ2",
            name="Urfa Kebap",
            formatted_address="Bursa",
            rating=4.4,
            user_ratings_total=80,
            latitude=40.20,
            longitude=29.07,
            photo_reference=None,
        ),
    ]
    persist_live_place_results(db, [rows[0]], city="Bursa", source_query="iskender")
    persist_live_place_results(db, [rows[1]], city="Bursa", source_query="iskender kebap")
    persist_live_place_results(db, [rows[2]], city="Bursa", source_query="urfa kebap")

    stats = build_catalog_stats(db, top_queries_limit=5)
    query_map = {row["query"]: row["count"] for row in stats["top_queries"]}
    assert query_map.get("iskender") == 2
    assert query_map.get("urfa") == 1
    assert "search_performance" in stats
