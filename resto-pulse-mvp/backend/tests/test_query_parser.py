"""Dogal dil arama ayrıştırma."""

from app.services.query_parser import parse_search_query


def test_min_rating_with_yildiz() -> None:
    parsed = parse_search_query("kır pidesi 4.5 yıldız")
    assert parsed.min_rating == 4.5
    assert "yıldız" not in parsed.query.lower() or parsed.query.strip() == "kır pidesi"


def test_min_rating_plus_suffix() -> None:
    parsed = parse_search_query("lahmacun 4.5+")
    assert parsed.min_rating == 4.5
    assert "lahmacun" in parsed.query


def test_voice_boilerplate_satan_restoranlari_sirala() -> None:
    parsed = parse_search_query("lahmacun satan restoranları sıralar.")
    assert parsed.query == "lahmacun"


def test_voice_boilerplate_doner_siralan() -> None:
    parsed = parse_search_query("döner satan restoranları sıralan")
    assert parsed.query == "döner"


def test_voice_boilerplate_cantik() -> None:
    parsed = parse_search_query("cantık satan restoranları sıralar.")
    assert parsed.query == "cantık"


def test_spoken_rating_dort_yildiz_ustu_restoranlari() -> None:
    parsed = parse_search_query("dört yıldız üstü restoranları sıralan")
    assert parsed.min_rating == 4.0
    assert parsed.query == "restoran"


def test_spoken_rating_dort_bucuk_yildiz() -> None:
    parsed = parse_search_query("dört buçuk yıldız üstü kebap")
    assert parsed.min_rating == 4.5
    assert parsed.query == "kebap"
