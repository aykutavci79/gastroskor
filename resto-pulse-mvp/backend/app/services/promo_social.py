from __future__ import annotations

import re


def normalize_instagram(value: str | None) -> str | None:
    raw = (value or "").strip()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    handle = raw.removeprefix("@").strip().strip("/")
    if not handle:
        return None
    return f"https://instagram.com/{handle}"


def instagram_handle_from_url(url: str | None) -> str | None:
    if not url:
        return None
    match = re.search(r"instagram\.com/([^/?#]+)", url, re.I)
    if match:
        return f"@{match.group(1)}"
    return None
