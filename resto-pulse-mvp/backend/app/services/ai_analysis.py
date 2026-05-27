from __future__ import annotations

from dataclasses import dataclass
from statistics import mean

DEFAULT_CATEGORIES = ["lezzet", "servis", "fiyat", "hijyen"]


@dataclass
class CategoryAnalysis:
    category: str
    score: float
    label: str
    reason: str


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

    async def analyze_review(self, review_text: str) -> dict:
        normalized = review_text.lower()
        pos_hits = sum(
            1
            for token in ["harika", "mukemmel", "iyi", "lezzetli", "temiz", "hizli", "uygun"]
            if token in normalized
        )
        neg_hits = sum(
            1
            for token in ["kotu", "berbat", "yavas", "pahali", "pis", "soguk", "ilgisiz"]
            if token in normalized
        )

        base = 6.0 + (pos_hits * 0.8) - (neg_hits * 0.9)
        base = max(1.0, min(10.0, base))

        categories = [
            CategoryAnalysis(
                category="lezzet",
                score=max(1.0, min(10.0, base + 0.2)),
                label=self._label_from_score(max(1.0, min(10.0, base + 0.2))),
                reason="Yemek tadina dair ipuclari baz alindi (simule).",
            ),
            CategoryAnalysis(
                category="servis",
                score=max(1.0, min(10.0, base)),
                label=self._label_from_score(max(1.0, min(10.0, base))),
                reason="Hiz ve ilgi ifadesine gore degerlendirildi (simule).",
            ),
            CategoryAnalysis(
                category="fiyat",
                score=max(1.0, min(10.0, base - 0.3)),
                label=self._label_from_score(max(1.0, min(10.0, base - 0.3))),
                reason="Fiyat algisi sinyallerine gore hesaplandi (simule).",
            ),
            CategoryAnalysis(
                category="hijyen",
                score=max(1.0, min(10.0, base + 0.1)),
                label=self._label_from_score(max(1.0, min(10.0, base + 0.1))),
                reason="Temizlikle ilgili ifadelere gore degerlendirildi (simule).",
            ),
        ]

        overall_score = round(mean([c.score for c in categories]), 2)
        overall_sentiment = self._label_from_score(overall_score)

        return {
            "summary": "Yorum, genel olarak dengeli bir deneyim anlatimi iceriyor (simule).",
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
        normalized = combined.lower()
        pos_hits = sum(
            1
            for token in ["harika", "mukemmel", "iyi", "lezzetli", "temiz", "hizli", "uygun"]
            if token in normalized
        )
        neg_hits = sum(
            1
            for token in ["kotu", "berbat", "yavas", "pahali", "pis", "soguk", "ilgisiz"]
            if token in normalized
        )

        base = 6.0 + (pos_hits * 0.5) - (neg_hits * 0.8)
        base = max(1.0, min(10.0, base))

        categories = [
            CategoryAnalysis(
                category="lezzet",
                score=max(1.0, min(10.0, base + 0.4)),
                label=self._label_from_score(max(1.0, min(10.0, base + 0.4))),
                reason="Lezzet yorumlarina gore hesaplandi.",
            ),
            CategoryAnalysis(
                category="servis",
                score=max(1.0, min(10.0, base + 0.1)),
                label=self._label_from_score(max(1.0, min(10.0, base + 0.1))),
                reason="Servisle ilgili ifadeler tarandi.",
            ),
            CategoryAnalysis(
                category="fiyat",
                score=max(1.0, min(10.0, base - 0.5)),
                label=self._label_from_score(max(1.0, min(10.0, base - 0.5))),
                reason="Fiyat algisiyle ilgili sozcuklar baz alindi.",
            ),
            CategoryAnalysis(
                category="hijyen",
                score=max(1.0, min(10.0, base + 0.2)),
                label=self._label_from_score(max(1.0, min(10.0, base + 0.2))),
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

