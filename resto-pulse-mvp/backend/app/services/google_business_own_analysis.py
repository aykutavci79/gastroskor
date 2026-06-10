from __future__ import annotations

from app.integrations.gemini_client import gemini_json_prompt
from app.services.competitor_ai_analysis import _extract_strengths, _validate_insights
from app.services.review_time_filter import MAX_REVIEW_AGE_DAYS, filter_recent_reviews

MAX_GBP_REVIEWS_FOR_AI = 80
STAR_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


def gbp_reviews_to_rows(reviews: list[dict]) -> list[dict]:
    rows: list[dict] = []
    for review in reviews:
        text = (review.get("comment") or "").strip()
        if not text:
            continue
        rows.append(
            {
                "text": text,
                "rating": STAR_MAP.get(review.get("starRating")),
                "relative_time_description": review.get("updateTime") or review.get("createTime") or "",
            }
        )
    return rows


async def analyze_own_google_business_reviews(
    *,
    reviews: list[dict],
    place_name: str,
    total_count: int,
) -> dict:
    rows = gbp_reviews_to_rows(reviews)
    recent = filter_recent_reviews(rows)
    sample = recent[:MAX_GBP_REVIEWS_FOR_AI] if recent else rows[:MAX_GBP_REVIEWS_FOR_AI]

    strengths, strength_model = await _extract_strengths(sample, place_name)

    gaps: list[dict] = []
    neg_markers = ["yavas", "yavaş", "kotu", "kötü", "berbat", "soguk", "soğuk", "kirli", "pahali", "pahalı", "ilgisiz"]
    for row in sample:
        text = (row.get("text") or "").lower()
        if any(m in text for m in neg_markers):
            gaps.append(
                {
                    "category": "iyilestirme",
                    "summary": "Google yorumlarinizda iyilestirme gerektiren temalar var.",
                    "evidence_quotes": [],
                }
            )
            break

    system = "Turkce kisa isletme ozeti yaz. Sadece verilen maddelere dayan. 3-5 cumle."
    user = (
        f"Isletme: {place_name}\n"
        f"Toplam Google yorumu: {total_count}. Analiz edilen ornek: {len(sample)} (son {MAX_REVIEW_AGE_DAYS} gun oncelikli).\n"
        f"Guclu yanlar: {strengths}\n"
        f"Iyilestirme: {gaps}\n"
        'JSON: {"comparison_summary":"..."}'
    )
    parsed = await gemini_json_prompt(system=system, user=user)
    summary = (parsed or {}).get("comparison_summary") or (
        f"{place_name} icin {len(sample)} Google yorumu analiz edildi. "
        f"{len(strengths)} guclu tema, {len(gaps)} iyilestirme alani saptandi."
    )

    corpus = " ".join((r.get("text") or "") for r in sample)
    validated_gaps = _validate_insights(gaps, corpus)

    return {
        "comparison_summary": summary,
        "your_strengths": strengths,
        "your_gaps": validated_gaps,
        "competitor_strengths": [],
        "reviews_used": {"own": len(sample), "competitor": 0},
        "reviews_total": total_count,
        "models_used": [strength_model, "gemini" if parsed else "template"],
        "warnings": [],
        "disclaimer": (
            f"Analiz bagli Google Isletme hesabinizdan alinan yorumlara dayanir "
            f"({len(sample)} ornek / toplam {total_count}). Ham yorum metni saklanmaz; yalnizca AI ozeti kaydedilir."
        ),
    }
