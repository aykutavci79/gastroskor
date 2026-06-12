from __future__ import annotations

import math
from dataclasses import dataclass

from app.integrations.google_places_live import CITY_SEARCH_BIAS, LivePlaceResult

EARTH_RADIUS_M = 6_371_000


@dataclass
class RankedLivePlace:
    place: LivePlaceResult
    distance_meters: float | None
    distance_origin: str
    distance_score: float
    rating_score: float
    popularity_score: float
    gastro_score: float


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def distance_score_for_meters(distance_m: float) -> float:
    """GastroSkor mesafe skoru — yakin mesafede yumusak dusus, 2km+ icin ince ayrim."""
    if distance_m <= 500:
        return 3.0
    if distance_m <= 1_000:
        return 3.0 - ((distance_m - 500) / 500) * 1.0
    if distance_m <= 2_000:
        return 2.0 - ((distance_m - 1_000) / 1_000) * 1.0
    if distance_m <= 5_000:
        return 1.0 - ((distance_m - 2_000) / 3_000) * 1.0
    return 0.0


def rating_score_for_stars(rating: float | None) -> float:
    """GastroSkor lezzet (yildiz) matrisi."""
    if rating is None:
        return 0.0
    if rating >= 4.5:
        return 3.0
    if rating >= 4.0:
        # 4.0–4.5 arasi kademeli: 4.1 ile 4.4 ayni kutuya dusmesin.
        return 2.0 + min(0.5, rating - 4.0)
    if rating >= 3.0:
        return 2.0
    return 1.0


def popularity_score_for_reviews(user_ratings_total: int | None, rating: float | None = None) -> float:
    """Google yorum sayisi — esit puan/mesafede ikonik mekanlari one cikarir."""
    count = max(0, int(user_ratings_total or 0))
    stars = rating if rating is not None else 3.5
    raw = math.log10(count + 1) * 0.55 * (stars / 5.0)
    return min(2.5, raw)


def live_place_sort_key(
    *,
    rating: float | None,
    distance_meters: float | None,
    user_ratings_total: int | None,
) -> tuple[float, float, float, float]:
    """Siralama: puan+mesafe skoru, sonra yildiz, mesafe, populerlik."""
    dist = distance_meters if distance_meters is not None else float("inf")
    dist_score = distance_score_for_meters(dist) if dist != float("inf") else 0.0
    rating_score = rating_score_for_stars(rating)
    gastro_score = dist_score + rating_score
    popularity_score = popularity_score_for_reviews(user_ratings_total, rating)
    return (-gastro_score, -(rating or 0), dist, -popularity_score)


def resolve_origin(
    city: str,
    origin_lat: float | None,
    origin_lng: float | None,
) -> tuple[float, float, str]:
    if origin_lat is not None and origin_lng is not None:
        return origin_lat, origin_lng, "user"
    city_bias = CITY_SEARCH_BIAS.get(city.strip().lower())
    if city_bias:
        return city_bias[0], city_bias[1], "city_center"
    return 40.1885, 29.0610, "city_center"


def rank_live_places(
    places: list[LivePlaceResult],
    *,
    city: str = "Bursa",
    origin_lat: float | None = None,
    origin_lng: float | None = None,
    limit: int = 8,
) -> list[RankedLivePlace]:
    origin_lat_resolved, origin_lng_resolved, distance_origin = resolve_origin(city, origin_lat, origin_lng)
    ranked: list[RankedLivePlace] = []

    for place in places:
        distance_m: float | None = None
        distance_score = 0.0
        if place.latitude is not None and place.longitude is not None:
            distance_m = haversine_meters(
                origin_lat_resolved,
                origin_lng_resolved,
                place.latitude,
                place.longitude,
            )
            distance_score = distance_score_for_meters(distance_m)

        rating_score = rating_score_for_stars(place.rating)
        popularity_score = popularity_score_for_reviews(place.user_ratings_total, place.rating)
        gastro_score = distance_score + rating_score

        ranked.append(
            RankedLivePlace(
                place=place,
                distance_meters=distance_m,
                distance_origin=distance_origin,
                distance_score=distance_score,
                rating_score=rating_score,
                popularity_score=popularity_score,
                gastro_score=gastro_score,
            )
        )

    ranked.sort(
        key=lambda row: live_place_sort_key(
            rating=row.place.rating,
            distance_meters=row.distance_meters,
            user_ratings_total=row.place.user_ratings_total,
        )
    )
    return ranked[:limit]
