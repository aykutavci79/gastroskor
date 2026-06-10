from __future__ import annotations

from app.integrations.gemini_client import gemini_json_prompt
from app.services.ai_report_storage import format_report_date_tr


def _heuristic_trend(reports: list[dict]) -> dict:
    if len(reports) < 2:
        return {
            "available": False,
            "report_count": len(reports),
            "message": "Trend icin en az 2 kayitli analiz gerekir.",
        }

    ordered = list(reversed(reports[:3]))
    oldest, newest = ordered[0], ordered[-1]
    old_gaps = {(r.get("category") or "").lower() for r in oldest.get("your_gaps") or []}
    new_gaps = {(r.get("category") or "").lower() for r in newest.get("your_gaps") or []}
    old_strengths = {(r.get("category") or "").lower() for r in oldest.get("your_strengths") or []}
    new_strengths = {(r.get("category") or "").lower() for r in newest.get("your_strengths") or []}

    resolved = sorted(cat for cat in old_gaps - new_gaps if cat)
    emerged = sorted(cat for cat in new_gaps - old_gaps if cat)
    sustained_strengths = sorted(cat for cat in old_strengths & new_strengths if cat)

    parts: list[str] = []
    improvements: list[dict] = []
    new_concerns: list[dict] = []

    label_map = {
        "hijyen": "temizlik",
        "servis": "servis ve calisan tutumu",
        "urun": "urun / lezzet",
        "lezzet": "lezzet",
        "fiyat": "fiyat algisi",
        "iyilestirme": "genel iyilestirme",
        "firsat": "rekabet firsati",
    }

    for cat in resolved:
        label = label_map.get(cat, cat or "genel")
        improvements.append({"category": cat or "genel", "summary": f"{label} konusunda onceki raporlara gore gerilim azalmis gorunuyor."})
        parts.append(f"{label} alaninda iyilesme egilimi var")

    for cat in emerged:
        label = label_map.get(cat, cat or "genel")
        new_concerns.append(
            {
                "category": cat or "genel",
                "summary": f"{label} ile ilgili yeni uyari temalari son raporda one cikiyor; calisan davranisi ve musteri karsilama gozden gecirilebilir.",
            }
        )
        parts.append(f"{label} alanina dikkat")

    if sustained_strengths and not parts:
        parts.append("Guclu yanlariniz istikrarli; bu ivmeyi koruyun")

    summary = (
        f"Son {len(ordered)} analizde " + "; ".join(parts) + "."
        if parts
        else f"Son {len(ordered)} analiz ozetleri karsilastirildi; belirgin tema kaymasi saptanmadi."
    )

    period_from = format_report_date_tr(oldest.get("created_at"))
    period_to = format_report_date_tr(newest.get("created_at"))

    return {
        "available": True,
        "report_count": len(ordered),
        "period_from": period_from,
        "period_to": period_to,
        "summary": summary,
        "improvements": improvements,
        "new_concerns": new_concerns,
        "model": "template",
        "disclaimer": "Trend, kayitli AI ozet raporlarinin karsilastirmasidir; ham Google yorumu saklanmaz.",
    }


async def build_analysis_trend(reports: list[dict]) -> dict:
    if len(reports) < 2:
        return _heuristic_trend(reports)

    slice_reports = reports[:3]
    ordered = list(reversed(slice_reports))
    payload_lines: list[str] = []
    for idx, report in enumerate(ordered, start=1):
        payload_lines.append(
            f"Rapor {idx} ({format_report_date_tr(report.get('created_at'))}): "
            f"ozet={report.get('comparison_summary')}; "
            f"guclu={report.get('your_strengths')}; "
            f"iyilestirme={report.get('your_gaps')}"
        )

    system = (
        "Sen restoran panel danismanisin. Sadece verilen ozet raporlari karsilastir. "
        "Ham yorum veya musteri ismi uydurma. Turkce, 2-4 cumle. JSON don."
    )
    user = (
        "Son raporlar (eskiden yeniye):\n"
        + "\n".join(payload_lines)
        + '\n\nJSON: {"summary":"...","improvements":[{"category":"...","summary":"..."}],'
        '"new_concerns":[{"category":"...","summary":"..."}]}'
    )

    parsed = await gemini_json_prompt(system=system, user=user)
    if parsed and parsed.get("summary"):
        return {
            "available": True,
            "report_count": len(ordered),
            "period_from": format_report_date_tr(ordered[0].get("created_at")),
            "period_to": format_report_date_tr(ordered[-1].get("created_at")),
            "summary": str(parsed.get("summary")).strip(),
            "improvements": [
                {"category": r.get("category") or "genel", "summary": (r.get("summary") or "").strip()}
                for r in (parsed.get("improvements") or [])
                if isinstance(r, dict) and (r.get("summary") or "").strip()
            ],
            "new_concerns": [
                {"category": r.get("category") or "genel", "summary": (r.get("summary") or "").strip()}
                for r in (parsed.get("new_concerns") or [])
                if isinstance(r, dict) and (r.get("summary") or "").strip()
            ],
            "model": "gemini",
            "disclaimer": "Trend, kayitli AI ozet raporlarinin karsilastirmasidir; ham Google yorumu saklanmaz.",
        }

    return _heuristic_trend(slice_reports)
