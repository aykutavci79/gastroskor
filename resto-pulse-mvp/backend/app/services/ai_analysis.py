from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

DEFAULT_CATEGORIES = ["lezzet", "servis", "fiyat", "hijyen"]

# GastroSkor: mukemmel 10/10 verilmez; ust sinir bilincli dusuk tutulur.
MAX_SCORE = 9.5
MIN_SCORE = 1.0

POSITIVE_TOKENS = (
    "harika",
    "mukemmel",
    "iyi",
    "super",
    "süper",
    "lezzetli",
    "temiz",
    "hizli",
    "hızlı",
    "uygun",
    "begendim",
    "beğendim",
    "inanilmaz",
    "inanılmaz",
    "muthis",
    "müthiş",
    "efsane",
    "lezzet",
    "ellerinize saglik",
    "elinize saglik",
)

NEGATIVE_TOKENS = (
    "kotu",
    "kötü",
    "berbat",
    "yavas",
    "yavaş",
    "pahali",
    "pahalı",
    "pis",
    "soguk",
    "soğuk",
    "ilgisiz",
    "tavsiye etmem",
    "bir daha gitmem",
)


@dataclass
class CategoryAnalysis:
    category: str
    score: float
    label: str
    reason: str


def _normalize_text(text: str) -> str:
    lowered = text.lower()
    return (
        lowered.replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def _clamp_score(value: float) -> float:
    return max(MIN_SCORE, min(MAX_SCORE, value))


def _base_from_rating(rating: int | None) -> float:
    if rating is None:
        return 6.0
    return {
        5: 8.0,
        4: 7.0,
        3: 6.0,
        2: 4.0,
        1: 2.5,
    }.get(rating, 6.0)


def _google_rating_to_gastro_base(rating: float) -> float:
    """Google 1-5 yildiz -> GastroSkor 10 uzerinden taban (or. 4.9 yildiz ~ 7.9/10)."""
    clamped = max(1.0, min(5.0, float(rating)))
    anchors = [(1.0, 2.5), (2.0, 4.0), (3.0, 6.0), (4.0, 7.0), (5.0, 8.0)]
    for idx in range(len(anchors) - 1):
        r0, s0 = anchors[idx]
        r1, s1 = anchors[idx + 1]
        if clamped <= r1:
            span = r1 - r0
            t = 0.0 if span <= 0 else (clamped - r0) / span
            return _clamp_score(s0 + t * (s1 - s0))
    return _clamp_score(8.0)


def _avg_star_rating(ratings: list[int | float]) -> float | None:
    cleaned = [float(r) for r in ratings if r is not None]
    if not cleaned:
        return None
    return sum(cleaned) / len(cleaned)


def _resolve_place_base(
    *,
    google_rating: float | None,
    review_ratings: list[int | float],
    pos_hits: int,
    neg_hits: int,
) -> float:
    avg_rating = _avg_star_rating(review_ratings)
    rating_source = avg_rating if avg_rating is not None else google_rating

    if rating_source is not None:
        base = _google_rating_to_gastro_base(rating_source)
        return _clamp_score(base + (pos_hits * 0.15) - (neg_hits * 0.25))

    return _clamp_score(6.0 + (pos_hits * 0.5) - (neg_hits * 0.8))


def _count_token_hits(normalized: str, tokens: tuple[str, ...]) -> int:
    return sum(1 for token in tokens if _normalize_text(token) in normalized)


class AIAnalysisService:
    """
    MVP: burada OpenAI/Anthropic cagrisina hazir bir servis sozlesmesi var.
    Ilk adimda mock cevap dondurur.
    """

    def _label_from_score(self, score: float) -> str:
        if score >= 7:
            return "positive"
        if score <= 4:
            return "negative"
        return "neutral"

    def _looks_like_five_point_scale(self, scores: list[float]) -> bool:
        if not scores:
            return False
        return max(scores) <= 5.5

    def _normalize_categories_to_ten(
        self, categories: list[CategoryAnalysis]
    ) -> list[CategoryAnalysis]:
        scores = [c.score for c in categories]
        if not self._looks_like_five_point_scale(scores):
            return categories
        return [
            CategoryAnalysis(
                category=c.category,
                score=_clamp_score(c.score * 2.0),
                label=self._label_from_score(_clamp_score(c.score * 2.0)),
                reason=c.reason,
            )
            for c in categories
        ]

    def _build_categories(self, base: float, *, simulate: bool) -> list[CategoryAnalysis]:
        suffix = " (simule)." if simulate else "."
        return [
            CategoryAnalysis(
                category="lezzet",
                score=_clamp_score(base + 0.2),
                label=self._label_from_score(_clamp_score(base + 0.2)),
                reason=f"Yemek tadina dair ipuclari baz alindi{suffix}",
            ),
            CategoryAnalysis(
                category="servis",
                score=_clamp_score(base),
                label=self._label_from_score(_clamp_score(base)),
                reason=f"Hiz ve ilgi ifadesine gore degerlendirildi{suffix}",
            ),
            CategoryAnalysis(
                category="fiyat",
                score=_clamp_score(base - 0.3),
                label=self._label_from_score(_clamp_score(base - 0.3)),
                reason=f"Fiyat algisi sinyallerine gore hesaplandi{suffix}",
            ),
            CategoryAnalysis(
                category="hijyen",
                score=_clamp_score(base + 0.1),
                label=self._label_from_score(_clamp_score(base + 0.1)),
                reason=f"Temizlikle ilgili ifadelere gore degerlendirildi{suffix}",
            ),
        ]

    async def analyze_review(self, review_text: str, *, rating: int | None = None) -> dict:
        normalized = _normalize_text(review_text)
        pos_hits = _count_token_hits(normalized, POSITIVE_TOKENS)
        neg_hits = _count_token_hits(normalized, NEGATIVE_TOKENS)

        start = _base_from_rating(rating)
        base = _clamp_score(start + (pos_hits * 0.5) - (neg_hits * 0.9))

        categories = self._build_categories(base, simulate=True)
        overall_score = round(mean([c.score for c in categories]), 2)
        overall_sentiment = self._label_from_score(overall_score)

        if overall_score >= 8:
            summary = "Yorum genel olarak olumlu bir deneyim anlatiyor (simule)."
        elif overall_score <= 4:
            summary = "Yorumda olumsuz sinyaller one cikiyor (simule)."
        else:
            summary = "Yorum, genel olarak dengeli bir deneyim anlatimi iceriyor (simule)."

        return {
            "summary": summary,
            "overall_sentiment": overall_sentiment,
            "overall_score": overall_score,
            "categories": [
                {
                    "category": c.category,
                    "label": c.label,
                    "score": round(c.score, 2),
                    "reason": c.reason,
                }
                for c in categories
            ],
        }

    async def analyze_place_reviews(
        self,
        reviews: list[str],
        *,
        google_rating: float | None = None,
        review_ratings: list[int | float] | None = None,
    ) -> dict:
        ratings = review_ratings or []

        if not reviews and google_rating is None and not ratings:
            return {
                "summary": "Yorum bulunamadi.",
                "overall_sentiment": "neutral",
                "overall_score": 5.0,
                "scale": "1-10",
                "categories": [
                    {
                        "category": category,
                        "label": "neutral",
                        "score": 5.0,
                        "reason": "Yeterli yorum olmadigi icin varsayilan deger.",
                    }
                    for category in DEFAULT_CATEGORIES
                ],
            }

        combined = "\n".join(reviews)
        normalized = _normalize_text(combined)
        pos_hits = _count_token_hits(normalized, POSITIVE_TOKENS)
        neg_hits = _count_token_hits(normalized, NEGATIVE_TOKENS)

        base = _resolve_place_base(
            google_rating=google_rating,
            review_ratings=ratings,
            pos_hits=pos_hits,
            neg_hits=neg_hits,
        )

        categories = self._normalize_categories_to_ten(
            [
                CategoryAnalysis(
                    category="lezzet",
                    score=_clamp_score(base + 0.4),
                    label=self._label_from_score(_clamp_score(base + 0.4)),
                    reason="Lezzet yorumlarina gore hesaplandi.",
                ),
                CategoryAnalysis(
                    category="servis",
                    score=_clamp_score(base + 0.1),
                    label=self._label_from_score(_clamp_score(base + 0.1)),
                    reason="Servisle ilgili ifadeler tarandi.",
                ),
                CategoryAnalysis(
                    category="fiyat",
                    score=_clamp_score(base - 0.5),
                    label=self._label_from_score(_clamp_score(base - 0.5)),
                    reason="Fiyat algisiyle ilgili sozcukler baz alindi.",
                ),
                CategoryAnalysis(
                    category="hijyen",
                    score=_clamp_score(base + 0.2),
                    label=self._label_from_score(_clamp_score(base + 0.2)),
                    reason="Temizlik ve hijyenle ilgili geri bildirimler degerlendirildi.",
                ),
            ]
        )

        overall_score = round(mean([c.score for c in categories]), 2)
        overall_sentiment = self._label_from_score(overall_score)

        google_hint = ""
        if google_rating is not None:
            google_hint = f" Google ort. {google_rating:.1f}/5 yildiz referans alindi."

        return {
            "summary": (
                "Restoranin Google ve GastroSkor yorumlari 10 uzerinden kategori skorlarina donusturuldu."
                + google_hint
            ),
            "overall_sentiment": overall_sentiment,
            "overall_score": overall_score,
            "scale": "1-10",
            "categories": [
                {
                    "category": c.category,
                    "label": c.label,
                    "score": round(c.score, 2),
                    "reason": c.reason,
                }
                for c in categories
            ],
        }
