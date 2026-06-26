"""81 il GPS cozumleme testleri."""

from app.data.turkiye_province_geo import resolve_province_from_coords, resolve_province_name
from app.services.city_resolver import resolve_city_from_coords, resolve_city_name


def test_gaziantep_center_resolves() -> None:
    row = resolve_province_from_coords(37.0662, 37.3833)
    assert row["name"] == "Gaziantep"


def test_resolve_city_from_coords_gaziantep() -> None:
    assert resolve_city_from_coords(37.0662, 37.3833) == "Gaziantep"


def test_ascii_istanbul_alias() -> None:
    row = resolve_province_name("Istanbul")
    assert row is not None
    assert row["name"] == "İstanbul"
    assert resolve_city_name("Istanbul") == "İstanbul"


def test_city_search_bias_has_gaziantep() -> None:
    from app.integrations.google_places_live import CITY_SEARCH_BIAS

    assert "gaziantep" in CITY_SEARCH_BIAS
    assert len(CITY_SEARCH_BIAS) >= 81
