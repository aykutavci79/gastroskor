from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

MAX_REVIEW_AGE_DAYS = 90

_OLD_PATTERNS = [
    re.compile(r"(\d+)\s*yil", re.I),
    re.compile(r"(\d+)\s*year", re.I),
    re.compile(r"(\d+)\s*ay", re.I),
    re.compile(r"(\d+)\s*month", re.I),
]


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def estimate_review_age_days(review: dict) -> int | None:
    """Google review yasi (gun). time (unix) oncelikli."""
    raw_time = review.get("time")
    if raw_time is not None:
        try:
            ts = int(raw_time)
            published = datetime.fromtimestamp(ts, tz=timezone.utc)
            return max(0, (_utcnow() - published).days)
        except (TypeError, ValueError):
            pass

    rel = (review.get("relative_time_description") or "").lower()
    if not rel:
        return None

    if any(x in rel for x in ("yil", "year", "6 ay", "5 ay", "4 ay")):
        for pat in _OLD_PATTERNS:
            m = pat.search(rel)
            if m:
                n = int(m.group(1))
                if "yil" in pat.pattern or "year" in pat.pattern:
                    return n * 365
                return n * 30
        return 120

    if "3 ay" in rel or "3 month" in rel:
        return 90

    if any(x in rel for x in ("ay", "month", "hafta", "week")):
        for pat in _OLD_PATTERNS:
            m = pat.search(rel)
            if m:
                n = int(m.group(1))
                if "hafta" in rel or "week" in pat.pattern:
                    return n * 7
                return n * 30
        return 45

    if any(
        x in rel
        for x in (
            "gun",
            "gün",
            "day",
            "dun",
            "dün",
            "yesterday",
            "bugun",
            "bugün",
            "today",
            "saat",
            "hour",
            "dakika",
            "minute",
        )
    ):
        return 7

    return 30


def filter_recent_reviews(reviews: list[dict], *, max_age_days: int = MAX_REVIEW_AGE_DAYS) -> list[dict]:
    recent: list[dict] = []
    for row in reviews:
        if not row.get("text"):
            continue
        age = estimate_review_age_days(row)
        if age is None:
            recent.append(row)
            continue
        if age <= max_age_days:
            recent.append(row)
    return recent
