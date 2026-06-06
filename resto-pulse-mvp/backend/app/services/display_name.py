from __future__ import annotations

AUTHOR_NAME_DISPLAY_FULL = "full"
AUTHOR_NAME_DISPLAY_MASKED = "masked"
AUTHOR_NAME_DISPLAY_NICKNAME = "nickname"


def normalize_author_name_display(value: str | None) -> str:
    if value == AUTHOR_NAME_DISPLAY_MASKED:
        return AUTHOR_NAME_DISPLAY_MASKED
    if value == AUTHOR_NAME_DISPLAY_NICKNAME:
        return AUTHOR_NAME_DISPLAY_NICKNAME
    return AUTHOR_NAME_DISPLAY_FULL


def mask_person_name(name: str | None) -> str:
    """Ornek: Aykut Avcı -> ay*** av***"""
    if not name or not name.strip():
        return "GastroSkor Üyesi"
    parts = name.strip().split()
    masked: list[str] = []
    for part in parts:
        if len(part) >= 2:
            masked.append(f"{part[:2].lower()}***")
        elif len(part) == 1:
            masked.append(f"{part[0].lower()}***")
    return " ".join(masked) if masked else "GastroSkor Üyesi"


def public_author_name(
    full_name: str | None,
    display: str | None,
    *,
    nickname: str | None = None,
    fallback: str = "GastroSkor Üyesi",
) -> str:
    mode = normalize_author_name_display(display)
    if mode == AUTHOR_NAME_DISPLAY_NICKNAME:
        if nickname and nickname.strip():
            return nickname.strip()
        if full_name and full_name.strip():
            return full_name.strip()
        return fallback
    if not full_name or not full_name.strip():
        return fallback
    if mode == AUTHOR_NAME_DISPLAY_MASKED:
        return mask_person_name(full_name)
    return full_name.strip()
