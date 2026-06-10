from app.services.ai_analysis_trend import _heuristic_trend
from app.services.ai_report_storage import sanitize_insight_row, sanitize_insights


def test_sanitize_insights_strips_evidence_quotes():
    raw = [
        {
            "category": "hijyen",
            "summary": "Temizlik gelistirilmeli.",
            "evidence_quotes": ["Berbat bir yer", "Sinek vardi"],
            "praised_products": ["lahmacun"],
        }
    ]
    cleaned = sanitize_insights(raw)
    assert cleaned == [
        {
            "category": "hijyen",
            "summary": "Temizlik gelistirilmeli.",
            "praised_products": ["lahmacun"],
        }
    ]
    assert "evidence_quotes" not in cleaned[0]


def test_sanitize_insight_row_empty_summary_dropped_in_list():
    assert sanitize_insights([{"category": "servis", "summary": "  ", "evidence_quotes": ["x"]}]) == []


def test_heuristic_trend_detects_gap_shift():
    reports = [
        {
            "created_at": "2026-07-01T10:00:00+00:00",
            "your_strengths": [{"category": "servis", "summary": "Servis iyi"}],
            "your_gaps": [{"category": "hijyen", "summary": "Temizlik zayif"}],
            "comparison_summary": "Ilk rapor",
        },
        {
            "created_at": "2026-08-04T10:00:00+00:00",
            "your_strengths": [{"category": "servis", "summary": "Servis iyi"}],
            "your_gaps": [],
            "comparison_summary": "Ikinci rapor",
        },
        {
            "created_at": "2026-09-07T10:00:00+00:00",
            "your_strengths": [{"category": "servis", "summary": "Servis iyi"}],
            "your_gaps": [{"category": "servis", "summary": "Garson tutumu sikayeti"}],
            "comparison_summary": "Ucuncu rapor",
        },
    ]
    trend = _heuristic_trend(list(reversed(reports)))  # newest first
    assert trend["available"] is True
    assert trend["report_count"] == 3
    assert any("temizlik" in i["summary"].lower() or i["category"] == "hijyen" for i in trend["improvements"])
