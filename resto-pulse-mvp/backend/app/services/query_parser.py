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


def parse_search_query(raw: str) -> ParsedSearchQuery:
    text = raw.strip()
    removed: list[str] = []
    min_rating: float | None = None
    max_distance_m: float | None = None
    min_distance_m: float | None = None

    for pattern in (_RATING_RE, _RATING_SYMBOL_RE):
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

    if not query and raw.strip():
        query = raw.strip()

    return ParsedSearchQuery(
        query=query,
        min_rating=min_rating,
        max_distance_m=max_distance_m,
        min_distance_m=min_distance_m,
        removed_tokens=removed,
    )
