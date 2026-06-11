"""Online siparis — mutfak etiketleri (daraltılmış liste)."""

from __future__ import annotations

ONLINE_ORDER_CATEGORIES: tuple[dict[str, str], ...] = (
    {"slug": "tatli-tuzlu", "label": "Tatlı & Tuzlu"},
    {"slug": "doner", "label": "Döner"},
    {"slug": "kebap-izgara", "label": "Kebap & Izgara"},
    {"slug": "firin", "label": "Fırın"},
    {"slug": "sokak", "label": "Sokak Lezzetleri"},
    {"slug": "burger", "label": "Burger"},
    {"slug": "ev-yemekleri", "label": "Ev Yemekleri"},
    {"slug": "kahvalti", "label": "Kahvaltı"},
    {"slug": "kahve", "label": "Kahve & İçecek"},
    {"slug": "deniz", "label": "Deniz Ürünleri"},
    {"slug": "salata-fit", "label": "Salata & Fit"},
)

VALID_CATEGORY_SLUGS = frozenset(row["slug"] for row in ONLINE_ORDER_CATEGORIES)

LEGACY_CATEGORY_SLUG_MAP: dict[str, str] = {
    "pasta-tatli": "tatli-tuzlu",
    "pastane-firin": "tatli-tuzlu",
    "baklava": "tatli-tuzlu",
    "kahve-icecek": "kahve",
    "tavuk": "kebap-izgara",
    "kebap": "kebap-izgara",
    "kofte": "kebap-izgara",
    "steak": "kebap-izgara",
    "pizza": "firin",
    "pide-lahmacun": "firin",
    "cig-kofte": "sokak",
    "tantuni": "sokak",
    "tost-sandwich": "sokak",
    "sokak-lezzetleri": "sokak",
    "manti-makarna": "ev-yemekleri",
    "dunya-mutfagi": "ev-yemekleri",
    "deniz-urunleri": "deniz",
    "salata": "salata-fit",
    "meze": "salata-fit",
    "vejetaryen": "salata-fit",
    "fit": "salata-fit",
}


def normalize_category_slugs(raw: list[str] | None) -> list[str]:
    if not raw:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for item in raw:
        slug = (item or "").strip().lower()
        slug = LEGACY_CATEGORY_SLUG_MAP.get(slug, slug)
        if not slug or slug not in VALID_CATEGORY_SLUGS or slug in seen:
            continue
        seen.add(slug)
        out.append(slug)
    return out


def category_label(slug: str) -> str:
    for row in ONLINE_ORDER_CATEGORIES:
        if row["slug"] == slug:
            return row["label"]
    legacy = LEGACY_CATEGORY_SLUG_MAP.get(slug)
    if legacy:
        return category_label(legacy)
    return slug
