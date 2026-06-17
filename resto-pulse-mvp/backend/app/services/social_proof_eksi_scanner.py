"""Ekşi Sözlük topluluk sinyali — ham entry UI'da gosterilmez, yalnizca sayim/eslestirme."""

from __future__ import annotations

import html
import logging
import re
import ssl
from urllib.parse import quote_plus

import httpx

from app.core.config import settings
from app.services.social_proof_matcher import RawMention

logger = logging.getLogger(__name__)

# UI'da kaynak adi olarak kullanilmaz; ic pipeline platform kodu.
COMMUNITY_PLATFORM = "community"

EKSI_BASE = "https://eksisozluk.com"
ENTRY_BLOCK_RE = re.compile(
    r'<li data-id="(\d+)" data-author="([^"]+)"[^>]*>\s*<div class="content">(.*?)</div>',
    re.IGNORECASE | re.DOTALL,
)
TOPIC_LIST_RE = re.compile(r'<ul class="topic-list">(.*?)</ul>', re.IGNORECASE | re.DOTALL)
TOPIC_LINK_RE = re.compile(r'<a href="(/[^"]+--\d+)">\s*([^<]+)', re.IGNORECASE | re.DOTALL)

# (city_key, search_group) -> bilinen baslik yollari
EKSI_CURATED_TOPIC_PATHS: dict[tuple[str, str], tuple[str, ...]] = {
    ("bursa", "iskender"): (
        "/uludag-kebapcisi--65790",
        "/uludag-kebapcisi-cemal-cemil-usta--3263939",
    ),
}


def _httpx_verify() -> ssl.SSLContext | bool:
    try:
        import truststore

        return truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    except Exception:
        return True


def _browser_headers() -> dict[str, str]:
    return {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }


def _city_key(city: str | None) -> str:
    return re.sub(r"\s+", "", (city or "").strip().lower())


def _strip_html(value: str) -> str:
    text = html.unescape(re.sub(r"<[^>]+>", " ", value))
    return " ".join(text.split())


def _query_tokens(query: str) -> set[str]:
    tokens = re.findall(r"[a-z0-9çğıöşü]{3,}", query.lower(), flags=re.IGNORECASE)
    return {t for t in tokens if len(t) >= 3}


def _topic_relevant(title: str, tokens: set[str]) -> bool:
    folded = title.lower()
    return any(token in folded for token in tokens)


def parse_entry_blocks(page_html: str) -> list[tuple[str, str, str]]:
    """entry_id, author, plain_text"""
    rows: list[tuple[str, str, str]] = []
    for entry_id, author, body_html in ENTRY_BLOCK_RE.findall(page_html):
        text = _strip_html(body_html)
        if len(text) >= 12:
            rows.append((entry_id, author, text[:2000]))
    return rows


def parse_topic_paths_from_search(page_html: str, *, tokens: set[str]) -> list[str]:
    match = TOPIC_LIST_RE.search(page_html)
    if not match:
        return []
    block = match.group(1)
    paths: list[str] = []
    for path, title in TOPIC_LINK_RE.findall(block):
        clean_title = _strip_html(title)
        if _topic_relevant(clean_title, tokens):
            paths.append(path)
    return paths


def _mention_from_entry(entry_id: str, author: str, text: str) -> RawMention:
    return RawMention(
        platform=COMMUNITY_PLATFORM,
        author_id=f"community:{author}",
        text=text,
        source_url=None,
        published_at=None,
    )


def _dedupe_key(mention: RawMention) -> str:
    return f"{mention.platform}:{mention.author_id}:{mention.text[:120]}"


def _mock_community_mentions(topic: str, place_names: list[str]) -> list[RawMention]:
    names = [n.strip() for n in place_names if n and n.strip()][:5]
    if not names:
        names = ["Uludağ Kebapçısı Cemal & Cemil Usta", "Kebapçı Tamer"]
    mentions: list[RawMention] = []
    for idx, name in enumerate(names):
        for author_idx in range(3):
            mentions.append(
                RawMention(
                    platform=COMMUNITY_PLATFORM,
                    author_id=f"mock_community_{idx}_{author_idx}",
                    text=f"{name} gercekten iyi, {topic} icin tavsiye ederim.",
                    source_url=None,
                )
            )
    return mentions


def _fetch_html(client: httpx.Client, path_or_url: str) -> str:
    url = path_or_url if path_or_url.startswith("http") else f"{EKSI_BASE}{path_or_url}"
    response = client.get(url)
    response.raise_for_status()
    return response.text


def scan_eksi_community(
    queries: list[str],
    *,
    city: str | None = None,
    search_group: str | None = None,
    place_names: list[str] | None = None,
) -> tuple[list[RawMention], list[str]]:
    """Topluluk (Ekşi) entry'lerini tara — metin yalnizca pipeline icin."""
    if settings.social_proof_scan_mock:
        topic = queries[0] if queries else ""
        return _mock_community_mentions(topic, place_names or []), []

    if not settings.social_proof_eksi_enabled:
        return [], []

    errors: list[str] = []
    mentions: list[RawMention] = []
    seen: set[str] = set()
    topic_paths: list[str] = []
    city_key = _city_key(city)
    if city_key and search_group:
        topic_paths.extend(EKSI_CURATED_TOPIC_PATHS.get((city_key, search_group), ()))

    timeout = float(settings.social_proof_eksi_timeout_sec or 20.0)
    try:
        with httpx.Client(
            timeout=timeout,
            verify=_httpx_verify(),
            headers=_browser_headers(),
            follow_redirects=True,
        ) as client:
            for query in queries[:4]:
                tokens = _query_tokens(query)
                if not tokens:
                    continue
                try:
                    search_html = _fetch_html(
                        client,
                        f"/?q={quote_plus(query)}",
                    )
                    for entry_id, author, text in parse_entry_blocks(search_html):
                        mention = _mention_from_entry(entry_id, author, text)
                        key = _dedupe_key(mention)
                        if key in seen:
                            continue
                        seen.add(key)
                        mentions.append(mention)
                except Exception as exc:
                    errors.append(f"eksi search q={query[:40]}: {exc}")

                try:
                    title_html = _fetch_html(
                        client,
                        f"/basliklar/ara?SearchForm.Keywords={quote_plus(query)}&SearchForm.SearchType=1",
                    )
                    topic_paths.extend(parse_topic_paths_from_search(title_html, tokens=tokens))
                except Exception as exc:
                    errors.append(f"eksi titles q={query[:40]}: {exc}")

            unique_paths: list[str] = []
            path_seen: set[str] = set()
            for path in topic_paths:
                if path in path_seen:
                    continue
                path_seen.add(path)
                unique_paths.append(path)

            for path in unique_paths[: settings.social_proof_eksi_max_topics or 6]:
                try:
                    topic_html = _fetch_html(client, path)
                    for entry_id, author, text in parse_entry_blocks(topic_html):
                        mention = _mention_from_entry(entry_id, author, text)
                        key = _dedupe_key(mention)
                        if key in seen:
                            continue
                        seen.add(key)
                        mentions.append(mention)
                except Exception as exc:
                    errors.append(f"eksi topic {path}: {exc}")

            if len(mentions) > (settings.social_proof_eksi_max_entries or 50):
                mentions = mentions[: settings.social_proof_eksi_max_entries or 50]
    except Exception as exc:
        errors.append(f"eksi client: {exc}")
        return [], errors

    logger.info(
        "eksi_community_scan queries=%s mentions=%s topics=%s",
        len(queries[:4]),
        len(mentions),
        len(topic_paths),
    )
    return mentions, errors
