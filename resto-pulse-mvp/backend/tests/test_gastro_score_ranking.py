"""GastroSkor canli arama siralama."""

from app.integrations.google_places_live import LivePlaceResult
from app.services.gastro_score_ranking import rank_live_places, rating_score_for_stars, popularity_score_for_reviews


def test_rating_score_graduated_between_4_and_4_5() -> None:
    assert round(rating_score_for_stars(4.1), 1) == 2.1
    assert round(rating_score_for_stars(4.4), 1) == 2.4


def test_higher_review_count_ranks_above_same_rating() -> None:
    origin_lat, origin_lng = 40.1885, 29.0610
    famous = LivePlaceResult(
        place_id="1",
        name="Acı Dayı",
        formatted_address="Kayhan",
        rating=4.3,
        user_ratings_total=2900,
        latitude=40.1849,
        longitude=29.0644,
        photo_reference=None,
    )
    small = LivePlaceResult(
        place_id="2",
        name="Yeni mekan",
        formatted_address="",
        rating=4.3,
        user_ratings_total=50,
        latitude=40.1849,
        longitude=29.0644,
        photo_reference=None,
    )
    ranked = rank_live_places([small, famous], origin_lat=origin_lat, origin_lng=origin_lng, limit=8)
    assert ranked[0].place.user_ratings_total == 2900
    assert ranked[0].popularity_score > ranked[1].popularity_score


def test_higher_rating_before_slightly_farther_same_band() -> None:
    """600 m / 4.1 vs 700 m / 4.4 — yuruyus suresi benzer, puan ustun."""
    origin_lat, origin_lng = 40.1885, 29.0610
    closer_lower = LivePlaceResult(
        place_id="1",
        name="Closer 4.1",
        formatted_address="",
        rating=4.1,
        user_ratings_total=100,
        latitude=40.1925,
        longitude=29.061,
        photo_reference=None,
    )
    farther_higher = LivePlaceResult(
        place_id="2",
        name="Farther 4.4",
        formatted_address="",
        rating=4.4,
        user_ratings_total=100,
        latitude=40.1935,
        longitude=29.061,
        photo_reference=None,
    )
    ranked = rank_live_places(
        [closer_lower, farther_higher],
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        limit=8,
    )
    assert ranked[0].place.rating == 4.4
    assert (ranked[0].distance_meters or 0) > (ranked[1].distance_meters or 0)


def test_higher_rating_and_closer_beats_more_reviews_beyond_2km() -> None:
    """4.4 / 2.7 km / 29 yorum, 4.3 / 3.8 km / 170 yorum — puan ve mesafe onde."""
    origin_lat, origin_lng = 40.1885, 29.0610
    farther_popular = LivePlaceResult(
        place_id="1",
        name="Cok yorumlu",
        formatted_address="",
        rating=4.3,
        user_ratings_total=170,
        latitude=40.22,
        longitude=29.08,
        photo_reference=None,
    )
    closer_better = LivePlaceResult(
        place_id="2",
        name="Yakin ve yuksek puan",
        formatted_address="",
        rating=4.4,
        user_ratings_total=29,
        latitude=40.21,
        longitude=29.07,
        photo_reference=None,
    )
    ranked = rank_live_places(
        [farther_popular, closer_better],
        origin_lat=origin_lat,
        origin_lng=origin_lng,
        limit=8,
    )
    assert ranked[0].place.rating == 4.4
    assert ranked[0].place.user_ratings_total == 29
