"""GastroSkor yöresel lezzet filtresi — restoran keşfi odaklı ürün seçimi.

TÜRKPATENT portalında aynı ilde granit, kilim, ham tarım ürünü vb. coğrafi işaretler
de listelenir. GastroSkor yalnızca yemek / fırın-pastane ve benzeri keşfedilebilir
lezzetleri gösterir.
"""

from __future__ import annotations

import re
import unicodedata

# Nice sınıfları — birincil yemek + fırın/pastane
GASTRO_PRIMARY_GROUP_IDS = frozenset({"51", "54"})

# Portal yanlış gruba düşürmüş yemekleri yakalamak için (köfte, simit dürüm vb.)
GASTRO_OVERFLOW_GROUP_IDS = frozenset({"32", "33"})

# İsimde geçerse her gruptan elenir (bıçak=alet, granit=mermer, vb.)
_EXCLUDE_PATTERN = re.compile(
    r"(?:"
    r"granit|mermer|par[sş][oö]men|parsomen|k[aâ]g[ıi]d[ıi]|"
    r"kilim|hal[ıi]\b|seramik|bak[ıi]r\b|tekstil|\bipek\b|fildi[sş]|"
    r"\bb[iı]c[aâ]g[iı]\b|\bb[iı]cak\b|"
    r"\btulum\s*peynir|\bpeyniri\b|"
    r"\bbiberi\b|\bdomatesi\b|\bfasulyesi\b|"
    r"[çc]am\s*f[ıi]st[ıi][gğ][ıi]|\bf[ıi]st[ıi][gğ][ıi]\b|"
    r"\bkavunu\b|\b[üu]zumu\b|\b[üu]zum\b|"
    r"\bfindi[gğ][ıi]\b|\bcevizi\b|\belmas[ıi]\b|\barmudu\b|"
    r"mayal[ıi]\s*ekme[gğ]|"
    r"\bbugday[ıi]\b|\bbugday\b|"
    r"\barslanlar\b|"
    r"\bjirki\s*kilim"
    r")",
    re.IGNORECASE | re.UNICODE,
)

# Exclude'a takılsa bile korunacak istisnalar (tatlı adları vb.)
_WHITELIST_PATTERN = re.compile(r"b[iı]cakara|tulumba", re.IGNORECASE | re.UNICODE)

# 32/33 grubundan yalnızca yemek desenine uyanlar alınır
_FOOD_DISH_PATTERN = re.compile(
    r"(?:"
    r"k[oö]fte|kebab|d[oö]ner|boyoz|kumru|mant[ıi]|b[oö]rek|tatl[ıi]|helva|lokma|"
    r"simid|d[uü]r[uü]m|durum|pide|corba|[çc]orba|yemek|g[oö]zleme|kunefe|baklava|"
    r"kaday[ıi]f|cant[ıi]k|iskender|lahmacun|midye|kokore[cç]|sucuk|past[ıi]rma|"
    r"bici\s*bici|halka|revani|tahinli|pideli|biryani|piyaz|hinkali|h[ıi]nkali|"
    r"simit|gevrek|sambali|menemen|[çc][iı]g\s*k[oö]fte|tandir|tandır|"
    r"burma|lokum|pogaca|po[gğ]a[cç]a|lahmacun|ci[ğg]k[oö]fte|"
    r"as[ıi]\b|h[üu]nk[aâ]r|kazan\s*dibi|"
    r"sis\s*k[oö]fte|[şs]i[sş]\s*k[oö]fte"
    r")",
    re.IGNORECASE | re.UNICODE,
)


def _normalize_label(value: str) -> str:
    text = unicodedata.normalize("NFKD", value.strip())
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return (
        text.casefold()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def product_label(*, name: str, aliases: tuple[str, ...] | list[str] = ()) -> str:
    parts = [name.strip(), *(alias.strip() for alias in aliases if alias and alias.strip())]
    return " / ".join(parts)


def is_gastro_regional_product(
    *,
    name: str,
    aliases: tuple[str, ...] | list[str] = (),
    product_group_id: str,
) -> bool:
    """Ürün GastroSkor yöresel lezzet vitrinine uygun mu?"""
    label = product_label(name=name, aliases=aliases)
    normalized = _normalize_label(label)

    if _WHITELIST_PATTERN.search(normalized):
        return True
    if _EXCLUDE_PATTERN.search(normalized):
        return False

    group = str(product_group_id)
    if group in GASTRO_PRIMARY_GROUP_IDS:
        return True
    if group in GASTRO_OVERFLOW_GROUP_IDS and _FOOD_DISH_PATTERN.search(normalized):
        return True
    return False
