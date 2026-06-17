from app.constants.social_proof_product_intents import resolve_product_scan_intent


def test_adana_kebap_product_aliases():
    intent = resolve_product_scan_intent("meshur adana kebapcisi", city="Bursa")
    assert intent is not None
    assert intent.search_group == "adana-kebap"


def test_inegol_geo_products():
    assert resolve_product_scan_intent("en iyi inegol kofte", city="Bursa").search_group == "inegol-kofte"
    assert resolve_product_scan_intent("inegol piyazi", city="Bursa").search_group == "piyaz"


def test_brand_names_do_not_map_to_product_intent():
    assert resolve_product_scan_intent("mavi dukkan", city="Bursa") is None
    assert resolve_product_scan_intent("kebapci tamer", city="Bursa") is None


def test_generic_doner_stays_doner_not_iskender():
    intent = resolve_product_scan_intent("en iyi doner", city="Bursa")
    assert intent is not None
    assert intent.search_group == "doner"
