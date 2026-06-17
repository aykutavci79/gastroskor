"""Mention baglam filtresi — ev yapimi, off-topic vb. ele."""

from __future__ import annotations

import re

from app.core.config import settings
from app.services.social_proof_matcher import RawMention

_NOISE_PATTERNS = re.compile(
    r"(evde\s+yap|ev\s+yapim|kayinvalide|kayinvalidem|kendi\s+basim|"
    r"para\s+vermeye\s+gerek|marketten\s+aldim|paket\s+iskender|"
    r"diyet|kalori\s+say|oglende\s+evde)",
    re.IGNORECASE,
)

_RESTAURANT_HINT = re.compile(
    r"(gittik|yedim|yedik|tavsiye|onerir|restoran|kebapci|dukkan|"
    r"mekan|lokanta|sube|subesi|branches|harika|muthis|en\s+iyi)",
    re.IGNORECASE,
)


def is_noise_mention(text: str) -> bool:
    if not text or len(text.strip()) < 12:
        return True
    if _NOISE_PATTERNS.search(text):
        return True
    if not _RESTAURANT_HINT.search(text) and len(text) < 80:
        return True
    return False


def filter_raw_mentions(mentions: list[RawMention]) -> list[RawMention]:
    if settings.social_proof_scan_mock:
        return mentions
    kept: list[RawMention] = []
    for mention in mentions:
        if is_noise_mention(mention.text):
            continue
        kept.append(mention)
    return kept
