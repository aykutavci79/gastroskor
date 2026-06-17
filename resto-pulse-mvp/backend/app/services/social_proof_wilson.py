"""Wilson lower bound skorlama ve rozet mantigi."""

from __future__ import annotations

import math

# Rozet esikleri (0.2b — guven odakli, ince veriye rozet yok)
MIN_MENTIONS_FOR_BADGE = 8
MIN_PLATFORMS_FOR_LIMITED = 2
LIMITED_MAX_MENTIONS = 14

ORTA_MIN_MENTIONS = 15
ORTA_WILSON_MIN = 0.55

YUKSEK_MIN_MENTIONS = 30
YUKSEK_ALT_MENTIONS = 15
YUKSEK_ALT_PLATFORMS = 3
YUKSEK_ALT_WILSON_MIN = 0.65

MIN_TOTAL_SCAN_MENTIONS = 20


def wilson_lower_bound(positive: int, total: int, z: float = 1.96) -> float:
    if total <= 0:
        return 0.0
    p = positive / total
    n = float(total)
    denom = 1.0 + (z * z) / n
    centre = p + (z * z) / (2.0 * n)
    margin = z * math.sqrt((p * (1.0 - p) + (z * z) / (4.0 * n)) / n)
    return max(0.0, (centre - margin) / denom)


def distance_multiplier_km(distance_km: float | None) -> float:
    if distance_km is None:
        return 1.0
    if distance_km <= 5.0:
        return 1.0
    if distance_km <= 15.0:
        return 0.9
    if distance_km <= 30.0:
        return 0.7
    return 0.0


def badge_for_venue(*, n_total: int, wilson: float, platform_count: int) -> str | None:
    """Rozet: cok kaynak + yeterli mention; ince veri None."""
    if n_total < MIN_MENTIONS_FOR_BADGE:
        return None
    if platform_count < MIN_PLATFORMS_FOR_LIMITED:
        return None

    if n_total >= YUKSEK_MIN_MENTIONS:
        return "yüksek"
    if (
        n_total >= YUKSEK_ALT_MENTIONS
        and platform_count >= YUKSEK_ALT_PLATFORMS
        and wilson >= YUKSEK_ALT_WILSON_MIN
    ):
        return "yüksek"

    if n_total >= ORTA_MIN_MENTIONS and wilson >= ORTA_WILSON_MIN:
        return "orta"

    if n_total <= LIMITED_MAX_MENTIONS:
        return "sınırlı"

    return None


def final_score_for_venue(
    *,
    n_positive: int,
    n_total: int,
    is_partner: bool,
    distance_km: float | None,
) -> tuple[float, float]:
    wilson = wilson_lower_bound(n_positive, n_total)
    partner_boost = 0.05 if is_partner else 0.0
    dist_mult = distance_multiplier_km(distance_km)
    return wilson, (wilson + partner_boost) * dist_mult


def is_insufficient_data(
    *,
    total_valid_mentions: int,
    matched_venue_count: int,
    venues_with_min_mentions: int,
) -> bool:
    if total_valid_mentions < MIN_TOTAL_SCAN_MENTIONS:
        return True
    if matched_venue_count < 2:
        return True
    if venues_with_min_mentions < 1:
        return True
    return False
