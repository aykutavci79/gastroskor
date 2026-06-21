from __future__ import annotations

from unittest.mock import patch

from app.core.sentry_setup import init_sentry, resolve_traces_sample_rate


def test_resolve_traces_sample_rate_defaults_to_zero_in_development(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.environment", "development")
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", None)
    assert resolve_traces_sample_rate() == 0.0


def test_resolve_traces_sample_rate_defaults_to_point_one_in_production(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.environment", "production")
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", None)
    assert resolve_traces_sample_rate() == 0.1


def test_init_sentry_logs_and_skips_without_dsn(monkeypatch, capsys) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_dsn", None)
    monkeypatch.setattr("app.core.sentry_setup._initialized", False)
    assert init_sentry() is False
    out = capsys.readouterr().out
    assert "Sentry init:" in out
    assert "dsn_set=False" in out


def test_resolve_traces_sample_rate_env_override(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", 0.25)
    assert resolve_traces_sample_rate() == 0.25
