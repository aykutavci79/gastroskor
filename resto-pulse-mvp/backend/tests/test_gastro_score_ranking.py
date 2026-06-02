"""GastroSkor canli arama siralama."""

from app.integrations.google_places_live import LivePlaceResult
from app.services.gastro_score_ranking import rank_live_places, rating_score_for_stars


def test_rating_score_graduated_between_4_and_4_5() -> None:
    assert rating_score_for_stars(4.1) == 2.1
    assert rating_score_for_stars(4.4) == 2.4


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
