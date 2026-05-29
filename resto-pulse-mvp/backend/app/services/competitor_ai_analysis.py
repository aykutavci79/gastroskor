from __future__ import annotations

import re

from app.integrations.gemini_client import gemini_json_prompt
from app.integrations.google_places_live import GooglePlacesLiveClient
from app.services.review_time_filter import MAX_REVIEW_AGE_DAYS, filter_recent_reviews

google_client = GooglePlacesLiveClient()

FOOD_KEYWORDS = (
    "lahmacun",
    "kebap",
    "kebab",
    "doner",
    "döner",
    "pide",
    "iskender",
    "köfte",
    "kofte",
    "mantı",
    "manti",
    "çorba",
    "corba",
    "tatlı",
    "tatli",
    "kunefe",
    "künefe",
    "adana",
    "urfa",
    "tavuk",
    "et",
)


def _format_reviews_for_prompt(reviews: list[dict], label: str) -> str:
    lines: list[str] = []
    for idx, row in enumerate(reviews, start=1):
        rel = row.get("relative_time_description") or "tarih bilinmiyor"
        rating = row.get("rating")
        text = (row.get("text") or "").strip().replace("\n", " ")
        lines.append(f"[{label}-{idx}] ({rel}, {rating} yildiz) {text}")
    return "\n".join(lines) if lines else f"({label}: son 3 ayda uygun yorum yok)"


def _tokenize_products(text: str) -> set[str]:
    lower = text.lower()
    found = {kw for kw in FOOD_KEYWORDS if kw in lower}
    for word in re.findall(r"[a-zçğıöşüA-ZÇĞİÖŞÜ]{4,}", text):
        found.add(word.lower())
    return found


def _validate_insights(insights: list[dict], corpus_text: str) -> list[dict]:
    """AI ciktisindaki urun/ifadeleri yorum metninde gecenlerle sinirla."""
    corpus = corpus_text.lower()
    validated: list[dict] = []
    for row in insights:
        summary = (row.get("summary") or "").strip()
        quotes = [q for q in (row.get("evidence_quotes") or []) if isinstance(q, str) and q.strip()]
        products = row.get("praised_products") or []
        if not summary and not quotes:
            continue

        ok_quotes = [q for q in quotes if q.lower()[:40] in corpus or any(w in corpus for w in q.lower().split()[:6])]
        ok_products = []
        for product in products:
            if not isinstance(product, str):
                continue
            p = product.lower().strip()
            if len(p) < 3:
                continue
            if p in corpus or any(p in kw or kw in p for kw in FOOD_KEYWORDS if kw in corpus):
                ok_products.append(product)

        if ok_quotes or ok_products or any(tok in corpus for tok in _tokenize_products(summary)):
            validated.append(
                {
                    "category": row.get("category") or "genel",
                    "summary": summary,
                    "evidence_quotes": ok_quotes[:3],
                    "praised_products": ok_products[:5],
                }
            )
    return validated


def _heuristic_extract(reviews: list[dict]) -> list[dict]:
    if not reviews:
        return []
    corpus = " ".join((r.get("text") or "") for r in reviews).lower()
    insights: list[dict] = []

    pos_words = ["harika", "mukemmel", "leziz", "cok iyi", "çok iyi", "super", "süper", "tavsiye"]
    neg_words = ["kotu", "kötü", "berbat", "yavas", "yavaş", "soguk", "soğuk", "pahali", "pahalı"]

    if any(w in corpus for w in ["servis", "garson", "ilgi", "bekleme"]):
        tone = "positive" if sum(corpus.count(w) for w in pos_words) >= sum(corpus.count(w) for w in neg_words) else "mixed"
        insights.append(
            {
                "category": "servis",
                "summary": "Yorumlarda servis veya ilgi vurgusu var." if tone == "positive" else "Servisle ilgili karisik geri bildirimler var.",
                "evidence_quotes": [(r.get("text") or "")[:120] for r in reviews[:2]],
                "praised_products": [],
            }
        )

    praised = [kw for kw in FOOD_KEYWORDS if kw in corpus]
    if praised:
        insights.append(
            {
                "category": "urun",
                "summary": f"Musteriler siklikla su urunleri ovmus: {', '.join(praised[:4])}.",
                "evidence_quotes": [(r.get("text") or "")[:120] for r in reviews[:2] if any(k in (r.get("text") or "").lower() for k in praised)],
                "praised_products": praised[:5],
            }
        )
    return insights


async def _extract_strengths(reviews: list[dict], place_name: str) -> tuple[list[dict], str]:
    corpus = " ".join((r.get("text") or "") for r in reviews)
    if not reviews:
        return [], "none"

    system = (
        "Sen restoran yorum analistisin. SADECE verilen yorum metinlerinde gecen bilgileri kullan. "
        "Uydurma urun veya ozellik ekleme. JSON don."
    )
    user = (
        f"Mekan: {place_name}\n"
        f"Son {MAX_REVIEW_AGE_DAYS} gun yorumlari:\n{_format_reviews_for_prompt(reviews, 'Y')}\n\n"
        'JSON format: {"insights":[{"category":"servis|lezzet|urun|fiyat","summary":"...","evidence_quotes":["..."],"praised_products":["..."]}]}'
    )

    parsed = await gemini_json_prompt(system=system, user=user)
    if parsed and isinstance(parsed.get("insights"), list):
        validated = _validate_insights(parsed["insights"], corpus)
        if validated:
            return validated, "gemini+validator"

    return _validate_insights(_heuristic_extract(reviews), corpus), "heuristic+validator"


