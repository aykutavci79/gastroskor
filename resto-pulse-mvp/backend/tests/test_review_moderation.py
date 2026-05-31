"""Review text moderation tests."""

from app.services.review_moderation import contains_prohibited_language, normalize_review_text


def test_normalize_strips_leet_speak() -> None:
    assert "amk" in normalize_review_text("4mK!")


def test_blocks_profanity() -> None:
    assert contains_prohibited_language("Yemek guzeldi amk") is True
    assert contains_prohibited_language("Harika bir deneyim, servis hizliydi.") is False


def test_blocks_insult_salakca() -> None:
    assert contains_prohibited_language("Salakça olmuş") is True
    assert contains_prohibited_language("Servis biraz yavaştı ama yemek iyiydi.") is False


def test_blocks_insult_aptalca() -> None:
    assert contains_prohibited_language("Aptalca olmuş") is True


def test_blocks_sik_gibi() -> None:
    assert contains_prohibited_language("sik gibi olmuş") is True
    assert contains_prohibited_language("Sik gibi bir tat") is True


def test_allows_sikinti() -> None:
    assert contains_prohibited_language("Serviste sıkıntı vardı ama yemek iyiydi.") is False


def test_blocks_spaced_evasion() -> None:
    assert contains_prohibited_language("a m k") is True
    assert contains_prohibited_language("s i k gibi") is True
