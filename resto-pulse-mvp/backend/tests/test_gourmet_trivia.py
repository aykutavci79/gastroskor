"""Gurme BilBakalim trivia botu."""

from app.services.gourmet_trivia import answer_matches, normalize_guess


def test_answer_matches_exact():
    assert answer_matches("iskender", ["iskender", "iskender kebap"])


def test_answer_matches_turkish_fold():
    assert answer_matches("Kemalpaşa", ["kemalpaşa", "kemalpasa"])


def test_answer_matches_contains():
    assert answer_matches("bursa iskender", ["iskender"])


def test_answer_matches_rejects_short():
    assert not answer_matches("a", ["iskender"])


def test_normalize_guess():
    assert normalize_guess("  iskender! ") == "iskender"
