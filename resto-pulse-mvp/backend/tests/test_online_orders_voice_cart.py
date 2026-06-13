from types import SimpleNamespace

from app.constants.voice_product_catalog import resolve_voice_search_token
from app.services.voice_menu_offerings import voice_menu_matches_for_ownership


def test_resolve_voice_products_groups_union():
    _, lahmacun_slugs = resolve_voice_search_token("lahmacun")
    _, ayran_slugs = resolve_voice_search_token("ayran")
    assert "lahmacun" in lahmacun_slugs
    assert "ayran" in ayran_slugs


def test_voice_menu_matches_adana_group_accepts_generic_kebap():
    ownership = SimpleNamespace(
        menu_items=[
            SimpleNamespace(
                id="1",
                voice_product_slug="kebap",
                name="Kebap",
                price_tl=250,
                is_active=True,
            ),
            SimpleNamespace(
                id="2",
                voice_product_slug="lahmacun",
                name="Lahmacun",
                price_tl=95,
                is_active=True,
            ),
            SimpleNamespace(
                id="3",
                voice_product_slug="kola",
                name="Kola",
                price_tl=45,
                is_active=True,
            ),
        ]
    )
    _, adana_slugs = resolve_voice_search_token("adana-kebap")
    _, lahmacun_slugs = resolve_voice_search_token("lahmacun")
    _, kola_slugs = resolve_voice_search_token("kola")
    assert "kebap" in adana_slugs
    all_slugs = set(adana_slugs) | set(lahmacun_slugs) | set(kola_slugs)
    matches = voice_menu_matches_for_ownership(ownership, product_slugs=all_slugs)
    assert len(matches) == 3
    group_map = {
        "adana-kebap": set(adana_slugs),
        "lahmacun": set(lahmacun_slugs),
        "kola": set(kola_slugs),
    }
    for slugs in group_map.values():
        assert any(row["voice_product_slug"] in slugs for row in matches)


def test_voice_menu_matches_multi_group_filter():
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
                voice_product_slug="ayran",
                name="Ayran",
                price_tl=25,
                is_active=True,
            ),
        ]
    )
    lahmacun_token, lahmacun_slugs = resolve_voice_search_token("lahmacun")
    _, ayran_slugs = resolve_voice_search_token("ayran")
    all_slugs = set(lahmacun_slugs) | set(ayran_slugs)
    matches = voice_menu_matches_for_ownership(ownership, product_slugs=all_slugs)
    assert len(matches) == 2
    assert any(row["voice_product_slug"] in lahmacun_slugs for row in matches)
    assert any(row["voice_product_slug"] in ayran_slugs for row in matches)
    assert lahmacun_token == "lahmacun"