async def _build_comparison(
    *,
    own_name: str,
    competitor_name: str,
    own_reviews: list[dict],
    competitor_reviews: list[dict],
    competitor_strengths: list[dict],
    own_strengths: list[dict],
) -> tuple[str, list[dict], str]:
    own_corpus = " ".join((r.get("text") or "") for r in own_reviews).lower()
    gaps: list[dict] = []

    neg_markers = ["yavas", "yavaş", "kotu", "kötü", "berbat", "soguk", "soğuk", "ilgisiz", "bekleme", "kirli", "pahali"]
    for row in own_reviews:
        text = (row.get("text") or "").lower()
        if any(m in text for m in neg_markers):
            gaps.append(
                {
                    "category": "iyilestirme",
                    "summary": "Kendi yorumlarinizda olumsuz veya karisik bir tema var.",
                    "evidence_quotes": [(row.get("text") or "")[:160]],
                }
            )
            break

    comp_products = {p for ins in competitor_strengths for p in ins.get("praised_products", [])}
    own_products = {p for ins in own_strengths for p in ins.get("praised_products", [])}
    for product in comp_products - own_products:
        if product.lower() in own_corpus:
            continue
        gaps.append(
            {
                "category": "firsat",
                "summary": f"Rakipte one cikan '{product}' sizin son yorumlarda one cikmiyor.",
                "evidence_quotes": [],
            }
        )

    system = (
        "Turkce kisa karsilastirma yaz. Sadece verilen maddelere dayan. Abartma. 3-5 cumle."
    )
    user = (
        f"Senin mekan: {own_name}\nRakip: {competitor_name}\n"
        f"Rakip guclu yanlar: {competitor_strengths}\n"
        f"Senin guclu yanlar: {own_strengths}\n"
        f"Senin iyilestirme noktalari: {gaps}\n"
        'JSON: {"comparison_summary":"..."}'
    )
    parsed = await gemini_json_prompt(system=system, user=user)
    summary = (
        (parsed or {}).get("comparison_summary")
        or (
            f"{competitor_name} son yorumlarda "
            f"{len(competitor_strengths)} guclu tema ile one cikiyor. "
            f"Sizde {len(gaps)} iyilestirme alani saptandi. Detaylari asagida inceleyin."
        )
    )
    model = "gemini" if parsed else "template"
    return summary, gaps[:6], model


async def analyze_competitor_pair(
    *,
    own_place_id: str,
    own_name: str,
    competitor_place_id: str,
    competitor_name: str,
) -> dict:
    own_details = await google_client.get_place_details(own_place_id)
    comp_details = await google_client.get_place_details(competitor_place_id)

    own_reviews = filter_recent_reviews(own_details.get("reviews", []))
    comp_reviews = filter_recent_reviews(comp_details.get("reviews", []))

    warnings: list[str] = []
    if len(own_reviews) < 2:
        warnings.append("Isletmeniz icin son 3 ayda yeterli Google ornek yorumu yok (API en fazla ~5 dondurur).")
    if len(comp_reviews) < 2:
        warnings.append("Rakip icin son 3 ayda yeterli Google ornek yorumu yok.")

    comp_strengths, extract_model = await _extract_strengths(comp_reviews, competitor_name)
    own_strengths, own_extract_model = await _extract_strengths(own_reviews, own_name)

    comparison_summary, your_gaps, compare_model = await _build_comparison(
        own_name=own_name,
        competitor_name=competitor_name,
        own_reviews=own_reviews,
        competitor_reviews=comp_reviews,
        competitor_strengths=comp_strengths,
        own_strengths=own_strengths,
    )

    models_used = list(dict.fromkeys([extract_model, own_extract_model, compare_model, "dual-pass-validator"]))

    return {
        "competitor_name": competitor_name,
        "own_name": own_name,
        "max_review_age_days": MAX_REVIEW_AGE_DAYS,
        "reviews_used": {
            "own": len(own_reviews),
            "competitor": len(comp_reviews),
        },
        "competitor_strengths": comp_strengths,
        "your_strengths": own_strengths,
        "your_gaps": your_gaps,
        "comparison_summary": comparison_summary,
        "models_used": models_used,
        "warnings": warnings,
        "disclaimer": (
            "Analiz Google'in paylastigi ornek yorumlara (genelde en fazla 5) ve son 90 gun filtresine dayanir. "
            "Ciktida yalnizca yorum metninde gecen ifadeler korunur; tek model yerine cikarim + dogrulama kullanilir."
        ),
    }
