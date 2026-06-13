"""Sesli siparis — standart urun katalogu.

Her urunun:
- slug: siparis ve panelde kesin kod
- search_group: genel arama adi (or. cantik -> kiyma + kusbasi)
- aliases: sesli komut eslestirme
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class VoiceProduct:
    slug: str
    label: str
    search_group: str
    aliases: tuple[str, ...]
    sort_order: int = 0
    hint: str | None = None


VOICE_PRODUCTS: tuple[VoiceProduct, ...] = (
    VoiceProduct(
        slug="lahmacun",
        label="Lahmacun",
        search_group="lahmacun",
        aliases=("lahmacun", "lahmacunu", "lahmacunlar"),
        sort_order=10,
    ),
    VoiceProduct(
        slug="acili-lahmacun",
        label="Acili Lahmacun",
        search_group="lahmacun",
        aliases=("acili lahmacun", "aci lahmacun", "acili lahmacunu"),
        sort_order=11,
    ),
    VoiceProduct(
        slug="sutlac",
        label="Sutlac",
        search_group="sutlac",
        aliases=("sutlac", "sütlaç", "sutlas", "sutlach", "firin sutlac", "sutlac tatlisi"),
        sort_order=15,
    ),
    VoiceProduct(
        slug="baklava",
        label="Baklava",
        search_group="baklava",
        aliases=("baklava", "cevizli baklava", "fistikli baklava"),
        sort_order=16,
    ),
    VoiceProduct(
        slug="kunefe",
        label="Kunefe",
        search_group="kunefe",
        aliases=("kunefe", "künefe", "kaymakli kunefe"),
        sort_order=17,
    ),
    VoiceProduct(
        slug="borek",
        label="Borek",
        search_group="borek",
        aliases=("borek", "börek", "su boregi", "su böreği", "peynirli borek", "peynirli börek"),
        sort_order=18,
    ),
    VoiceProduct(
        slug="cantik-kiymali",
        label="Kiymali Cantik",
        search_group="cantik",
        aliases=("kiymali cantik", "kiymali cantık", "kiymali", "kiyma cantik"),
        sort_order=20,
        hint="Genel arama: cantik",
    ),
    VoiceProduct(
        slug="cantik-kusbasili",
        label="Kusbasili Cantik",
        search_group="cantik",
        aliases=("kusbasili cantik", "kusbasili cantık", "kusbasi cantik"),
        sort_order=21,
        hint="Genel arama: cantik",
    ),
    VoiceProduct(
        slug="pide",
        label="Pide",
        search_group="pide",
        aliases=("pide", "pidesi"),
        sort_order=30,
    ),
    VoiceProduct(
        slug="kiymali-pide",
        label="Kiymali Pide",
        search_group="pide",
        aliases=("kiymali pide",),
        sort_order=31,
    ),
    VoiceProduct(
        slug="adana-kebap",
        label="Adana Kebap",
        search_group="adana-kebap",
        aliases=("adana", "adana kebap", "adana kebabi"),
        sort_order=40,
    ),
    VoiceProduct(
        slug="urfa-kebap",
        label="Urfa Kebap",
        search_group="urfa-kebap",
        aliases=("urfa", "urfa kebap", "urfa kebabi"),
        sort_order=41,
    ),
    VoiceProduct(
        slug="kebap",
        label="Kebap",
        search_group="kebap",
        aliases=("kebap", "kebabi", "kebab"),
        sort_order=42,
    ),
    VoiceProduct(
        slug="doner-durum",
        label="Doner Durum",
        search_group="doner",
        aliases=("doner", "doner durum", "durum"),
        sort_order=50,
    ),
    VoiceProduct(
        slug="iskender",
        label="Iskender",
        search_group="iskender",
        aliases=("iskender", "iskender kebap"),
        sort_order=60,
    ),
    VoiceProduct(
        slug="ayran",
        label="Ayran",
        search_group="ayran",
        aliases=("ayran",),
        sort_order=70,
    ),
    VoiceProduct(
        slug="kola",
        label="Kola",
        search_group="kola",
        aliases=("kola", "cola"),
        sort_order=71,
    ),
    VoiceProduct(
        slug="su",
        label="Su",
        search_group="su",
        aliases=("su", "sise su"),
        sort_order=72,
    ),
    VoiceProduct(
        slug="kadayif",
        label="Kadayif",
        search_group="kadayif",
        aliases=("kadayif", "kadayifi", "sutlu kadayif", "kadayif tatlisi"),
        sort_order=73,
    ),
)

VALID_VOICE_PRODUCT_SLUGS = frozenset(p.slug for p in VOICE_PRODUCTS)

KEBAP_SEARCH_SLUGS = (
    "kebap",
    "adana-kebap",
    "urfa-kebap",
    "iskender",
    "doner-durum",
)

ADANA_KEBAP_SEARCH_SLUGS = ("adana-kebap", "kebap")
URFA_KEBAP_SEARCH_SLUGS = ("urfa-kebap", "kebap")


def _expand_group_slugs(group: str, slugs: list[str]) -> list[str]:
    if group == "kebap":
        return list(dict.fromkeys([*KEBAP_SEARCH_SLUGS, *slugs]))
    if group == "adana-kebap":
        return list(dict.fromkeys([*ADANA_KEBAP_SEARCH_SLUGS, *slugs]))
    if group == "urfa-kebap":
        return list(dict.fromkeys([*URFA_KEBAP_SEARCH_SLUGS, *slugs]))
    return slugs

_BY_SLUG: dict[str, VoiceProduct] = {p.slug: p for p in VOICE_PRODUCTS}
_BY_SEARCH_GROUP: dict[str, list[str]] = {}
_ALIAS_INDEX: dict[str, str] = {}


def _normalize_query(value: str) -> str:
    from app.services.turkish_text_fold import fold_tr_ascii

    return fold_tr_ascii(value)


for _product in VOICE_PRODUCTS:
    _BY_SEARCH_GROUP.setdefault(_product.search_group, []).append(_product.slug)
    _ALIAS_INDEX[_normalize_query(_product.slug)] = _product.slug
    _ALIAS_INDEX[_normalize_query(_product.search_group)] = _product.search_group
    for _alias in _product.aliases:
        _ALIAS_INDEX[_normalize_query(_alias)] = _product.slug


def get_voice_product(slug: str | None) -> VoiceProduct | None:
    if not slug:
        return None
    return _BY_SLUG.get(slug.strip().lower())


def is_valid_voice_product_slug(slug: str | None) -> bool:
    if not slug:
        return False
    return slug.strip().lower() in VALID_VOICE_PRODUCT_SLUGS


def resolve_voice_search_token(raw: str | None) -> tuple[str | None, list[str]]:
    """Kullanici ifadesini coz: (token, eslesen urun slug listesi).

    token search_group veya product slug olabilir.
    """
    key = _normalize_query(raw or "")
    if not key:
        return None, []

    if key in _BY_SEARCH_GROUP:
        slugs = _expand_group_slugs(key, list(_BY_SEARCH_GROUP[key]))
        return key, slugs

    slug = _ALIAS_INDEX.get(key)
    if slug and slug in _BY_SLUG:
        product = _BY_SLUG[slug]
        group = product.search_group
        slugs = _expand_group_slugs(group, list(_BY_SEARCH_GROUP.get(group, [slug])))
        return group, slugs

    if slug and slug in _BY_SEARCH_GROUP:
        slugs = _expand_group_slugs(slug, list(_BY_SEARCH_GROUP[slug]))
        return slug, slugs

    if key in _BY_SLUG:
        product = _BY_SLUG[key]
        return product.search_group, list(_BY_SEARCH_GROUP.get(product.search_group, [key]))

    return None, []


def catalog_payload() -> list[dict]:
    rows: list[dict] = []
    for product in sorted(VOICE_PRODUCTS, key=lambda p: (p.sort_order, p.label)):
        rows.append(
            {
                "slug": product.slug,
                "label": product.label,
                "search_group": product.search_group,
                "aliases": list(product.aliases),
                "hint": product.hint,
                "sort_order": product.sort_order,
            }
        )
    return rows


def catalog_groups_payload() -> list[dict]:
    """Panel UI — search_group bazli gruplama."""
    groups: dict[str, dict] = {}
    for product in sorted(VOICE_PRODUCTS, key=lambda p: (p.sort_order, p.label)):
        group = groups.setdefault(
            product.search_group,
            {
                "search_group": product.search_group,
                "search_label": _group_label(product.search_group),
                "products": [],
            },
        )
        group["products"].append(
            {
                "slug": product.slug,
                "label": product.label,
                "aliases": list(product.aliases),
                "hint": product.hint,
                "sort_order": product.sort_order,
            }
        )
    return sorted(groups.values(), key=lambda g: g["products"][0]["sort_order"])


def _group_label(search_group: str) -> str:
    if search_group == "cantik":
        return "Cantik"
    if search_group == "lahmacun":
        return "Lahmacun"
    if search_group == "pide":
        return "Pide"
    if search_group == "doner":
        return "Doner"
    product = _BY_SLUG.get(search_group)
    if product:
        return product.label
    return search_group.replace("-", " ").title()
