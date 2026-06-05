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


def test_regional_product_includes_live_search_query():
    from app.services.regional_flavors import list_regional_products

    payload = list_regional_products(city="Bursa")
    cantik = next(item for item in payload["items"] if item["slug"] == "bursa-cantik")
    assert cantik["live_search_query"] == "cantık"
    assert "restaurant_count" not in cantik
