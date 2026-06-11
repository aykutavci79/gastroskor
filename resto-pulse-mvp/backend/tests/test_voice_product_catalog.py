from types import SimpleNamespace

from app.constants.voice_product_catalog import resolve_voice_search_token
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


def test_resolve_specific_product_alias():
    token, slugs = resolve_voice_search_token("kusbasili cantik")
    assert token == "cantik"
    assert set(slugs) == {"cantik-kiymali", "cantik-kusbasili"}


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
