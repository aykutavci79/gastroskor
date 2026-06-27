"""Online siparis calisma saatleri — panel zorunlu, sistem otomatik kapatir."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

ISTANBUL_TZ = ZoneInfo("Europe/Istanbul")

DAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
DAY_LABELS_TR = {
    "mon": "Pazartesi",
    "tue": "Salı",
    "wed": "Çarşamba",
    "thu": "Perşembe",
    "fri": "Cuma",
    "sat": "Cumartesi",
    "sun": "Pazar",
}


def default_online_order_hours(
    *,
    open_time: str = "11:00",
    close_time: str = "23:00",
) -> dict[str, Any]:
    weekly = {
        key: {"closed": False, "open": open_time, "close": close_time} for key in DAY_KEYS
    }
    return {"timezone": "Europe/Istanbul", "weekly": weekly}


def _parse_hhmm(value: str) -> int:
    raw = (value or "").strip()
    parts = raw.split(":")
    if len(parts) != 2:
        raise ValueError(f"Saat HH:MM olmali: {value!r}")
    hour = int(parts[0])
    minute = int(parts[1])
    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError(f"Gecersiz saat: {value!r}")
    return hour * 60 + minute


def _format_hhmm(minutes: int) -> str:
    minutes = max(0, min(23 * 60 + 59, minutes))
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def normalize_online_order_hours(raw: Any) -> dict[str, Any] | None:
    if not raw or not isinstance(raw, dict):
        return None
    weekly_raw = raw.get("weekly")
    if not isinstance(weekly_raw, dict):
        return None
    weekly: dict[str, dict[str, Any]] = {}
    for key in DAY_KEYS:
        day = weekly_raw.get(key)
        if not isinstance(day, dict):
            weekly[key] = {"closed": True}
            continue
        if day.get("closed"):
            weekly[key] = {"closed": True}
            continue
        open_time = str(day.get("open") or "").strip()
        close_time = str(day.get("close") or "").strip()
        weekly[key] = {"closed": False, "open": open_time, "close": close_time}
    tz = str(raw.get("timezone") or "Europe/Istanbul").strip() or "Europe/Istanbul"
    return {"timezone": tz, "weekly": weekly}


def validate_online_order_hours(hours: dict[str, Any]) -> None:
    normalized = normalize_online_order_hours(hours)
    if not normalized:
        raise ValueError("Calisma saati tablosu gerekli.")
    open_days = 0
    for key in DAY_KEYS:
        day = normalized["weekly"][key]
        if day.get("closed"):
            continue
        open_time = day.get("open")
        close_time = day.get("close")
        if not open_time or not close_time:
            raise ValueError(f"{DAY_LABELS_TR[key]} icin acilis ve kapanis saati girin.")
        open_min = _parse_hhmm(str(open_time))
        close_min = _parse_hhmm(str(close_time))
        if close_min <= open_min:
            raise ValueError(
                f"{DAY_LABELS_TR[key]}: kapanis saati acilisten sonra olmali (or. 11:00–23:00)."
            )
        open_days += 1
    if open_days == 0:
        raise ValueError("En az bir gun siparis alacak sekilde acik olmali.")


def has_valid_online_order_hours(ownership) -> bool:
    raw = getattr(ownership, "online_order_hours", None)
    normalized = normalize_online_order_hours(raw)
    if not normalized:
        return False
    try:
        validate_online_order_hours(normalized)
    except ValueError:
        return False
    return True


def _day_key_for_dt(dt: datetime) -> str:
    return DAY_KEYS[dt.weekday()]


def _minutes_in_window(now_min: int, open_min: int, close_min: int) -> bool:
    if close_min > open_min:
        return open_min <= now_min < close_min
    # Gece yarisini gecen vardiya (or. 18:00–02:00)
    return now_min >= open_min or now_min < close_min


def online_orders_within_hours(ownership, *, now: datetime | None = None) -> bool:
    normalized = normalize_online_order_hours(getattr(ownership, "online_order_hours", None))
    if not normalized:
        return False
    dt = now.astimezone(ISTANBUL_TZ) if now else datetime.now(ISTANBUL_TZ)
    now_min = dt.hour * 60 + dt.minute
    day_key = _day_key_for_dt(dt)
    day = normalized["weekly"].get(day_key) or {"closed": True}
    if not day.get("closed"):
        open_min = _parse_hhmm(str(day["open"]))
        close_min = _parse_hhmm(str(day["close"]))
        if _minutes_in_window(now_min, open_min, close_min):
            return True
    # Onceki gun gece vardiyasi bugune tasiyor olabilir
    prev_key = DAY_KEYS[(dt.weekday() - 1) % 7]
    prev = normalized["weekly"].get(prev_key) or {"closed": True}
    if prev.get("closed"):
        return False
    open_min = _parse_hhmm(str(prev["open"]))
    close_min = _parse_hhmm(str(prev["close"]))
    if close_min <= open_min:
        return now_min < close_min
    return False


def online_order_hours_status(ownership, *, now: datetime | None = None) -> dict[str, Any]:
    try:
        normalized = normalize_online_order_hours(getattr(ownership, "online_order_hours", None))
        dt = now.astimezone(ISTANBUL_TZ) if now else datetime.now(ISTANBUL_TZ)
        if not normalized:
            return {"open_now": False, "label": "Calisma saati tanimli degil"}
        if online_orders_within_hours(ownership, now=dt):
            close_label = _closing_label_today(normalized, dt)
            return {"open_now": True, "label": close_label}
        next_open = _find_next_open(normalized, dt)
        if not next_open:
            return {"open_now": False, "label": "Kapali"}
        open_dt, day_key = next_open
        if open_dt.date() == dt.date():
            label = f"Kapali · bugun {_format_hhmm(open_dt.hour * 60 + open_dt.minute)}'de acar"
        elif open_dt.date() == (dt.date() + timedelta(days=1)):
            label = f"Kapali · yarin {_format_hhmm(open_dt.hour * 60 + open_dt.minute)}'de acar"
        else:
            label = f"Kapali · {DAY_LABELS_TR[day_key]} {_format_hhmm(open_dt.hour * 60 + open_dt.minute)}'de acar"
        return {"open_now": False, "label": label}
    except (ValueError, TypeError, KeyError):
        return {"open_now": False, "label": "Calisma saati gecersiz"}


def _closing_label_today(normalized: dict[str, Any], dt: datetime) -> str | None:
    day_key = _day_key_for_dt(dt)
    day = normalized["weekly"].get(day_key) or {}
    if day.get("closed"):
        return None
    close_time = str(day.get("close") or "")
    if not close_time:
        return None
    return f"Acik · {close_time}'e kadar"


def _find_next_open(
    normalized: dict[str, Any],
    dt: datetime,
) -> tuple[datetime, str] | None:
    for offset in range(8):
        candidate = dt + timedelta(days=offset)
        day_key = _day_key_for_dt(candidate)
        day = normalized["weekly"].get(day_key) or {"closed": True}
        if day.get("closed"):
            continue
        open_min = _parse_hhmm(str(day["open"]))
        open_dt = candidate.replace(hour=open_min // 60, minute=open_min % 60, second=0, microsecond=0)
        if offset == 0 and open_dt <= dt:
            continue
        return open_dt, day_key
    return None
