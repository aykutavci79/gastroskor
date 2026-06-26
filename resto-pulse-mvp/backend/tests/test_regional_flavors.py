from app.data.bursa_geo_products import find_product_by_slug
from app.services.regional_flavors import _label_matches_product, restaurant_serves_product
from types import SimpleNamespace


def test_label_matches_legacy_iskender_name():
    product = find_product_by_slug("bursa-doner-kebabi")
    assert product is not None
    assert _label_matches_product("Bursa Kebabı (İskender)", [product.name, *product.aliases])


def test_label_matches_partial_tokens():
    product = find_product_by_slug("kemalpasa-tatlisi")
    assert product is not None
    assert _label_matches_product("Kemalpaşa Tatlısı", [product.name, *product.aliases])


def test_restaurant_serves_product_with_geo_json():
    product = find_product_by_slug("bursa-cantik")
    assert product is not None
    restaurant = SimpleNamespace(
        has_geographical_indication=True,
        gi_product_name="Bursa Cantığı",
        geo_indications=[{"product": "Bursa Cantığı", "region": "Bursa"}],
    )
    assert restaurant_serves_product(restaurant, product)


def test_bursa_doner_label_does_not_match_cantik_product():
    product = find_product_by_slug("bursa-cantik")
    assert product is not None
    keys = [product.name, *product.aliases]
    assert not _label_matches_product("Bursa Döner Kebabı", keys)


def test_aci_dayi_cantik_label_matches_product():
    product = find_product_by_slug("bursa-cantik")
    assert product is not None
    restaurant = SimpleNamespace(
        has_geographical_indication=True,
        gi_product_name="Bursa Cantığı",
        geo_indications=[{"product": "Bursa Cantığı", "region": "Bursa"}],
    )
    assert restaurant_serves_product(restaurant, product)


def test_kebab_restaurant_does_not_serve_cantik():
    product = find_product_by_slug("bursa-cantik")
    assert product is not None
    restaurant = SimpleNamespace(
        has_geographical_indication=True,
        gi_product_name="Bursa Döner Kebabı",
        geo_indications=[{"product": "Bursa Döner Kebabı", "region": "Bursa"}],
    )
    assert not restaurant_serves_product(restaurant, product)


def test_regional_product_image_url_resolved():
    from app.services.regional_flavors import list_regional_products

    payload = list_regional_products(city="Bursa")
    cantik = next(item for item in payload["items"] if item["slug"] == "bursa-cantik")
    assert cantik["image_url"] == "https://www.gastroskor.com.tr/images/regional-flavors/bursa-cantik.jpeg"


def test_regional_product_includes_live_search_query():
    from app.services.regional_flavors import list_regional_products

    payload = list_regional_products(city="Bursa")
    cantik = next(item for item in payload["items"] if item["slug"] == "bursa-cantik")
    assert cantik["live_search_query"] == "Cantık"
    assert "restaurant_count" not in cantik


def test_discover_regional_product_returns_places(monkeypatch):
    import asyncio

    from app.schemas.live_places import LivePlaceSearchItem, LivePlaceSearchResponse, ParsedSearchIntent
    from app.services import regional_flavors

    async def fake_search(*_args, **_kwargs):
        return LivePlaceSearchResponse(
            items=[
                LivePlaceSearchItem(
                    place_id="p-low",
                    name="Low Score",
                    address="Bursa",
                    rating=4.0,
                    user_ratings_total=10,
                    latitude=40.19,
                    longitude=29.06,
                    distance_meters=1200,
                    distance_origin="city_center",
                    distance_score=0.4,
                    rating_score=0.6,
                    gastro_score=0.5,
                    maps_directions_url=None,
                ),
                LivePlaceSearchItem(
                    place_id="p-high",
                    name="High Score",
                    address="Bursa",
                    rating=4.8,
                    user_ratings_total=200,
                    latitude=40.19,
                    longitude=29.06,
                    distance_meters=800,
                    distance_origin="city_center",
                    distance_score=0.7,
                    rating_score=0.9,
                    gastro_score=0.92,
                    maps_directions_url=None,
                ),
            ],
            parsed=ParsedSearchIntent(raw_query="cantık", query="cantık"),
            filters_applied={},
        )

    monkeypatch.setattr(
        "app.services.live_place_search_service.search_live_places_optimized",
        fake_search,
    )

    payload = asyncio.run(
        regional_flavors.discover_regional_product_places(
            db=None,
            slug="bursa-cantik",
            city="Bursa",
            origin_lat=40.1885,
            origin_lng=29.061,
        )
    )
    assert payload is not None
    assert payload["product"]["slug"] == "bursa-cantik"
    assert payload["search_query"] == "Cantık"
    assert payload["places_count"] == 2
    assert {p["place_id"] for p in payload["places"]} == {"p-low", "p-high"}
    assert payload["places_error"] is None
