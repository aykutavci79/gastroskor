"""Ekşi topluluk tarayici testleri."""

from app.services.social_proof_eksi_scanner import (
    COMMUNITY_PLATFORM,
    parse_entry_blocks,
    parse_topic_paths_from_search,
    scan_eksi_community,
)
from app.services.social_proof_matcher import PlaceCandidate, match_mentions


SAMPLE_TOPIC_HTML = """
<ul>
<li data-id="123" data-author="kanzuk">
  <div class="content">
    bursa da en guzel iskender <b>uludag kebapcisi cemal usta</b> da yenir
  </div>
</li>
<li data-id="124" data-author="yazar2">
  <div class="content">kebapci tamer de guzel ama uludag bir baska</div>
</li>
</ul>
"""

SAMPLE_SEARCH_HTML = """
<ul class="topic-list">
<li><a href="/uludag-kebapcisi--65790">uludag kebapcisi <small>99</small></a></li>
<li><a href="/akil-fikir--201447">akil fikir <small>36</small></a></li>
</ul>
"""


def test_parse_entry_blocks():
    rows = parse_entry_blocks(SAMPLE_TOPIC_HTML)
    assert len(rows) == 2
    assert rows[0][1] == "kanzuk"
    assert "uludag kebapcisi" in rows[0][2].lower()


def test_parse_topic_paths_filters_irrelevant_titles():
    paths = parse_topic_paths_from_search(SAMPLE_SEARCH_HTML, tokens={"uludag", "kebap"})
    assert paths == ["/uludag-kebapcisi--65790"]


def test_scan_eksi_mock_returns_community_platform(monkeypatch):
    from app.core import config as config_module

    monkeypatch.setattr(config_module.settings, "social_proof_scan_mock", True)
    mentions, errors = scan_eksi_community(
        ["en iyi iskender bursa"],
        city="Bursa",
        search_group="iskender",
        place_names=["Uludağ Kebapçısı Cemal & Cemil Usta"],
    )
    assert not errors
    assert mentions
    assert all(row.platform == COMMUNITY_PLATFORM for row in mentions)
    assert all(row.source_url is None for row in mentions)


def test_community_mention_matches_uludag_place():
    from app.services.social_proof_matcher import RawMention

    mentions = [
        RawMention(
            platform=COMMUNITY_PLATFORM,
            author_id="community:kanzuk",
            text="uludag kebapcisi cemal usta bursanin en iyisi",
            source_url=None,
        )
    ]
    candidates = [
        PlaceCandidate(
            place_id="p1",
            name="Uludağ Kebapçısı Cemal & Cemil Usta",
            restaurant_id=None,
            latitude=40.2,
            longitude=29.05,
        )
    ]
    matched = match_mentions(
        mentions,
        candidates,
        origin_lat=40.2,
        origin_lng=29.05,
        radius_km=30,
    )
    assert len(matched) == 1
    assert matched[0].place_id == "p1"
