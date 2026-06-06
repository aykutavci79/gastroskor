"""Gurme Sohbetler — takma ad ve avatar kurallari."""

from __future__ import annotations

import re
import unicodedata

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import User
from app.services.profanity_tr import contains_prohibited_language, find_prohibited_highlights

NICKNAME_MIN_LEN = 3
NICKNAME_MAX_LEN = 24

NICKNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_\u00c7\u00e7\u011e\u011f\u0130\u0131\u00d6\u00f6\u015e\u015f\u00dc\u00fc]+$")

AVATAR_PRESET_IDS = frozenset(
    {
        "chef",
        "olive",
        "coffee",
        "doner",
        "dessert",
        "spice",
    }
)

RESERVED_NICKNAMES = frozenset(
    {
        "admin",
        "asistan",
        "bot",
        "destek",
        "gastroskor",
        "help",
        "moderator",
        "moderasyon",
        "sistem",
        "system",
        "yardim",
    }
)


class NicknameValidationError(Exception):
    def __init__(self, message: str, highlights: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.highlights = highlights or []


def normalize_nickname(value: str) -> str:
    return unicodedata.normalize("NFKC", value.strip())


def nickname_identity_key(value: str) -> str:
    """Benzersizlik karsilastirmasi — buyuk/kucuk harf ve Turkce I/İ ayni sayilir."""
    return normalize_nickname(value).casefold()


def validate_nickname_format(nickname: str) -> None:
    if len(nickname) < NICKNAME_MIN_LEN:
        raise NicknameValidationError(f"Takma ad en az {NICKNAME_MIN_LEN} karakter olmali.")
    if len(nickname) > NICKNAME_MAX_LEN:
        raise NicknameValidationError(f"Takma ad en fazla {NICKNAME_MAX_LEN} karakter olabilir.")
    if not NICKNAME_PATTERN.match(nickname):
        raise NicknameValidationError(
            "Takma ad yalnizca harf, rakam ve alt cizgi icerebilir (bosluk yok)."
        )
    lowered = nickname.lower()
    if lowered in RESERVED_NICKNAMES:
        raise NicknameValidationError("Bu takma ad kullanilamaz.")
    if contains_prohibited_language(nickname):
        highlights = find_prohibited_highlights(nickname)
        raise NicknameValidationError("Takma ad uygun degil.", highlights)


def nickname_taken(db: Session, nickname: str, *, exclude_user_id=None) -> bool:
    lowered = normalize_nickname(nickname).lower()
    stmt = select(User.id).where(func.lower(User.nickname) == lowered)
    if exclude_user_id is not None:
        stmt = stmt.where(User.id != exclude_user_id)
    return db.scalar(stmt) is not None


def check_nickname_available(db: Session, nickname: str, *, exclude_user_id=None) -> NicknameValidationError | None:
    try:
        normalized = normalize_nickname(nickname)
        validate_nickname_format(normalized)
    except NicknameValidationError as exc:
        return exc
    if nickname_taken(db, normalized, exclude_user_id=exclude_user_id):
        return NicknameValidationError("Bu takma ad zaten alinmis.")
    return None


def validate_avatar_preset(preset: str | None) -> None:
    if preset is None:
        return
    if preset not in AVATAR_PRESET_IDS:
        raise NicknameValidationError("Gecersiz avatar secimi.")


def public_user_avatar(user: User | None) -> tuple[str | None, str | None]:
    """(avatar_url, avatar_preset) — preset seciliyse URL bos birakilir."""
    if not user:
        return None, None
    if user.avatar_preset:
        return None, user.avatar_preset
    return user.avatar_url, None
