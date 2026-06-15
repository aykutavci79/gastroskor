"""Günlük KPI özeti e-postası — panel admin / metrics_daily_report_emails."""

from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.app_metrics import build_metrics_summary
from app.services.email_notify import send_panel_email

TZ = ZoneInfo("Europe/Istanbul")


def _report_recipients() -> list[str]:
    raw = (settings.metrics_daily_report_emails or settings.panel_admin_emails or "").strip()
    return [part.strip().lower() for part in raw.split(",") if part.strip()]


def _format_duration(seconds: float | None) -> str:
    if seconds is None:
        return "—"
    total = int(round(seconds))
    if total < 60:
        return f"{total} sn"
    minutes, rem = divmod(total, 60)
    return f"{minutes} dk {rem} sn" if rem else f"{minutes} dk"


def _format_day_row(row: dict) -> str:
    return (
        f"  Web ziyaretçi: {row.get('web_visitors', 0)}\n"
        f"  Mobil ziyaretçi: {row.get('mobile_visitors', 0)}\n"
        f"  Toplam ziyaretçi: {row['unique_users']}\n"
        f"  Oturum sayısı: {row['sessions']}\n"
        f"  Ort. süre: {_format_duration(row.get('avg_session_seconds'))}\n"
        f"  Giriş (sync): {row['logins']}\n"
        f"  Yeni kayıt: {row.get('new_registrations', 0)}\n"
        f"  Canlı arama: {row['live_searches']}\n"
        f"  Yorum: {row['reviews']}"
    )


def build_metrics_daily_report_text(db: Session) -> tuple[str, str]:
    summary = build_metrics_summary(db, days=7)
    daily = summary.get("daily") or []
    yesterday = daily[-2] if len(daily) >= 2 else (daily[-1] if daily else None)
    totals = summary.get("totals") or {}

    now_tr = datetime.now(TZ)
    label = yesterday["date"] if yesterday else now_tr.date().isoformat()
    subject = f"GastroSkor günlük özet — {label}"

    lines = [
        f"GastroSkor — günlük KPI özeti ({now_tr.strftime('%d.%m.%Y %H:%M')} TR)",
        "",
    ]
    if yesterday:
        lines.extend([f"Dün ({yesterday['date']}):", _format_day_row(yesterday), ""])
    else:
        lines.append("Dün için veri yok.")
        lines.append("")

    lines.extend(
        [
            "Son 7 gün (toplam):",
            f"  Web ziyaretçi: {totals.get('web_visitors', 0)}",
            f"  Mobil ziyaretçi: {totals.get('mobile_visitors', 0)}",
            f"  Toplam ziyaretçi: {totals.get('unique_users', 0)}",
            f"  Oturum: {totals.get('sessions', 0)}",
            f"  Giriş: {totals.get('logins', 0)}",
            f"  Yeni kayıt (dönem): {totals.get('new_registrations', 0)}",
            f"  Bugün yeni kayıt (TR): {totals.get('new_registrations_today', 0)}",
            f"  Canlı arama: {totals.get('live_searches', 0)}",
            f"  Yorum: {totals.get('reviews', 0)}",
            f"  Kayıtlı kullanıcı: {totals.get('total_registered_users', 0)}",
            "",
            "Not: Ziyaretçi = benzersiz oturum (web veya mobil). Panel sayfaları web sayacına dahil değil.",
        ]
    )
    return subject, "\n".join(lines)


async def run_metrics_daily_report(db: Session) -> dict:
    recipients = _report_recipients()
    if not recipients:
        return {"ok": False, "reason": "no_recipients", "sent": 0}

    subject, body = build_metrics_daily_report_text(db)
    kpi_url = f"{settings.public_site_base_url.rstrip('/')}/panel/admin/kpi"
    sent = 0
    errors: list[str] = []

    for email in recipients:
        ok, err = await send_panel_email(
            to_email=email,
            subject=subject,
            body_text=body,
            cta_label="Detaylı KPI paneli",
            cta_url=kpi_url,
        )
        if ok:
            sent += 1
        elif err:
            errors.append(f"{email}: {err}")

    return {
        "ok": sent > 0,
        "sent": sent,
        "recipients": len(recipients),
        "errors": errors or None,
    }
