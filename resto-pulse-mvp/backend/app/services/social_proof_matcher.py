"""Mekan adi eslestirme — RapidFuzz + sehir/mesafe filtresi."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from rapidfuzz import fuzz

from app.services.gastro_score_ranking import haversine_meters
from app.services.profanity_tr import normalize_review_text

FUZZY_THRESHOLD = 85
MAX_MENTIONS_PER_AUTHOR = 1


@dataclass(frozen=True)
class PlaceCandidate:
    place_id: str
    name: str
    restaurant_id: str | None
    latitude: float | None
    longitude: float | None
    is_partner: bool = False


@dataclass(frozen=True)
class RawMention:
    platform: str
    author_id: str
    text: str
    source_url: str | None
    published_at: str | None = None


@dataclass(frozen=True)
class MatchedMention:
    platform: str
    author_hash: str
    place_id: str
    restaurant_id: str | None
    text: str
    source_url: str | None
    published_at: str | None
    match_score: int


def author_hash(platform: str, author_id: str) -> str:
    raw = f"{platform}:{author_id or 'anon'}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _within_radius(
    candidate: PlaceCandidate,
    *,
    origin_lat: float | None,
    origin_lng: float | None,
    radius_km: float,
) -> bool:
    if origin_lat is None or origin_lng is None:
        return True
    if candidate.latitude is None or candidate.longitude is None:
        return True
    dist_m = haversine_meters(origin_lat, origin_lng, candidate.latitude, candidate.longitude)
    return dist_m <= radius_km * 1000.0


def match_mention_to_place(
    text: str,
    candidates: list[PlaceCandidate],
    *,
    origin_lat: float | None,
    origin_lng: float | None,
    radius_km: float,
) -> tuple[PlaceCandidate, int] | None:
    normalized = normalize_review_text(text).lower()
    if len(normalized) < 3:
        return None

    eligible = [
        c
        for c in candidates
        if _within_radius(c, origin_lat=origin_lat, origin_lng=origin_lng, radius_km=radius_km)
    ]
    if not eligible:
        return None

    scored: list[tuple[PlaceCandidate, int]] = []
    for candidate in eligible:
        name_norm = normalize_review_text(candidate.name).lower()
        if len(name_norm) < 3:
            continue
        score = max(
            fuzz.partial_ratio(name_norm, normalized),
            fuzz.token_set_ratio(name_norm, normalized),
        )
        if score >= FUZZY_THRESHOLD:
            scored.append((candidate, int(score)))

    if not scored:
        return None

    best_score = max(s for _, s in scored)
    best = [pair for pair in scored if pair[1] == best_score]
    if len(best) != 1:
        return None
    return best[0]


def match_mentions(
    mentions: list[RawMention],
    candidates: list[PlaceCandidate],
    *,
    origin_lat: float | None,
    origin_lng: float | None,
    radius_km: float,
) -> list[MatchedMention]:
    matched: list[MatchedMention] = []
    author_counts: dict[str, int] = {}

    for mention in mentions:
        result = match_mention_to_place(
            mention.text,
            candidates,
            origin_lat=origin_lat,
            origin_lng=origin_lng,
            radius_km=radius_km,
        )
        if result is None:
            continue
        place, score = result
        ahash = author_hash(mention.platform, mention.author_id)
        author_counts[ahash] = author_counts.get(ahash, 0) + 1
        if author_counts[ahash] > MAX_MENTIONS_PER_AUTHOR:
            continue
        matched.append(
            MatchedMention(
                platform=mention.platform,
                author_hash=ahash,
                place_id=place.place_id,
                restaurant_id=place.restaurant_id,
                text=mention.text,
                source_url=mention.source_url,
                published_at=mention.published_at,
                match_score=score,
            )
        )
    return matched
