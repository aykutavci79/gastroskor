from types import SimpleNamespace

from app.constants.voice_product_catalog import resolve_voice_search_token, infer_voice_product_slug_from_menu_name
from app.services.voice_menu_offerings import (
    list_voice_offerings_state,
    ownership_sells_voice_products,
    voice_menu_matches_for_ownership,
)


def test_resolve_lahmacun_group_includes_both_variants():
    token, slugs = resolve_voice_search_token("lahmacun")
    assert token == "lahmacun"
    assert set(slugs) == {"lahmacun", "acili-lahmacun"}


def test_resolve_cantik_group_includes_both_variants():
    token, slugs = resolve_voice_search_token("cantik")
    assert token == "cantik"
    assert set(slugs) == {"cantik-kiymali", "cantik-kusbasili"}


def test_resolve_cantik_with_turkish_dotless_i():
    token, slugs = resolve_voice_search_token("cantık")
    assert token == "cantik"
    assert set(slugs) == {"cantik-kiymali", "cantik-kusbasili"}


def test_resolve_sutlac_with_turkish_chars():
    token, slugs = resolve_voice_search_token("sütlaç")
    assert token == "sutlac"
    assert slugs == ["sutlac"]


def test_resolve_sutlac_ascii():
    token, slugs = resolve_voice_search_token("sutlac")
    assert token == "sutlac"
    assert slugs == ["sutlac"]


def test_resolve_borek_with_turkish_chars():
    token, slugs = resolve_voice_search_token("börek")
    assert token == "borek"
    assert slugs == ["borek"]


def test_resolve_borek_ascii():
    token, slugs = resolve_voice_search_token("borek")
    assert token == "borek"
    assert slugs == ["borek"]


def test_resolve_specific_product_alias():
    token, slugs = resolve_voice_search_token("kusbasili cantik")
    assert token == "cantik"
    assert set(slugs) == {"cantik-kiymali", "cantik-kusbasili"}


def test_resolve_kebap_expands_to_grill_variants():
    token, slugs = resolve_voice_search_token("kebap")
    assert token == "kebap"
    assert "kebap" in slugs
    assert "adana-kebap" in slugs
    assert "urfa-kebap" in slugs
    assert "iskender" in slugs


def test_resolve_adana_kebap_includes_generic_kebap():
    token, slugs = resolve_voice_search_token("adana-kebap")
    assert token == "adana-kebap"
    assert "adana-kebap" in slugs
    assert "kebap" in slugs
    assert "urfa-kebap" not in slugs


def test_voice_menu_matches_respect_price_max():
    ownership = SimpleNamespace(
        menu_items=[
            SimpleNamespace(
                id="1",
                voice_product_slug="lahmacun",
                name="Lahmacun",
                price_tl=120,
                is_active=True,
            ),
            SimpleNamespace(
                id="2",
                voice_product_slug="acili-lahmacun",
                name="Acili Lahmacun",
                price_tl=180,
                is_active=True,
            ),
        ]
    )
    matches = voice_menu_matches_for_ownership(
        ownership,
        product_slugs={"lahmacun", "acili-lahmacun"},
        price_max=150,
    )
    assert len(matches) == 1
    assert matches[0]["voice_product_slug"] == "lahmacun"
    assert ownership_sells_voice_products(
        ownership,
        product_slugs={"lahmacun", "acili-lahmacun"},
        price_max=150,
    )


def test_infer_lahmacun_slug_from_menu_name():
    assert infer_voice_product_slug_from_menu_name("Lahmacun") == "lahmacun"
    assert infer_voice_product_slug_from_menu_name("Acili Lahmacun") == "acili-lahmacun"


def test_resolve_voice_search_token_substring_phrase():
    token, slugs = resolve_voice_search_token("online siparis 150 tl lahmacun")
    assert token == "lahmacun"
    assert "lahmacun" in slugs


def test_voice_menu_matches_infers_slug_from_menu_name():
    ownership = SimpleNamespace(
        menu_items=[
            SimpleNamespace(
                id="1",
                voice_product_slug=None,
                name="Lahmacun",
                price_tl=120,
                is_active=True,
            ),
        ]
    )
    matches = voice_menu_matches_for_ownership(
        ownership,
        product_slugs={"lahmacun", "acili-lahmacun"},
    )
    assert len(matches) == 1
    assert matches[0]["voice_product_slug"] == "lahmacun"


def test_list_voice_offerings_state_marks_enabled_rows():
    ownership = SimpleNamespace(
        menu_items=[
            SimpleNamespace(
                id="x",
                voice_product_slug="cantik-kiymali",
                name="Kiymali Canti",
                price_tl=140,
                is_active=True,
            )
        ]
    )
    rows = {row["slug"]: row for row in list_voice_offerings_state(ownership)}
    assert rows["cantik-kiymali"]["enabled"] is True
    assert rows["cantik-kiymali"]["price_tl"] == 140
    assert rows["cantik-kusbasili"]["enabled"] is False
