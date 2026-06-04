import asyncio

from app.services.ai_analysis import (
    AIAnalysisService,
    _google_rating_to_gastro_base,
    _resolve_place_base,
)


def test_google_rating_maps_to_ten_point_base():
    assert _google_rating_to_gastro_base(4.9) == 7.9
    assert _google_rating_to_gastro_base(5.0) == 8.0
    assert _google_rating_to_gastro_base(4.0) == 7.0


def test_place_base_uses_google_rating_not_raw_five_scale():
    base = _resolve_place_base(
        google_rating=4.9,
        review_ratings=[],
        pos_hits=0,
        neg_hits=0,
    )
    assert base >= 7.5


def test_analyze_place_reviews_returns_ten_point_categories():
    service = AIAnalysisService()
    result = asyncio.run(
        service.analyze_place_reviews(
            ["cok lezzetli ve temiz bir mekan"],
            google_rating=4.9,
            review_ratings=[5, 5, 4],
        )
    )
    assert result["scale"] == "1-10"
    assert result["overall_score"] >= 7.0
    assert all(row["score"] >= 6.5 for row in result["categories"])
