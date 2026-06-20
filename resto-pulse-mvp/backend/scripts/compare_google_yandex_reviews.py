"""Google vs Yandex review coverage probe for Bursa iskender venues."""

import json
import re
import ssl
import time
from urllib.parse import quote_plus

import httpx
import truststore

truststore.inject_into_ssl()

from app.core.config import settings

VENUES = [
    "Uludağ Kebapçısı Cemal Cemil Usta Bursa",
    "Kebapçı Tamer Bursa",
    "Tarihi Mavi Dükkan İskender 1867 Bursa",
    "İskender Efendi Konağı Bursa",
    "İSKENDER Tarihi Ahşap Dükkan Bursa",
    "Tarihi Yıldız Kebap Bursa",
    "Öz Kayıhan Pideli köfte Bursa",
]

BURSA_LL = "29.0610,40.1885"  # lon,lat for Yandex


def google_lookup(query: str) -> dict:
    key = settings.google_places_api_key
    if not key:
        return {"error": "no_google_key"}
    with httpx.Client(timeout=20.0) as client:
        search = client.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params={
                "query": query,
                "key": key,
                "language": "tr",
                "region": "tr",
            },
        ).json()
        results = search.get("results") or []
        if not results:
            return {"found": False}
        top = results[0]
        place_id = top.get("place_id")
        details = client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": "name,rating,user_ratings_total,reviews,url",
                "key": key,
                "language": "tr",
            },
        ).json()
        result = (details.get("result") or {})
        reviews = result.get("reviews") or []
        return {
            "found": True,
            "name": result.get("name") or top.get("name"),
            "rating": result.get("rating") or top.get("rating"),
            "review_count": result.get("user_ratings_total") or top.get("user_ratings_total"),
            "review_text_samples": len(reviews),
            "has_review_text": bool(reviews),
            "url": result.get("url"),
        }


def _parse_yandex_counts(html: str) -> dict:
    out: dict = {}
    # JSON-LD aggregateRating
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        try:
            data = json.loads(block)
        except json.JSONDecodeError:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            rating = item.get("aggregateRating") if isinstance(item, dict) else None
            if isinstance(rating, dict):
                out["rating"] = float(rating.get("ratingValue")) if rating.get("ratingValue") else None
                out["review_count"] = int(rating.get("reviewCount") or rating.get("ratingCount") or 0)
    # visible text fallback: "123 değerlendirme" / "123 оцен"
    if "review_count" not in out:
        m = re.search(r"(\d[\d\s\.]*)\s*(değerlendirme|degerlendirme|yorum|review|оцен)", html, re.I)
        if m:
            out["review_count"] = int(re.sub(r"\D", "", m.group(1)) or 0)
    m2 = re.search(r'ratingValue["\']?\s*:\s*([0-9.]+)', html)
    if m2 and "rating" not in out:
        out["rating"] = float(m2.group(1))
    title = re.search(r"<title>([^<]+)</title>", html, re.I)
    if title:
        out["page_title"] = title.group(1).strip()
    return out


def yandex_lookup(query: str) -> dict:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9",
    }
    url = (
        "https://yandex.com.tr/maps/"
        f"?text={quote_plus(query)}&ll={BURSA_LL}&spn=0.4,0.4&lang=tr_TR"
    )
    with httpx.Client(timeout=25.0, headers=headers, follow_redirects=True) as client:
        r = client.get(url)
        html = r.text
    parsed = _parse_yandex_counts(html)
    found = bool(parsed.get("review_count") or parsed.get("rating") or "kebap" in html.lower() or "iskender" in html.lower())
    return {
        "found": found,
        "rating": parsed.get("rating"),
        "review_count": parsed.get("review_count"),
        "has_review_text_in_html": bool(re.search(r'"reviewBody"|review-text|business-review', html, re.I)),
        "page_title": parsed.get("page_title"),
        "note": "public HTML only — no official review API",
    }


def main() -> None:
    rows = []
    for query in VENUES:
        print("checking", query)
        g = google_lookup(query)
        time.sleep(0.3)
        y = yandex_lookup(query)
        time.sleep(0.8)
        rows.append({"query": query, "google": g, "yandex": y})
    print(json.dumps(rows, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
