"""Sosyal kanit — sehir urun niyetleri, on-isitma listesi ve arama eslemeleri.

Dis taramada YALNIZCA urun/yemek ifadeleri kullanilir; mekan adi ile arama yapilmaz.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.services.profanity_tr import normalize_review_text


def _norm(value: str) -> str:
    from app.services.turkish_text_fold import fold_tr_ascii

    return fold_tr_ascii(normalize_review_text(value).strip().lower())


@dataclass(frozen=True)
class ProductScanIntent:
    search_group: str
    label: str
    live_search_query: str
    external_scan_queries: tuple[str, ...]
    query_aliases: tuple[str, ...]


def _intent(
    *,
    search_group: str,
    label: str,
    product_phrase: str,
    city: str,
    aliases: tuple[str, ...] = (),
) -> ProductScanIntent:
    city_label = city.strip()
    base = f"{product_phrase} {city_label}".strip()
    external = (
        f"en iyi {product_phrase} {city_label}",
        f"{product_phrase} {city_label} tavsiye",
        f"{city_label} {product_phrase} nerede yenir",
        f"meshur {product_phrase} {city_label}",
    )
    live_q = f"en iyi {product_phrase}"
    alias_set = (
        live_q,
        product_phrase,
        f"en iyi {product_phrase}",
        f"meshur {product_phrase}",
        f"{product_phrase} nerede yenir",
        *aliases,
    )
    return ProductScanIntent(
        search_group=search_group,
        label=label,
        live_search_query=live_q,
        external_scan_queries=external,
        query_aliases=alias_set,
    )


def _kebap_extra_aliases(short: str) -> tuple[str, ...]:
    """Kebap urunleri — marka degil; meşhur X kebapcisi = urun niyeti."""
    return (
        f"{short} kebap",
        f"{short} kebabi",
        f"{short} kebab",
        f"en iyi {short} kebap",
        f"meshur {short} kebabi",
        f"meshur {short} kebap",
        f"meshur {short} kebapcisi",
        f"{short} nerede yenir",
        f"best {short} kebab",
        f"turkish {short} kebab",
    )


def _bursa_geo_extra(*, synonyms: tuple[str, ...] = (), bursa_prefixed: str | None = None) -> tuple[str, ...]:
    """Coğrafi işaretli / yöresel urun ek aliaslari."""
    rows: list[str] = list(synonyms)
    if bursa_prefixed:
        rows.extend(
            (
                bursa_prefixed,
                f"en iyi {bursa_prefixed}",
                f"meshur {bursa_prefixed}",
                f"{bursa_prefixed} nerede yenir",
                f"bursa {bursa_prefixed}",
            )
        )
    return tuple(rows)


def bursa_prewarm_intents(city: str = "Bursa") -> tuple[ProductScanIntent, ...]:
    return (
        _intent(
            search_group="iskender",
            label="Iskender",
            product_phrase="iskender",
            city=city,
            aliases=(
                "iskender kebap",
                "iskender kebab",
                "bursa kebab",
                "bursa kebabi",
                "en iyi iskender kebap",
                "en iyi iskender",
                "en iyi bursa kebabi",
                "bursa kebabi nerede yenir",
                "iskender nerede yenir",
                "meshur bursa kebabi",
                "meshur iskender",
                "bursa iskender",
                "iskender bursa",
                "en iyi iskender bursa",
                "en iyi iskender istanbul",
                "iskender istanbul",
                "en iyi bursa kebabi bursa",
                "uludag kebabi",
                "iskender doner",
                "bursa doner",
                "best iskender kebab",
                "turkish iskender kebab",
            ),
        ),
        _intent(
            search_group="adana-kebap",
            label="Adana Kebap",
            product_phrase="adana kebap",
            city=city,
            aliases=_kebap_extra_aliases("adana"),
        ),
        _intent(
            search_group="urfa-kebap",
            label="Urfa Kebap",
            product_phrase="urfa kebap",
            city=city,
            aliases=_kebap_extra_aliases("urfa"),
        ),
        _intent(
            search_group="tepsi-kebap",
            label="Tepsi Kebap",
            product_phrase="tepsi kebap",
            city=city,
            aliases=(
                *_kebap_extra_aliases("tepsi"),
                "tepsi kebabi",
                "meshur tepsi kebapcisi",
            ),
        ),
        _intent(
            search_group="pideli-kofte",
            label="Pideli Kofte",
            product_phrase="pideli kofte",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("bursa pideli kofte", "pideli kofte bursa", "meshur pideli kofteci"),
                bursa_prefixed="pideli kofte",
            ),
        ),
        _intent(
            search_group="cantik",
            label="Cantik",
            product_phrase="cantik",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=(
                    "bursa cantik",
                    "bursa cantigi",
                    "kiymali cantik",
                    "kusbasili cantik",
                    "meshur cantikci",
                ),
                bursa_prefixed="cantik",
            ),
        ),
        _intent(
            search_group="pide",
            label="Pide",
            product_phrase="pide",
            city=city,
            aliases=(
                "kiymali pide",
                "kusbasili pide",
                "tahinli pide",
                "bursa tahinli pide",
                "patlicanli pide",
                "meshur pideci",
                "en iyi pide bursa",
            ),
        ),
        _intent(
            search_group="lahmacun",
            label="Lahmacun",
            product_phrase="lahmacun",
            city=city,
            aliases=(
                "acili lahmacun",
                "meshur lahmacuncu",
                "en iyi lahmacun bursa",
                "lahmacun bursa",
            ),
        ),
        _intent(
            search_group="doner",
            label="Doner / Durum",
            product_phrase="doner",
            city=city,
            aliases=("doner durum", "durum", "en iyi doner bursa"),
        ),
        _intent(
            search_group="piyaz",
            label="Piyaz",
            product_phrase="piyaz",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("inegol piyazi", "inegol piyaz", "meshur piyaz"),
                bursa_prefixed="piyaz",
            ),
        ),
        _intent(
            search_group="manti",
            label="Manti",
            product_phrase="manti",
            city=city,
            aliases=("bursa manti", "meshur manti", "en iyi manti bursa"),
        ),
        _intent(
            search_group="kuru-fasulye",
            label="Kuru Fasulye",
            product_phrase="kuru fasulye",
            city=city,
            aliases=(
                "bursa kuru fasulye",
                "pilav ustu kuru fasulye",
                "meshur kuru fasulyeci",
                "en iyi kuru fasulye bursa",
            ),
        ),
        _intent(
            search_group="izgara-tavuk",
            label="Izgara Tavuk",
            product_phrase="izgara tavuk",
            city=city,
            aliases=(
                "tavuk izgara",
                "izgara kanat",
                "tavuk kanat",
                "en iyi tavuk izgara bursa",
                "meshur tavukcu",
            ),
        ),
        _intent(
            search_group="inegol-kofte",
            label="Inegol Kofte",
            product_phrase="inegol kofte",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=(
                    "inegol koftesi",
                    "meshur inegol kofteci",
                    "en iyi inegol kofte",
                ),
                bursa_prefixed="inegol kofte",
            ),
        ),
        _intent(
            search_group="kemalpasa-tatlisi",
            label="Kemalpasa Tatlisi",
            product_phrase="kemalpasa tatlisi",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=(
                    "kemalpasa tatlısı",
                    "mustafakemalpasa tatlisi",
                    "mustafakemalpasa peynir tatlisi",
                ),
                bursa_prefixed="kemalpasa tatlisi",
            ),
        ),
        _intent(
            search_group="cevizli-lokum",
            label="Cevizli Lokum",
            product_phrase="cevizli lokum",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("bursa cevizli lokum", "meshur cevizli lokum"),
                bursa_prefixed="cevizli lokum",
            ),
        ),
        _intent(
            search_group="sut-helvasi",
            label="Bursa Sut Helvasi",
            product_phrase="sut helvasi",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("bursa sut helvasi", "sut helvasi bursa"),
                bursa_prefixed="sut helvasi",
            ),
        ),
        _intent(
            search_group="inegol-sutlu-kadayif",
            label="Inegol Sutlu Kadayif",
            product_phrase="inegol sutlu kadayif",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("sutlu kadayif", "inegol kadayif", "meshur kadayifci"),
                bursa_prefixed="sutlu kadayif",
            ),
        ),
        _intent(
            search_group="hinkali",
            label="Hinkali",
            product_phrase="hinkali",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("zeyniler hinkali", "hınkalı", "meshur hinkali"),
                bursa_prefixed="hinkali",
            ),
        ),
        _intent(
            search_group="inegol-buryani",
            label="Inegol Buryani",
            product_phrase="inegol buryani",
            city=city,
            aliases=_bursa_geo_extra(
                synonyms=("inegol misori", "misori", "meshur buryani"),
                bursa_prefixed="buryani",
            ),
        ),
    )


_ALIAS_TO_GROUP: dict[str, str] = {}
_INTENT_BY_GROUP: dict[str, ProductScanIntent] = {}


def _register_intents() -> None:
    if _INTENT_BY_GROUP:
        return
    for intent in bursa_prewarm_intents():
        _INTENT_BY_GROUP[intent.search_group] = intent
        for alias in intent.query_aliases:
            key = _norm(alias)
            if key and key not in _ALIAS_TO_GROUP:
                _ALIAS_TO_GROUP[key] = intent.search_group
        key = _norm(intent.live_search_query)
        if key:
            _ALIAS_TO_GROUP[key] = intent.search_group


_SEARCH_FILLERS = (
    "en iyi",
    "meshur",
    "meşhur",
    "nerede yenir",
    "nerede yenilir",
    "tavsiye",
    "oneri",
    "öneri",
    "kebapcisi",
    "kebapçısı",
    "kebapci",
    "kebapçı",
    "lahmacuncu",
    "kofteci",
    "köfteci",
    "pideci",
    "cantikci",
    "cantıkçı",
    "tavukcu",
    "tavukçu",
)


def _strip_search_filler(normalized: str) -> str:
    text = normalized.strip()
    for filler in _SEARCH_FILLERS:
        text = text.replace(filler, " ")
    return " ".join(text.split())


def build_ad_hoc_scan_intent(query: str, *, city: str) -> ProductScanIntent:
    """Katalog disi sorgular — or. en iyi mezeci, balik restorani."""
    normalized = _norm(query)
    city_fold = _norm(city)
    if city_fold and normalized.endswith(f" {city_fold}"):
        normalized = normalized[: -len(city_fold)].strip()

    product_phrase = _strip_search_filler(normalized) or normalized
    if not product_phrase:
        product_phrase = _norm(query) or "ozel"

    slug = product_phrase.replace(" ", "-")[:48]
    search_group = f"adhoc-{slug}"
    city_label = city.strip() or "Bursa"
    external = (
        f"en iyi {product_phrase} {city_label}",
        f"{product_phrase} {city_label} tavsiye",
        f"{city_label} {product_phrase} nerede yenir",
        query.strip(),
    )
    live_q = product_phrase
    return ProductScanIntent(
        search_group=search_group,
        label=product_phrase.title(),
        live_search_query=live_q,
        external_scan_queries=external,
        query_aliases=(query.strip(), product_phrase),
    )


def resolve_scan_context(query: str, *, city: str | None = None) -> ProductScanIntent:
    """Katalog veya ad-hoc — her arama icin tarama baglami."""
    intent = resolve_product_scan_intent(query, city=city)
    if intent is not None:
        return intent
    return build_ad_hoc_scan_intent(query, city=city or "Bursa")


def resolve_product_scan_intent(query: str, *, city: str | None = None) -> ProductScanIntent | None:
    """Kullanici veya on-isitma sorgusunu kanonik urun niyetine cevir."""
    _register_intents()
    normalized = _norm(query)
    if not normalized:
        return None

    city_fold = _norm(city or "")
    if city_fold and normalized.endswith(f" {city_fold}"):
        normalized = normalized[: -len(city_fold)].strip()

    best_group: str | None = None
    best_len = 0
    for alias_key, group in _ALIAS_TO_GROUP.items():
        if len(alias_key) < 3:
            continue
        if alias_key in normalized or normalized in alias_key:
            if len(alias_key) > best_len:
                best_len = len(alias_key)
                best_group = group

    if best_group:
        return _INTENT_BY_GROUP.get(best_group)

    from app.constants.voice_product_catalog import resolve_voice_search_token

    token, _ = resolve_voice_search_token(normalized)
    if token and token in _INTENT_BY_GROUP:
        return _INTENT_BY_GROUP[token]
    return None


def list_prewarm_intents_for_city(city: str) -> tuple[ProductScanIntent, ...]:
    _register_intents()
    city_key = _norm(city)
    if city_key in {"bursa", ""}:
        return bursa_prewarm_intents(city or "Bursa")
    return tuple(_INTENT_BY_GROUP.values())
