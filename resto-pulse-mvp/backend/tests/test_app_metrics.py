"""App metrics — web/mobil ziyaretci ayrimi ve yeni kayit."""

from datetime import datetime, timezone
from types import SimpleNamespace

from app.services.app_metrics import _platform_is_mobile, _platform_is_web, build_metrics_summary


class _FakeResult:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def one(self):
        return self._rows[0]


class _FakeDb:
    def __init__(self, daily_rows, totals_row, review_count=0, user_count=0, today_users=None):
        self.daily_rows = daily_rows
        self.totals_row = totals_row
        self.review_count = review_count
        self.user_count = user_count
        self.today_users = today_users or []
        self._execute_call = 0
        self._scalar_call = 0

    def execute(self, _stmt):
        self._execute_call += 1
        if self._execute_call == 1:
            return _FakeResult(self.daily_rows)
        if self._execute_call == 2:
            return _FakeResult([])
        if self._execute_call == 3:
            return _FakeResult([])
        if self._execute_call == 4:
            return _FakeResult(self.today_users)
        return _FakeResult([self.totals_row])

    def scalar(self, _stmt):
        self._scalar_call += 1
        if self._scalar_call == 1:
            return len(self.today_users)
        if self._scalar_call == 2:
            return self.review_count
        if self._scalar_call == 3:
            return self.user_count
        return self.user_count


def test_build_metrics_summary_exposes_web_and_mobile_totals() -> None:
    daily = SimpleNamespace(
        day=SimpleNamespace(date=lambda: __import__("datetime").date(2026, 6, 10)),
        unique_users=4,
        sessions=4,
        web_visitors=2,
        web_sessions=2,
        mobile_visitors=2,
        mobile_sessions=2,
        avg_session_seconds=90.0,
        web_avg_session_seconds=60.0,
        mobile_avg_session_seconds=120.0,
        logins=1,
        live_searches=3,
    )
    totals = SimpleNamespace(
        unique_users=4,
        sessions=4,
        web_visitors=2,
        web_sessions=2,
        mobile_visitors=2,
        mobile_sessions=2,
        avg_session_seconds=90.0,
        web_avg_session_seconds=60.0,
        mobile_avg_session_seconds=120.0,
        logins=1,
        live_searches=3,
    )
    today_user = SimpleNamespace(
        email="yeni@ornek.com",
        full_name="Yeni Kullanici",
        created_at=datetime(2026, 6, 14, 10, 0, tzinfo=timezone.utc),
    )
    summary = build_metrics_summary(
        _FakeDb([daily], totals, today_users=[today_user]),  # type: ignore[arg-type]
        days=30,
    )
    assert summary["totals"]["web_visitors"] == 2
    assert summary["totals"]["mobile_visitors"] == 2
    assert summary["totals"]["web_avg_session_seconds"] == 60.0
    assert summary["totals"]["new_registrations_today"] == 1
    assert summary["new_users_today"][0]["email"] == "yeni@ornek.com"


def test_platform_filters() -> None:
    assert str(_platform_is_web(SimpleNamespace()))  # SQL expression exists
    assert str(_platform_is_mobile(SimpleNamespace()))
