from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class ParsedSearchQuery:
    query: str
    min_rating: float | None = None
    max_distance_m: float | None = None
    min_distance_m: float | None = None
    removed_tokens: list[str] = field(default_factory=list)


_RATING_RE = re.compile(
    r"(?P<value>[0-5](?:[.,]\d)?)\s*(?:\+|yildiz|yıldız|star|puan|ve\s+uzeri|ve\s+üzeri|ustu|üstü)\b",
    re.IGNORECASE,
)
_RATING_PLUS_RE = re.compile(
    r"(?P<value>[0-5](?:[.,]\d)?)\s*\+",
    re.IGNORECASE,
)
_RATING_SYMBOL_RE = re.compile(
    r"(?P<value>[0-5](?:[.,]\d)?)\s*(?:★|⭐)",
    re.IGNORECASE,
)
_MAX_DISTANCE_RE = re.compile(
    r"(?P<value>\d+)\s*(?:m|mt|metre|meter)\b",
    re.IGNORECASE,
)
_MIN_DISTANCE_RE = re.compile(
    r"(?:en\s+az|minimum|min)\s*(?P<value>\d+)\s*(?:m|mt|metre|meter)\b",
    re.IGNORECASE,
)

_RATING_WORDS: dict[str, float] = {
    "bir": 1.0,
    "iki": 2.0,
    "uc": 3.0,
    "üç": 3.0,
    "dort": 4.0,
    "dört": 4.0,
    "bes": 5.0,
    "beş": 5.0,
}

_SPOKEN_RATING_RE = re.compile(
    r"(?P<word>bir|iki|uc|üç|dort|dört|bes|beş)"
    r"(?:\s*(?:buçuk|bucuk))?"
    r"\s*(?:yıldız|yildiz|star|puan)"
    r"(?:\s*(?:üstü|ustu|ve\s+üzeri|ve\s+uzeri|\+))?",
    re.IGNORECASE,
)

# Sesli arama: "lahmacun satan restoranlari siralas" -> "lahmacun"
_VOICE_BOILERPLATE_RES = (
    re.compile(
        r"\s+(?:satan|satanlar)\s+"
        r"(?:restoran(?:lar(?:ı|i|ını|ini)?)?|yer(?:ler)?(?:i)?)"
        r"(?:\s+(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste))?"
        r"\.?\s*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"\s+(?:restoran(?:lar(?:ı|i|ını|ini)?)?)\s+"
        r"(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste)\.?\s*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"\s+(?:sırala|sıralar|sıralan|sıralama|sirala|siralar|siralan|listele|liste)\.?\s*$",
        re.IGNORECASE,
    ),
    re.compile(
        r"\s+(?:satan|satanlar)\s+(?:restoran(?:lar(?:ı|i)?)?|yer(?:ler)?(?:i)?)\.?\s*$",
        re.IGNORECASE,
    ),
    re.compile(r"\s+restoran(?:lar(?:ı|i|ını|ini)?)?\.?\s*$", re.IGNORECASE),
)


def strip_voice_search_boilerplate(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"\.+$", "", text).strip()
    for pattern in _VOICE_BOILERPLATE_RES:
        text = pattern.sub("", text).strip()
    return text


def _spoken_rating_value(match: re.Match[str]) -> float | None:
    word = match.group("word").lower()
    base = _RATING_WORDS.get(word)
    if base is None:
        folded = word.replace("ü", "u").replace("ö", "o").replace("ş", "s").replace("ç", "c").replace("ı", "i")
        base = _RATING_WORDS.get(folded)
    if base is None:
        return None
    chunk = match.group(0).lower()
    if "buçuk" in chunk or "bucuk" in chunk:
        return min(5.0, base + 0.5)
    return base


def parse_search_query(raw: str) -> ParsedSearchQuery:
    text = strip_voice_search_boilerplate(raw.strip())
    removed: list[str] = []
    min_rating: float | None = None
    max_distance_m: float | None = None
    min_distance_m: float | None = None

    for match in _SPOKEN_RATING_RE.finditer(text):
        value = _spoken_rating_value(match)
        if value is not None and 0 <= value <= 5:
            min_rating = value
            removed.append(match.group(0))

    for pattern in (_RATING_RE, _RATING_SYMBOL_RE, _RATING_PLUS_RE):
        for match in pattern.finditer(text):
            value = float(match.group("value").replace(",", "."))
            if 0 <= value <= 5:
                min_rating = value
                removed.append(match.group(0))

    for match in _MAX_DISTANCE_RE.finditer(text):
        if _MIN_DISTANCE_RE.search(match.group(0)):
            continue
        max_distance_m = float(match.group("value"))
        removed.append(match.group(0))

    for match in _MIN_DISTANCE_RE.finditer(text):
        min_distance_m = float(match.group("value"))
        removed.append(match.group(0))

    query = text
    for token in removed:
        query = query.replace(token, " ")
    query = re.sub(r"\s+", " ", query).strip()

    if not query and min_rating is not None:
        query = "restoran"
    elif not query and (max_distance_m is not None or min_distance_m is not None):
        query = "restoran"
    elif not query and raw.strip():
        query = strip_voice_search_boilerplate(raw.strip()) or raw.strip()

    return ParsedSearchQuery(
        query=query,
        min_rating=min_rating,
        max_distance_m=max_distance_m,
        min_distance_m=min_distance_m,
        removed_tokens=removed,
    )
