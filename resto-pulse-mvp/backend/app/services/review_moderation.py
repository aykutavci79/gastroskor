from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta, timezone

from app.models.entities import User

# Yaygin kufur/argo parcalari (leet + bitisik yazim).
_BLOCKED_FRAGMENTS = frozenset(
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
        "şerefsiz",
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
        "meme",
        "memeler",
    }
)

# Tek basina veya kisa turev (salak -> salakca).
_INSULT_STEMS = (
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

# Tam kelime eslesmesi (yanlis pozitif onleme).
_WHOLE_WORD_INSULTS = frozenset(
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
_WHOLE_WORD_PROFANITY = frozenset(
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
_SIK_SAFE_TOKENS = frozenset(
    {
        "sikinti",
        "sikintili",
        "sikintisiz",
        "sikke",
        "siklik",
    }
)

# Bosluklu ifadeler (normalize edilmis metinde aranir).
_PROFANITY_PHRASES = (
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


def _fold_turkish(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_review_text(value: str) -> str:
    folded = _fold_turkish(value).translate(_LEET)
    return re.sub(r"[^a-z0-9\s]", " ", folded)


def _token_is_insult(token: str) -> bool:
    if token in _WHOLE_WORD_INSULTS:
        return True
    for stem in _INSULT_STEMS:
        if token == stem:
            return True
        if token.startswith(stem) and len(token) <= len(stem) + 4:
            return True
    return False


def _token_is_profanity(token: str) -> bool:
    if token in _WHOLE_WORD_PROFANITY:
        return True
    if token.startswith("sik") and token not in _SIK_SAFE_TOKENS and len(token) <= 6:
        return True
    return False


def contains_prohibited_language(text: str) -> bool:
    cleaned = normalize_review_text(text)
    if not cleaned.strip():
        return False

    compact = cleaned.replace(" ", "")
    tokens = cleaned.split()
    spaced = f" {cleaned} "

    for phrase in _PROFANITY_PHRASES:
        if phrase in spaced or phrase.replace(" ", "") in compact:
            return True

    for token in tokens:
        if _token_is_insult(token):
            return True
        if _token_is_profanity(token):
            return True

    for fragment in _BLOCKED_FRAGMENTS:
        folded_fragment = _fold_turkish(fragment)
        if len(folded_fragment) >= 4 or folded_fragment in {
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
        }:
            if folded_fragment in compact:
                return True
        if any(token == folded_fragment for token in tokens):
            return True
        if any(token.startswith(folded_fragment) and len(token) <= len(folded_fragment) + 2 for token in tokens):
            return True

    # Harf aralikli kacinma: "a m k", "s i k"
    if len(tokens) >= 2:
        joined = "".join(token for token in tokens if len(token) == 1)
        for fragment in _BLOCKED_FRAGMENTS:
            if _fold_turkish(fragment) in joined:
                return True

    return False


def review_ban_message(user: User, *, now: datetime | None = None) -> str | None:
    now = now or datetime.now(timezone.utc)
    banned_until = user.review_banned_until
    if not banned_until:
        return None
    if banned_until.tzinfo is None:
        banned_until = banned_until.replace(tzinfo=timezone.utc)
    if banned_until <= now:
        return None

    remaining = banned_until - now
    days = max(1, remaining.days)
    if days >= 30:
        return (
            f"Topluluk kurallari nedeniyle yorum yazma hakkiniz gecici olarak kapali. "
            f"Kalan sure: yaklasik {days} gun. "
            f"Saygin ve yapici dil kullanin."
        )
    return (
        f"Topluluk kurallari nedeniyle yorum yazma hakkiniz gecici olarak kapali. "
        f"Kalan sure: {days} gun. "
        f"Saygin ve yapici dil kullanin."
    )


def register_profanity_strike(user: User, *, now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    user.review_moderation_strikes = int(user.review_moderation_strikes or 0) + 1
    strikes = user.review_moderation_strikes

    if strikes == 1:
        return "Argo/küfür içeren yorumlar yayınlanamamaktadır."
    if strikes == 2:
        user.review_banned_until = now + timedelta(days=7)
        return (
            "Yorumunuz yayinlanmadi. Ikinci ihlal: 7 gun boyunca yorum yazamazsiniz. "
            "Lutfen yapici ve nazik bir dil kullanin."
        )

    user.review_banned_until = now + timedelta(days=90)
    return (
        "Yorumunuz yayinlanmadi. Tekrarlayan ihlal: 3 ay boyunca yorum yazamazsiniz. "
        "Topluluk kalitesini korumak icin bu adim zorunludur."
    )


def enforce_review_author_policy(user: User, review_text: str) -> None:
    """Raises ValueError with user-facing Turkish message when blocked."""
    ban = review_ban_message(user)
    if ban:
        raise ValueError(ban)

    if not review_text.strip():
        return

    if contains_prohibited_language(review_text):
        raise ValueError(register_profanity_strike(user))
