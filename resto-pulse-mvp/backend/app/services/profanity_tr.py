"""Turkce yorum moderasyonu — kufur/argo sozlukleri ve eslestirme.

Liste guncellemeleri bu dosyada yapilir. Ileride Faz C: panelden yonetim.
"""

from __future__ import annotations

import re
import unicodedata

# Yaygin kufur/argo parcalari (leet + bitisik yazim).
BLOCKED_FRAGMENTS = frozenset(
    {
        "amk",
        "amq",
        "aq",
        "amina",
        "aminakoy",
        "aminakoyim",
        "aminakoyayim",
        "anani",
        "ananin",
        "ananı",
        "sikgibi",
        "siktir",
        "siktirgit",
        "sikerim",
        "sikeyim",
        "sikti",
        "siktiriboktan",
        "sikik",
        "sikmis",
        "sikiyor",
        "sicti",
        "sictir",
        "sktr",
        "skerim",
        "orospu",
        "orosp",
        "orsp",
        "orosbu",
        "orosbucocugu",
        "pic",
        "piç",
        "pici",
        "got",
        "göt",
        "gotten",
        "gott",
        "gtdelig",
        "götveren",
        "gotveren",
        "kahpe",
        "kaltak",
        "pezevenk",
        "yavşak",
        "yavsak",
        "ibne",
        "ibnesi",
        "oç",
        "oc",
        "sg",
        "s.g",
        "mk",
        "mq",
        "amcık",
        "amcik",
        "yarrak",
        "yarak",
        "taşak",
        "tasak",
        "tasaklar",
        "bok",
        "boktan",
        "bokgibi",
        "serefsiz",
        "şerefsiz",
        "gavat",
        "geber",
        "oldur",
        "öl",
        "sokuk",
        "soktugum",
        "sokum",
        "anneni",
        "annene",
        "sulaleni",
        "koduğum",
        "kodugum",
        "puşt",
        "pust",
        "dalyarak",
        "dallama",
        "embesil",
        "haysiyetsiz",
        "it",
        "itoğlu",
        "itoglu",
        "kancik",
        "kancık",
        "fahise",
        "fahişe",
        "kevaşe",
        "kevase",
        "dangalak",
        "hıyar",
        "hiyar",
        "malafat",
    }
)

# Tek basina veya kisa turev (salak -> salakca).
INSULT_STEMS = (
    "salak",
    "aptal",
    "gerizekali",
    "gerizekal",
    "budala",
    "enayi",
    "ahmak",
    "dangalak",
    "beyinsiz",
    "kafasiz",
    "haysiyetsiz",
    "adi",
    "rezil",
    "igrenc",
    "iğrenc",
    "embesil",
    "dallama",
)

# Tam kelime hakaret (yanlis pozitif onleme).
WHOLE_WORD_INSULTS = frozenset(
    {
        "mal",
        "moron",
        "idiot",
        "salak",
        "aptal",
        "enayi",
        "ahmak",
        "budala",
        "it",
    }
)

# Acik kufur tokenlari (tam kelime).
WHOLE_WORD_PROFANITY = frozenset(
    {
        "sik",
        "sikti",
        "siker",
        "sikik",
        "sikmis",
        "siktir",
        "sicti",
        "sictir",
        "amk",
        "amq",
        "aq",
        "mk",
        "mq",
        "oc",
        "sg",
        "orospu",
        "orosp",
        "pic",
        "got",
        "göt",
        "bok",
        "yarak",
        "yarrak",
        "tasak",
        "amcik",
        "amcık",
        "ibne",
        "gavat",
        "kahpe",
        "kaltak",
        "pezevenk",
        "yavsak",
        "yavşak",
        "pust",
        "puşt",
        "kancik",
        "kancık",
        "sokuk",
        "anneni",
    }
)

# sik* ile baslayan masum kelimeler.
SIK_SAFE_TOKENS = frozenset(
    {
        "sikinti",
        "sikintili",
        "sikintisiz",
        "sikke",
        "siklik",
    }
)

