from app.services.social_proof_matcher import (
    PlaceCandidate,
    RawMention,
    match_mention_to_place,
    match_mentions,
)
from app.services.social_proof_wilson import (
    MIN_TOTAL_SCAN_MENTIONS,
    badge_for_venue,
    distance_multiplier_km,
    final_score_for_venue,
    is_insufficient_data,
    wilson_lower_bound,
)


def test_wilson_lower_bound():
    score = wilson_lower_bound(8, 10)
    assert 0.4 < score < 0.95


def test_distance_multiplier():
    assert distance_multiplier_km(2.0) == 1.0
    assert distance_multiplier_km(10.0) == 0.9
    assert distance_multiplier_km(20.0) == 0.7


def test_badge_mapping_new_thresholds():
    assert badge_for_venue(n_total=7, wilson=0.9, platform_count=3) is None
    assert badge_for_venue(n_total=8, wilson=0.9, platform_count=1) is None
    assert badge_for_venue(n_total=10, wilson=0.9, platform_count=2) == "sınırlı"
    assert badge_for_venue(n_total=14, wilson=0.9, platform_count=2) == "sınırlı"
    assert badge_for_venue(n_total=18, wilson=0.6, platform_count=2) == "orta"
    assert badge_for_venue(n_total=18, wilson=0.4, platform_count=2) is None
    assert badge_for_venue(n_total=30, wilson=0.5, platform_count=2) == "yüksek"
    assert badge_for_venue(n_total=16, wilson=0.7, platform_count=3) == "yüksek"
    assert badge_for_venue(n_total=16, wilson=0.7, platform_count=2) == "orta"


def test_insufficient_data():
    assert is_insufficient_data(
        total_valid_mentions=MIN_TOTAL_SCAN_MENTIONS - 1,
        matched_venue_count=3,
        venues_with_min_mentions=2,
    )
    assert not is_insufficient_data(
        total_valid_mentions=MIN_TOTAL_SCAN_MENTIONS,
        matched_venue_count=3,
        venues_with_min_mentions=1,
    )
    assert is_insufficient_data(
        total_valid_mentions=MIN_TOTAL_SCAN_MENTIONS,
        matched_venue_count=3,
        venues_with_min_mentions=0,
    )


def test_fuzzy_match_single():
    candidates = [
        PlaceCandidate(
            place_id="p1",
            name="Kebapçı Hacı Dayı",
            restaurant_id=None,
            latitude=40.2,
            longitude=29.0,
        )
    ]
    hit = match_mention_to_place(
        "Bursa'da Kebapçı Hacı Dayı harika",
        candidates,
        origin_lat=40.2,
        origin_lng=29.0,
        radius_km=30,
    )
    assert hit is not None
    assert hit[0].place_id == "p1"


def test_author_cap():
    mentions = [
        RawMention(platform="reddit", author_id="u1", text="Kebapçı Hacı Dayı süper", source_url="a"),
        RawMention(platform="reddit", author_id="u1", text="Kebapçı Hacı Dayı yine süper", source_url="b"),
        RawMention(platform="reddit", author_id="u1", text="Kebapçı Hacı Dayı üçüncü", source_url="c"),
        RawMention(platform="reddit", author_id="u1", text="Kebapçı Hacı Dayı dördüncü", source_url="d"),
    ]
    candidates = [
        PlaceCandidate(
            place_id="p1",
            name="Kebapçı Hacı Dayı",
            restaurant_id=None,
            latitude=40.2,
            longitude=29.0,
        )
    ]
    matched = match_mentions(
        mentions,
        candidates,
        origin_lat=40.2,
        origin_lng=29.0,
        radius_km=30,
    )
    assert len(matched) == 1


def test_final_score_partner_boost():
    wilson, score = final_score_for_venue(
        n_positive=6,
        n_total=8,
        is_partner=True,
        distance_km=3.0,
    )
    assert wilson > 0
    assert score > wilson
