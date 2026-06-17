"""last30days motoru entegrasyonu — Reddit, X, YouTube + topluluk (Ekşi)."""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

from app.core.config import settings
from app.services.place_search_relevance import resolve_place_relevance_intent
from app.services.social_proof_eksi_scanner import scan_eksi_community
from app.services.social_proof_matcher import RawMention

logger = logging.getLogger(__name__)

DEFAULT_LAST30DAYS_SCRIPT = Path.home() / ".agents" / "skills" / "last30days" / "scripts" / "last30days.py"
SCAN_SOURCES = ("reddit", "x", "youtube")


@dataclass(frozen=True)
class ScanStats:
    queries_run: int
    raw_items: int
    errors: list[str]


def _resolve_script_path() -> Path | None:
    configured = (settings.social_proof_last30days_script or "").strip()
    if configured:
        path = Path(configured).expanduser()
        if path.is_file():
            return path
    if DEFAULT_LAST30DAYS_SCRIPT.is_file():
        return DEFAULT_LAST30DAYS_SCRIPT
    return None


def _python_for_last30days() -> str:
    override = (settings.social_proof_last30days_python or "").strip()
    if override:
        return override
    if sys.version_info >= (3, 12):
        return sys.executable
    for candidate in ("python3.13", "python3.12", "py -3.12", "py -3.13"):
        return candidate
    return sys.executable


def _extract_items_from_report(report: dict) -> list[dict]:
    items: list[dict] = []
    by_source = report.get("items_by_source") or {}
    if isinstance(by_source, dict):
        for source, source_items in by_source.items():
            if source not in SCAN_SOURCES:
                continue
            if not isinstance(source_items, list):
                continue
            for item in source_items:
                if isinstance(item, dict):
                    items.append({**item, "source": source})
    ranked = report.get("ranked_candidates") or []
    if isinstance(ranked, list):
        for candidate in ranked:
            if not isinstance(candidate, dict):
                continue
            source = str(candidate.get("source") or "")
            if source not in SCAN_SOURCES:
                continue
            items.append(
                {
                    "source": source,
                    "title": candidate.get("title") or "",
                    "body": candidate.get("snippet") or "",
                    "url": candidate.get("url") or "",
                    "author": (candidate.get("metadata") or {}).get("author"),
                    "published_at": (candidate.get("metadata") or {}).get("published_at"),
                }
            )
    return items


def _item_to_mention(item: dict) -> RawMention | None:
    platform = str(item.get("source") or item.get("platform") or "").lower()
    if platform not in SCAN_SOURCES:
        return None
    title = str(item.get("title") or "").strip()
    body = str(item.get("body") or item.get("snippet") or "").strip()
    text = f"{title}\n{body}".strip() if title and body else (title or body)
    if len(text) < 8:
        return None
    author = str(item.get("author") or item.get("author_id") or item.get("username") or "anon")
    return RawMention(
        platform=platform,
        author_id=author,
        text=text[:2000],
        source_url=str(item.get("url") or "") or None,
        published_at=str(item.get("published_at") or "") or None,
    )


def scan_topic_last30days(
    topic: str,
    *,
    mock: bool = False,
    place_names: list[str] | None = None,
) -> tuple[list[RawMention], list[str]]:
    script = _resolve_script_path()
    errors: list[str] = []
    if script is None:
        if settings.environment != "production":
            return _mock_mentions(topic, place_names or []), ["last30days script bulunamadi — mock veri"]
        errors.append("last30days script bulunamadi")
        return [], errors

    python_bin = _python_for_last30days()
    cmd = [
        python_bin,
        str(script),
        topic,
        "--emit=json",
        "--depth=quick",
        f"--search={','.join(SCAN_SOURCES)}",
    ]
    if mock or settings.social_proof_scan_mock:
        return _mock_mentions(topic, place_names or []), []

    env = os.environ.copy()
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=float(settings.social_proof_scan_timeout_sec or 120.0),
            env=env,
            check=False,
        )
    except subprocess.TimeoutExpired:
        errors.append(f"timeout: {topic[:60]}")
        return [], errors
    except Exception as exc:
        errors.append(f"subprocess error: {exc}")
        return [], errors

    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()[:300]
        errors.append(f"exit {completed.returncode}: {stderr or topic[:60]}")
        return [], errors

    stdout = (completed.stdout or "").strip()
    if not stdout:
        errors.append(f"bos stdout: {topic[:60]}")
        return [], errors

    try:
        report = json.loads(stdout)
    except json.JSONDecodeError:
        errors.append(f"json parse: {topic[:60]}")
        return [], errors

    mentions: list[RawMention] = []
    for item in _extract_items_from_report(report):
        mention = _item_to_mention(item)
        if mention:
            mentions.append(mention)
    return mentions, errors


def scan_queries(
    queries: list[str],
    *,
    place_names: list[str] | None = None,
    city: str | None = None,
) -> tuple[list[RawMention], ScanStats]:
    if settings.social_proof_scan_mock:
        topic = queries[0] if queries else ""
        mentions, errors = scan_topic_last30days(topic, place_names=place_names)
        intent = resolve_place_relevance_intent(topic)
        eksi_mentions, eksi_errors = scan_eksi_community(
            queries,
            city=city,
            search_group=intent.search_group if intent else None,
            place_names=place_names,
        )
        merged = mentions + eksi_mentions
        return merged, ScanStats(
            queries_run=1,
            raw_items=len(merged),
            errors=errors + eksi_errors,
        )

    all_mentions: list[RawMention] = []
    errors: list[str] = []
    seen_urls: set[str] = set()

    for query in queries:
        mentions, query_errors = scan_topic_last30days(query, place_names=place_names)
        errors.extend(query_errors)
        for mention in mentions:
            key = mention.source_url or f"{mention.platform}:{mention.text[:80]}"
            if key in seen_urls:
                continue
            seen_urls.add(key)
            all_mentions.append(mention)

    intent = resolve_place_relevance_intent(queries[0] if queries else "")
    eksi_mentions, eksi_errors = scan_eksi_community(
        queries,
        city=city,
        search_group=intent.search_group if intent else None,
        place_names=place_names,
    )
    errors.extend(eksi_errors)
    for mention in eksi_mentions:
        key = f"{mention.platform}:{mention.author_id}:{mention.text[:80]}"
        if key in seen_urls:
            continue
        seen_urls.add(key)
        all_mentions.append(mention)

    return all_mentions, ScanStats(queries_run=len(queries), raw_items=len(all_mentions), errors=errors)


def _mock_mentions(topic: str, place_names: list[str]) -> list[RawMention]:
    """Lokal gelistirme — Google mekan adlariyla eslesen ornek mention."""
    names = [n.strip() for n in place_names if n and n.strip()][:5]
    if not names:
        names = ["Kebapçı Hacı Dayı", "İskender Efendi Konağı", "Bursa Kebap Evi"]

    platforms = ("reddit", "x", "youtube", "community")
    # Yeni rozet esikleri: mekan basina >=8 mention, >=2 platform
    mentions_per_place = max(10, (40 + len(names) - 1) // len(names))
    samples: list[RawMention] = []
    for idx, name in enumerate(names):
        for author_idx in range(mentions_per_place):
            platform = platforms[author_idx % len(platforms)]
            samples.append(
                RawMention(
                    platform=platform,
                    author_id=f"mock_{idx}_{author_idx}",
                    text=f"{name} gercekten cok iyi, {topic} arayanlara siddetle tavsiye ederim.",
                    source_url=f"https://{platform}.com/mock/{idx}/{author_idx}",
                )
            )
    return samples
