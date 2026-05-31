from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timedelta, timezone

from app.models.entities import User

# Küfür, argo ve yaygın kısaltmalar (küçük harf, aksan normalize).
_BLOCKED_FRAGMENTS = frozenset(
    {
        "amk",
        "amq",
        "aq",
        "amina",
        "aminakoy",
        "aminakoyim",
        "aminakoyayim",
        "siktir",
        "sikerim",
        "sikeyim",
        "sktr",
        "skerim",
        "orospu",
        "orosp",
        "orsp",
        "pic",
        "piç",
        "got",
        "göt",
        "gtdelig",
        "götveren",
        "kahpe",
        "kaltak",
        "pezevenk",
        "yavşak",
        "yavsak",
        "ibne",
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
        "bok",
        "serefsiz",
        "şerefsiz",
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


def _fold_turkish(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.casefold())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def normalize_review_text(value: str) -> str:
    folded = _fold_turkish(value).translate(_LEET)
    return re.sub(r"[^a-z0-9\s]", " ", folded)


def contains_prohibited_language(text: str) -> bool:
    cleaned = normalize_review_text(text)
    if not cleaned.strip():
        return False

    compact = cleaned.replace(" ", "")
    tokens = cleaned.split()

    for fragment in _BLOCKED_FRAGMENTS:
        folded_fragment = _fold_turkish(fragment)
        if folded_fragment in compact:
            return True
        if any(token == folded_fragment for token in tokens):
            return True
        if any(token.startswith(folded_fragment) and len(token) <= len(folded_fragment) + 2 for token in tokens):
            return True

    # Harf aralıklı kaçınma: "a m k"
    if len(tokens) >= 3:
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
        return (
            "Yorumunuz yayinlanmadi. GastroSkor saygin bir topluluktur; "
            "kufur, argo ve kisirlayici ifadeler kabul edilmez. Bu birinci uyaridir."
        )
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
