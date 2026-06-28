from app.constants.tester_online_restaurants import (
    BURSA_LAT,
    BURSA_LNG,
    TESTER_RESTAURANTS,
)
from app.services.seed_tester_online_restaurants import _place_id_for


def test_tester_restaurant_catalog_has_five_kitchens():
    keys = {row.key for row in TESTER_RESTAURANTS}
    assert keys == {"deneme-1", "deneme-2", "deneme-3", "deneme-4", "deneme-5"}
    kebap_count = sum(1 for row in TESTER_RESTAURANTS if "kebap-izgara" in row.online_order_categories)
    assert kebap_count == 2


def test_tester_restaurants_cover_requested_concepts():
    by_key = {row.key: row for row in TESTER_RESTAURANTS}
    assert "tatli-tuzlu" in by_key["deneme-1"].online_order_categories
    assert {"kebap-izgara", "firin"} <= set(by_key["deneme-2"].online_order_categories)
    assert {"kebap-izgara", "firin"} <= set(by_key["deneme-3"].online_order_categories)
    assert "ev-yemekleri" in by_key["deneme-4"].online_order_categories
    assert "burger" in by_key["deneme-5"].online_order_categories


def test_tester_restaurants_have_menus_prices_and_ratings():
    for row in TESTER_RESTAURANTS:
        if len(row.menu) == 0:
            assert row.google_rating >= 3.0
            assert row.review_count > 0
            continue
        assert len(row.menu) >= 5
        assert row.google_rating >= 3.0
        assert row.review_count > 0
        assert all(item.price_tl > 0 for item in row.menu)
        assert BURSA_LAT + row.lat_offset != BURSA_LNG + row.lng_offset


def test_atlas_sofra_showcase_is_deneme_2():
    by_key = {row.key: row for row in TESTER_RESTAURANTS}
    row = by_key["deneme-2"]
    assert row.name == "Atlas Sofra (test)"
    assert len(row.menu) == 0
    assert len(row.showcase_gallery_urls) == 6
    assert row.enable_online_reservations is True


def test_place_ids_are_stable():
    assert _place_id_for(TESTER_RESTAURANTS[0]) == "gastro-tester-deneme-1"
    assert len({_place_id_for(row) for row in TESTER_RESTAURANTS}) == 5
