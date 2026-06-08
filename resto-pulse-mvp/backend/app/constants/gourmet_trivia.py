"""Gurme BilBakalim — yemek genel kultur trivia botu."""

from __future__ import annotations

TRIVIA_BOT_EMAIL = "bilbakalim@system.gastroskor.tr"
TRIVIA_BOT_NICKNAME = "BilBakalim"
TRIVIA_BOT_AVATAR_PRESET = "tatli"

ROOM_SLUG_TRIVIA_TAGS: dict[str, tuple[str, ...]] = {
    "kes-donerciler": ("doner", "genel"),
    "ocakbasi-muhabbeti": ("ocakbasi", "genel"),
    "anne-eli-ev-yemegi": ("kahvalti", "genel"),
    "gece-acikanlar": ("gece", "genel"),
    "fiyat-performans-avcilari": ("fiyat", "genel"),
    "gizli-kalmis-mekanlar": ("genel",),
}

TRIVIA_QUESTION_PREFIX = "🎯 BilBakalım: "
