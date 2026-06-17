"""Canli arama maliyet optimizasyonu."""

from app.schemas.live_places import LivePlaceSearchItem, ParsedSearchIntent
from app.services.live_place_search_service import _finalize_search_response
from app.services.place_search_cache import build_cache_key, read_place_search_cache, write_place_search_cache
from app.services.profanity_tr import normalize_review_text
from app.services.query_parser import parse_search_query
from app.services.smart_filters import merge_criteria


def test_cache_key_stable() -> None:
    a = build_cache_key(city_key="bursa", query_key=normalize_review_text("Durak muhallebi"))
    b = build_cache_key(city_key="bursa", query_key=normalize_review_text("durak muhallebi"))
    assert a == b


def test_cache_roundtrip(tmp_path, monkeypatch) -> None:
    from app.services import place_search_cache as mod

    monkeypatch.setattr(mod, "cache_dir", lambda: tmp_path)
    key = build_cache_key(city_key="bursa", query_key="durak")
    write_place_search_cache(
        key,
        {
            "items": [{"place_id": "ChIJtest", "name": "Test", "distance_origin": "city_center"}],
            "parsed": {
                "raw_query": "durak",
                "query": "durak",
                "min_rating": None,
                "max_distance_m": None,
                "min_distance_m": None,
                "removed_tokens": [],
            },
            "filters_applied": {"source": "db_only"},
        },
    )
    loaded = read_place_search_cache(key)
    assert loaded is not None
    assert loaded["items"][0]["place_id"] == "ChIJtest"


def test_cached_results_reapply_min_rating_filter() -> None:
    """Ayni metin cache'i: '4.5 yildiz' ile gelince dusuk puan elenmeli."""
    items = [
        LivePlaceSearchItem(
            place_id="low",
            name="Dusuk",
            address="",
            rating=3.7,
            user_ratings_total=3,
            distance_meters=654.0,
            distance_origin="user",
            gastro_score=4.0,
        ),
        LivePlaceSearchItem(
            place_id="high",
            name="Yuksek",
            address="",
            rating=4.8,
            user_ratings_total=100,
            distance_meters=2900.0,
            distance_origin="user",
            gastro_score=3.0,
        ),
    ]
    parsed = parse_search_query("kir pidesi 4.5 yildiz")
    criteria = merge_criteria(parsed)
    response = _finalize_search_response(
        items,
        criteria=criteria,
        limit=20,
        parsed_model=ParsedSearchIntent(
            raw_query="kir pidesi 4.5 yildiz",
            query=parsed.query,
            min_rating=parsed.min_rating,
            max_distance_m=None,
            min_distance_m=None,
            removed_tokens=parsed.removed_tokens,
        ),
        filters_applied={"min_rating": 4.5},
        search_query="kir pidesi 4.5 yildiz",
        city="Bursa",
    )
    assert len(response.items) == 1
    assert response.items[0].rating == 4.8


def test_empty_cache_items_not_used(tmp_path, monkeypatch) -> None:
    from app.services import place_search_cache as mod

    monkeypatch.setattr(mod, "cache_dir", lambda: tmp_path)
    key = build_cache_key(city_key="bursa", query_key="doner", origin_key="40.19,29.06")
    write_place_search_cache(
        key,
        {
            "items": [],
            "parsed": {"raw_query": "doner", "query": "doner", "min_rating": None},
            "filters_applied": {"source": "db_only"},
        },
    )
    loaded = read_place_search_cache(key)
    assert loaded is not None
    assert loaded.get("items") == []