# Bosluklu ifadeler (normalize edilmis metinde aranir).
PROFANITY_PHRASES = (
    "sik gibi",
    "bok gibi",
    "amk gibi",
    "aq gibi",
    "siktir git",
    "siktir ol",
    "siktir olup",
    "anani si",
    "ananı si",
    "gotunu",
    "götünü",
)

# Kisa fragmentler icin bitisik metin taramasi (sik/ananas gibi false positive onlenir).
SHORT_COMPACT_FRAGMENTS = frozenset(
    {
        "amk",
        "amq",
        "aq",
        "mk",
        "mq",
        "sg",
        "oc",
        "bok",
        "pic",
        "got",
        "ibne",
    }
)

_LEET = str.maketrans(
    {
        "@": "a",
        "4": "a",
        "1": "i",
        "!": "i",
        "0": "o",
        "3": "e",
        "$": "s",
        "5": "s",
        "7": "t",
        "*": "",
        ".": "",
        "-": "",
        "_": "",
    }
)


def fold_turkish(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_review_text(value: str) -> str:
    folded = fold_turkish(value).translate(_LEET)
    return re.sub(r"[^a-z0-9\s]", " ", folded)


def token_is_insult(token: str) -> bool:
    if token in WHOLE_WORD_INSULTS:
        return True
    for stem in INSULT_STEMS:
        if token == stem:
            return True
        if token.startswith(stem) and len(token) <= len(stem) + 4:
            return True
    return False


def token_is_profanity(token: str) -> bool:
    if token in WHOLE_WORD_PROFANITY:
        return True
    if token.startswith("sik") and token not in SIK_SAFE_TOKENS and len(token) <= 6:
        return True
    return False


def _token_matches_blocked_fragment(token: str) -> bool:
    for fragment in BLOCKED_FRAGMENTS:
        folded_fragment = fold_turkish(fragment)
        if token == folded_fragment:
            return True
        if token.startswith(folded_fragment) and len(token) <= len(folded_fragment) + 2:
            return True
    return False


def _token_is_flagged(token: str) -> bool:
    if token_is_insult(token) or token_is_profanity(token):
        return True
    return _token_matches_blocked_fragment(token)


def find_prohibited_highlights(text: str) -> list[str]:
    """Orijinal metinde vurgulanacak parcalar (ban yok, kullaniciya gosterim)."""
    if not text.strip():
        return []

    highlights: list[str] = []
    seen: set[str] = set()

    def add(snippet: str) -> None:
        snippet = snippet.strip()
        if not snippet:
            return
        key = fold_turkish(snippet)
        if key in seen:
            return
        seen.add(key)
        highlights.append(snippet)

    for match in re.finditer(r"\S+", text):
        word = match.group()
        norm = normalize_review_text(word)
        for token in norm.split():
            if _token_is_flagged(token):
                add(word)
                break

    for phrase in PROFANITY_PHRASES:
        parts = phrase.split()
        if len(parts) < 2:
            continue
        pattern = r"(?i)" + r"\s+".join(re.escape(part) for part in parts)
        for m in re.finditer(pattern, text):
            add(m.group())

    return highlights


def contains_prohibited_language(text: str) -> bool:
    cleaned = normalize_review_text(text)
    if not cleaned.strip():
        return False

    compact = cleaned.replace(" ", "")
    tokens = cleaned.split()
    spaced = f" {cleaned} "

    for phrase in PROFANITY_PHRASES:
        if phrase in spaced or phrase.replace(" ", "") in compact:
            return True

    for token in tokens:
        if token_is_insult(token):
            return True
        if token_is_profanity(token):
            return True

    for fragment in BLOCKED_FRAGMENTS:
        folded_fragment = fold_turkish(fragment)
        if len(folded_fragment) >= 4 or folded_fragment in SHORT_COMPACT_FRAGMENTS:
            if folded_fragment in compact:
                return True
        if any(token == folded_fragment for token in tokens):
            return True
        if any(token.startswith(folded_fragment) and len(token) <= len(folded_fragment) + 2 for token in tokens):
            return True

    if len(tokens) >= 2:
        joined = "".join(token for token in tokens if len(token) == 1)
        for fragment in BLOCKED_FRAGMENTS:
            if fold_turkish(fragment) in joined:
                return True

    return False
