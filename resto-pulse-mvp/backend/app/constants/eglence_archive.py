"""Günlük oyun arşivi — geçmiş gün açma maliyetleri (GastroCoin)."""

from typing import Literal

EglenceArchiveGame = Literal[
    "kelime_sofrasi",
    "gunluk_kelime",
    "mini_sudoku",
    "kelime_yarismasi",
]

# Aktif gün ücretsiz; arşiv günü başına tek seferlik açma ücreti.
JETON_ARCHIVE_DAY_COST: dict[str, int] = {
    "kelime_sofrasi": 15,
    "gunluk_kelime": 1,
    "mini_sudoku": 3,
    "kelime_yarismasi": 3,
}
