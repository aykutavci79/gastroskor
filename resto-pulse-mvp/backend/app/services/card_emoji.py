from __future__ import annotations

import re

# Panelden secilebilir onayli emojiler
CARD_EMOJI_PRESETS = [
    "🍕",
    "🥙",
    "🍔",
    "🍖",
    "🍰",
    "🧁",
    "☕",
    "🐟",
    "🍳",
    "🥗",
    "🍜",
    "🌮",
    "🍽️",
    "🥤",
    "🥘",
    "🧆",
]

_EMOJI_RE = re.compile(
    r"^[\U0001F300-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]{1,32}$"
)


def normalize_card_emoji(value: str | None) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    if raw not in CARD_EMOJI_PRESETS:
        raise ValueError("Gecersiz emoji. Paneldeki listeden secin veya bos birakin.")
    return raw
