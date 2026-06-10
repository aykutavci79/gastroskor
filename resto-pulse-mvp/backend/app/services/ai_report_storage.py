from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import RestaurantAiAnalysisReport


def sanitize_insight_row(row: dict) -> dict:
    products = row.get("praised_products") or []
    return {
        "category": (row.get("category") or "genel").strip(),
        "summary": (row.get("summary") or "").strip(),
        "praised_products": [p for p in products if isinstance(p, str) and p.strip()][:5],
    }


def sanitize_insights(insights: list[dict] | None) -> list[dict]:
    if not insights:
        return []
    cleaned: list[dict] = []
    for row in insights:
        if not isinstance(row, dict):
            continue
        item = sanitize_insight_row(row)
        if item["summary"]:
            cleaned.append(item)
    return cleaned


def save_analysis_report(
    db: Session,
    *,
    ownership_id: uuid.UUID,
    competitor_id: uuid.UUID | None,
    competitor_name: str,
    report: dict,
) -> RestaurantAiAnalysisReport:
    row = RestaurantAiAnalysisReport(
        ownership_id=ownership_id,
        report_source="competitor",
        competitor_id=competitor_id,
        competitor_name=competitor_name.strip() or "Rakip",
        comparison_summary=(report.get("comparison_summary") or "").strip(),
        your_strengths_json=sanitize_insights(report.get("your_strengths")),
        your_gaps_json=sanitize_insights(report.get("your_gaps")),
        competitor_strengths_json=sanitize_insights(report.get("competitor_strengths")),
        reviews_used_json=report.get("reviews_used") if isinstance(report.get("reviews_used"), dict) else None,
        reviews_total=None,
    )
    db.add(row)
    db.flush()
    return row


def save_google_business_report(
    db: Session,
    *,
    ownership_id: uuid.UUID,
    place_name: str,
    report: dict,
) -> RestaurantAiAnalysisReport:
    row = RestaurantAiAnalysisReport(
        ownership_id=ownership_id,
        report_source="google_business",
        competitor_id=None,
        competitor_name=place_name.strip() or "Isletmeniz",
        comparison_summary=(report.get("comparison_summary") or "").strip(),
        your_strengths_json=sanitize_insights(report.get("your_strengths")),
        your_gaps_json=sanitize_insights(report.get("your_gaps")),
        competitor_strengths_json=[],
        reviews_used_json=report.get("reviews_used") if isinstance(report.get("reviews_used"), dict) else None,
        reviews_total=int(report.get("reviews_total") or 0) or None,
    )
    db.add(row)
    db.flush()
    return row


def report_row_to_dict(row: RestaurantAiAnalysisReport) -> dict:
    return {
        "id": str(row.id),
        "competitor_id": str(row.competitor_id) if row.competitor_id else None,
        "competitor_name": row.competitor_name,
        "comparison_summary": row.comparison_summary,
        "your_strengths": row.your_strengths_json or [],
        "your_gaps": row.your_gaps_json or [],
        "competitor_strengths": row.competitor_strengths_json or [],
        "reviews_used": row.reviews_used_json,
        "reviews_total": row.reviews_total,
        "report_source": row.report_source or "competitor",
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def list_analysis_reports(db: Session, ownership_id: uuid.UUID, *, limit: int = 24) -> list[dict]:
    rows = db.scalars(
        select(RestaurantAiAnalysisReport)
        .where(RestaurantAiAnalysisReport.ownership_id == ownership_id)
        .order_by(RestaurantAiAnalysisReport.created_at.desc())
        .limit(max(1, min(limit, 50)))
    ).all()
    return [report_row_to_dict(row) for row in rows]


def get_analysis_report(db: Session, ownership_id: uuid.UUID, report_id: uuid.UUID) -> dict | None:
    row = db.scalar(
        select(RestaurantAiAnalysisReport).where(
            RestaurantAiAnalysisReport.id == report_id,
            RestaurantAiAnalysisReport.ownership_id == ownership_id,
        )
    )
    return report_row_to_dict(row) if row else None


def format_report_date_tr(value: datetime | str | None) -> str:
    if value is None:
        return "?"
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value[:10]
    return value.strftime("%d.%m.%Y")
