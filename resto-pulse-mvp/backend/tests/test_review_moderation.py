"""Review text moderation tests."""

from app.services.profanity_tr import contains_prohibited_language, find_prohibited_highlights, normalize_review_text


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


def test_allows_etmemek_not_meme_substring() -> None:
    """'etmemek' icinde 'meme' parcasi kufur sayilmamali."""
    text = "Standart kafelerin kahvesi işte çokta şe etmemek lazım"
    assert contains_prohibited_language(text) is False
    assert find_prohibited_highlights(text) == []


def test_highlights_salakca() -> None:
    text = "Salakça olmuş"
    assert contains_prohibited_language(text) is True
    highlights = find_prohibited_highlights(text)
    assert any("salak" in h.lower() for h in highlights)


def test_blocks_spaced_evasion() -> None:
    assert contains_prohibited_language("a m k") is True
    assert contains_prohibited_language("s i k gibi") is True


def test_allows_kebap_icin_price_review() -> None:
    """'kebap icin' birlestiginde 'pic' alt dizesi olusmamali."""
    text = (
        "Lezzet harika bununla birlikte eve sipariste bir porsiyon adana kebap icecek vs yok "
        "600 TL cok yuksek sanirim 120-130 gr civari adana kebap icin bence cok yuksek fiyat "
        "yine de elinize saglik"
    )
    assert contains_prohibited_language(text) is False
    assert find_prohibited_highlights(text) == []


def test_allows_sanirim_with_turkish_dotless_i() -> None:
    text = (
        "Lezzet harika, 600 TL çok yüksek sanırım 120-130 gr adana kebap için "
        "bence pahalı yine de elinize sağlık"
    )
    assert contains_prohibited_language(text) is False
