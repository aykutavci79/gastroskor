from __future__ import annotations

AUTHOR_NAME_DISPLAY_FULL = "full"
AUTHOR_NAME_DISPLAY_MASKED = "masked"


def normalize_author_name_display(value: str | None) -> str:
    if value == AUTHOR_NAME_DISPLAY_MASKED:
        return AUTHOR_NAME_DISPLAY_MASKED
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
    fallback: str = "GastroSkor Üyesi",
) -> str:
    if not full_name or not full_name.strip():
        return fallback
    if normalize_author_name_display(display) == AUTHOR_NAME_DISPLAY_MASKED:
        return mask_person_name(full_name)
    return full_name.strip()
