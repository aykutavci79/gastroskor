"""Kelime Sofrası deneme loglama testleri."""

from app.services.sofra_kelime_text import sofra_kelime_buyuk, sofra_kelime_gecerli


def test_sofra_kelime_buyuk_turkish():
    assert sofra_kelime_buyuk("kalem") == "KALEM"
    assert sofra_kelime_buyuk("  ığdır ") == "IĞDIR"


def test_sofra_kelime_gecerli_min_length():
    assert not sofra_kelime_gecerli("ab")
    assert not sofra_kelime_gecerli("abc")
    assert sofra_kelime_gecerli("kale")
