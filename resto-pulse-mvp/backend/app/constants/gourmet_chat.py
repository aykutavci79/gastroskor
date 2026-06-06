"""Gurme Sohbetler — sistem odalari ve etiketler."""

from __future__ import annotations

from dataclasses import dataclass

GOURMET_CHAT_CITY_KEYS = frozenset({"bursa", "istanbul"})

QUESTION_BODY_MAX = 500
ANSWER_BODY_MAX = 1200


@dataclass(frozen=True)
class GourmetRoomSeed:
    slug: str
    title: str
    description: str
    emoji: str
    sort_order: int


SYSTEM_GOURMET_ROOMS: tuple[GourmetRoomSeed, ...] = (
    GourmetRoomSeed(
        slug="kes-donerciler",
        title="Keş Dönerciler",
        description="Döner, dürüm ve kebap tavsiyeleri",
        emoji="🥙",
        sort_order=1,
    ),
    GourmetRoomSeed(
        slug="ocakbasi-muhabbeti",
        title="Ocakbaşı Muhabbeti",
        description="Mangal, ocakbaşı ve ızgara sohbetleri",
        emoji="🔥",
        sort_order=2,
    ),
    GourmetRoomSeed(
        slug="anne-eli-ev-yemegi",
        title="Anne Eli Ev Yemeği",
        description="Ev yemeği, lokanta ve sulu yemek önerileri",
        emoji="🍲",
        sort_order=3,
    ),
    GourmetRoomSeed(
        slug="gece-acikanlar",
        title="Gece Açık Olanlar",
        description="Gece açık mekanlar ve atıştırmalıklar",
        emoji="🌙",
        sort_order=4,
    ),
    GourmetRoomSeed(
        slug="fiyat-performans-avcilari",
        title="Fiyat-Performans Avcıları",
        description="Uygun fiyat, doyurucu lezzet avı",
        emoji="💰",
        sort_order=5,
    ),
    GourmetRoomSeed(
        slug="gizli-kalmis-mekanlar",
        title="Gizli Kalmış Mekanlar",
        description="Az bilinen ama iyi mekan keşifleri",
        emoji="🗺️",
        sort_order=6,
    ),
)

GOURMET_QUESTION_TAGS: tuple[tuple[str, str], ...] = (
    ("doner", "Döner"),
    ("sutlac", "Sütlaç"),
    ("kahvalti", "Kahvaltı"),
    ("ocakbasi", "Ocakbaşı"),
    ("tatli", "Tatlı"),
    ("kahve", "Kahve"),
    ("gece", "Gece"),
    ("fiyat", "Fiyat-performans"),
    ("genel", "Genel"),
)

ALLOWED_QUESTION_TAGS = frozenset(key for key, _ in GOURMET_QUESTION_TAGS)
