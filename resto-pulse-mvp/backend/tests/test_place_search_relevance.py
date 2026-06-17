"""Sorgu-mekan alaka filtresi regresyon testleri (0.2a)."""

from app.schemas.live_places import LivePlaceSearchItem
from app.services.place_search_relevance import apply_place_relevance_filter, resolve_place_relevance_intent


def _item(name: str, *, partner: bool = False) -> LivePlaceSearchItem:
    return LivePlaceSearchItem(
        place_id=name[:8].replace(" ", "_"),
        name=name,
        is_premium_partner=partner,
    )


def test_resolve_iskender_intent_from_en_iyi():
    intent = resolve_place_relevance_intent("en iyi iskender")
    assert intent is not None
    assert intent.search_group == "iskender"
    assert "iskender" in intent.allowed_slugs
    assert "kebap" not in intent.allowed_slugs


def test_generic_kebap_intent_disables_filter():
    assert resolve_place_relevance_intent("Bursa kebap") is None


def test_iskender_drops_pideli_kofte_keeps_iskender_1867():
    items = [
        _item("Bursa İskender Kebabı - İskender 1867"),
        _item("Öz Kayıhan Pideli köfte"),
        _item("Tarihi Bursa Çarşı Kebapçısı"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert result.enabled is True
    assert result.fallback is False
    names = [row.name for row in result.items]
    assert any("İskender 1867" in name for name in names)
    assert all("Pideli" not in name for name in names)
    assert all("Çarşı" not in name for name in names)


def test_iskender_kebabi_query_same_behavior():
    items = [
        _item("Bursa İskender Kebabı - İskender 1867"),
        _item("Öz Kayıhan Pideli köfte"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender kebabı")
    assert len(result.items) == 1
    assert "İskender 1867" in result.items[0].name


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


def test_tepsi_kebap_keeps_matching_venue():
    items = [
        _item("Yahyazade Tepsi Kebap"),
        _item("Öz Kayıhan Pideli köfte"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi tepsi kebabı")
    assert result.enabled is True
    assert len(result.items) == 1
    assert "Tepsi" in result.items[0].name


def test_partner_not_exempt_from_relevance_filter():
    items = [
        _item("Öz Kayıhan Pideli köfte", partner=True),
        _item("Bursa İskender Kebabı - İskender 1867"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert len(result.items) == 1
    assert "İskender" in result.items[0].name


def test_empty_after_filter_falls_back_to_original_list():
    items = [
        _item("Öz Kayıhan Pideli köfte"),
        _item("Mert Döner Pideli Köfte"),
    ]
    result = apply_place_relevance_filter(items, query="en iyi iskender")
    assert result.fallback is True
    assert len(result.items) == 2
    assert result.dropped_count == 2
