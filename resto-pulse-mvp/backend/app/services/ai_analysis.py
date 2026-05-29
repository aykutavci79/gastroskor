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

    async def analyze_place_reviews(self, reviews: list[str]) -> dict:
        if not reviews:
            return {
                "summary": "Yorum bulunamadi.",
                "overall_sentiment": "neutral",
                "overall_score": 5.0,
                "categories": [
                    {"category": category, "label": "neutral", "score": 5.0, "reason": "Yeterli yorum olmadigi icin varsayilan deger."}
                    for category in DEFAULT_CATEGORIES
                ],
            }

        combined = "\n".join(reviews)
        normalized = _normalize_text(combined)
        pos_hits = _count_token_hits(normalized, POSITIVE_TOKENS)
        neg_hits = _count_token_hits(normalized, NEGATIVE_TOKENS)

        base = _clamp_score(6.0 + (pos_hits * 0.5) - (neg_hits * 0.8))

        categories = [
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

        overall_score = round(mean([c.score for c in categories]), 2)
        overall_sentiment = self._label_from_score(overall_score)

        return {
            "summary": "Restoranin Google yorumlari yapay zeka ile genel olarak degerlendirildi.",
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
