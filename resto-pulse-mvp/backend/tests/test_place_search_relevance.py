"""Sorgu-mekan alaka filtresi regresyon testleri (0.2a + yerel favori)."""

from app.constants.city_dish_favorites import venue_matches_local_favorite
from app.schemas.live_places import LivePlaceSearchItem
from app.services.place_search_relevance import (
    apply_place_relevance_filter,
    local_favorite_rank_key,
    resolve_place_relevance_intent,
    venue_matches_relevance_intent,
)


def _item(name: str, *, partner: bool = False, user_ratings_total: int | None = None) -> LivePlaceSearchItem:
    return LivePlaceSearchItem(
        place_id=name[:8].replace(" ", "_"),
        name=name,
        is_premium_partner=partner,
        user_ratings_total=user_ratings_total,
    )


def test_named_doner_search_skips_review_floor():
    items = [
        _item("TAŞKIN DÖNER", user_ratings_total=55),
        _item("Melike Döner", user_ratings_total=9591),
    ]
    result = apply_place_relevance_filter(items, query="taşkın döner", city="Bursa")
    assert result.mode == "negative_only"
    names = [row.name for row in result.items]
    assert any("TAŞKIN" in name for name in names)


def test_pure_doner_query_keeps_venues_without_review_floor():
    items = [
        _item("TAŞKIN DÖNER", user_ratings_total=55),
        _item("Melike Döner", user_ratings_total=9591),
    ]
    result = apply_place_relevance_filter(items, query="döner", city="Bursa")
    assert result.mode == "negative_only"
    assert len(result.items) == 2


def test_resolve_iskender_intent_from_en_iyi():
    intent = resolve_place_relevance_intent("en iyi iskender")
    assert intent is not None
    assert intent.search_group == "iskender"


def test_generic_kebap_intent_disables_filter():
    assert resolve_place_relevance_intent("Bursa kebap") is None


def test_iskender_drops_pideli_kofte_keeps_uludag_and_carsi():
    items = [
        _item("Bursa İskender Kebabı - İskender 1867"),
        _item("Öz Kayıhan Pideli köfte"),
        _item("Uludağ Kebapçısı Cemal & Cemil Usta"),
        _item("Tarihi Bursa Çarşı Kebapçısı"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert result.enabled is True
    assert result.fallback is False
    assert result.mode == "negative_only"
    names = [row.name for row in result.items]
    assert any("İskender 1867" in name for name in names)
    assert any("Uludağ" in name for name in names)
    assert any("Çarşı" in name for name in names)
    assert all("Pideli" not in name for name in names)


def test_iskender_drops_doner_venues():
    items = [
        _item("Uludağ Kebapçısı Cemal & Cemil Usta"),
        _item("KUŞKULAR DÖNER BURSA KEBABI"),
        _item("Bursa Döner Sofrası"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender kebap")
    names = [row.name for row in result.items]
    assert any("Uludağ" in name for name in names)
    assert all("Döner" not in name and "DONER" not in name.upper() for name in names)


def test_iskender_kebabi_keeps_local_favorites_without_iskender_in_name():
    items = [
        _item("Kebapçı Tamer"),
        _item("Öz Kayıhan Pideli köfte"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender kebabı")
    assert len(result.items) == 1
    assert "Tamer" in result.items[0].name


def test_lahmacun_keeps_lahmacuncu_drops_iskender_only():
    items = [
        _item("Antep Kuzu Lahmacun"),
        _item("Bursa İskender Kebabı - İskender 1867"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi lahmacun")
    assert len(result.items) == 1
    assert "Lahmacun" in result.items[0].name


def test_bursa_kebap_fail_open_no_filter():
    items = [
        _item("Öz Kayıhan Pideli köfte"),
        _item("Tarihi Bursa Çarşı Kebapçısı"),
    ]
    result = apply_place_relevance_filter(items, query="Bursa kebap")
    assert result.enabled is False
    assert len(result.items) == 2


def test_tepsi_kebap_drops_pideli_keeps_others():
    items = [
        _item("Yahyazade Tepsi Kebap"),
        _item("Öz Kayıhan Pideli köfte"),
        _item("Tarihi Yıldız Kebap"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi tepsi kebabı")
    assert result.enabled is True
    names = [row.name for row in result.items]
    assert any("Tepsi" in name for name in names)
    assert any("Yıldız" in name for name in names)
    assert all("Pideli" not in name for name in names)


def test_partner_not_exempt_from_relevance_filter():
    items = [
        _item("Öz Kayıhan Pideli köfte", partner=True),
        _item("Uludağ Kebapçısı Cemal & Cemil Usta"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert len(result.items) == 1
    assert "Uludağ" in result.items[0].name


def test_empty_after_filter_falls_back_to_original_list():
    items = [
        _item("Öz Kayıhan Pideli köfte"),
        _item("Mert Döner Pideli Köfte"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert result.fallback is True
    assert len(result.items) == 2
    assert result.dropped_count == 2


def test_uludag_matches_local_favorite_for_bursa_iskender():
    assert venue_matches_local_favorite(
        name="Uludağ Kebapçısı Cemal & Cemil Usta",
        city="Bursa",
        search_group="iskender",
    )


def test_local_favorite_rank_key_puts_uludag_before_generic_kebap():
    uludag = local_favorite_rank_key(
        name="Uludağ Kebapçısı Cemal & Cemil Usta",
        city="Bursa",
        search_group="iskender",
    )
    generic = local_favorite_rank_key(
        name="Tarihi Yıldız Kebap",
        city="Bursa",
        search_group="iskender",
    )
    assert uludag < generic


def test_konak_with_pideli_in_name_dropped_for_iskender():
    intent = resolve_place_relevance_intent("en iyi iskender")
    assert intent is not None
    assert venue_matches_relevance_intent(
        name="TARİHİ KONAK KEBAP (İskender Kebap/ Pideli Köfte)",
        intent=intent,
    ) is False
