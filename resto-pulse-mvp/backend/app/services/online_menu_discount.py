"""Online siparis menü indirim yüzdesi — panel alani gelene kadar metinden parse."""

from __future__ import annotations

import re

_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"(?:tüm\s+)?(?:menü(?:de|den)?|ürün(?:ler(?:de|den)?)?)\s*(?:de|den)?\s*%?\s*(\d{1,2})\s*%?",
        re.IGNORECASE,
    ),
    re.compile(r"%(\d{1,2})\s*(?:tüm\s+)?(?:menü|indirim)", re.IGNORECASE),
    re.compile(r"(\d{1,2})\s*%\s*(?:indirim|tüm|menü)", re.IGNORECASE),
    re.compile(r"yüzde\s*(\d{1,2})", re.IGNORECASE),
    re.compile(r"%(\d{1,2})\b"),
    re.compile(r"(\d{1,2})\s*%"),
)


def parse_menu_discount_percent(text: str | None) -> int | None:
    if not text:
        return None
    normalized = text.strip()
    if not normalized:
        return None
    for pattern in _PATTERNS:
        match = pattern.search(normalized)
        if not match:
            continue
        percent = int(match.group(1))
        if 10 <= percent <= 90:
            return percent
    return None
