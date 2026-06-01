"""Canli arama maliyet optimizasyonu."""

from app.services.place_search_cache import build_cache_key, read_place_search_cache, write_place_search_cache
from app.services.profanity_tr import normalize_review_text


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
