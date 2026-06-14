"""App metrics — web/mobil ziyaretci ayrimi."""

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
    def __init__(self, daily_rows, totals_row, review_count=0, user_count=0):
        self.daily_rows = daily_rows
        self.totals_row = totals_row
        self.review_count = review_count
        self.user_count = user_count
        self._call = 0

    def execute(self, _stmt):
        self._call += 1
        if self._call == 1:
            return _FakeResult(self.daily_rows)
        if self._call == 2:
            return _FakeResult([])
        return _FakeResult([self.totals_row])

    def scalar(self, _stmt):
        if "Review" in str(_stmt):
            return self.review_count
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
    summary = build_metrics_summary(_FakeDb([daily], totals), days=30)  # type: ignore[arg-type]
    assert summary["totals"]["web_visitors"] == 2
    assert summary["totals"]["mobile_visitors"] == 2
    assert summary["totals"]["web_avg_session_seconds"] == 60.0


def test_platform_filters() -> None:
    assert str(_platform_is_web(SimpleNamespace()))  # SQL expression exists
    assert str(_platform_is_mobile(SimpleNamespace()))
