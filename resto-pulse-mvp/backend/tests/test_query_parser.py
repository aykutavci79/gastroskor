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
