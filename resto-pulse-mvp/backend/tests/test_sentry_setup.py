from __future__ import annotations

from app.core.sentry_setup import resolve_traces_sample_rate


def test_resolve_traces_sample_rate_defaults_to_zero_in_development(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.environment", "development")
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", None)
    assert resolve_traces_sample_rate() == 0.0


def test_resolve_traces_sample_rate_defaults_to_point_one_in_production(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.environment", "production")
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", None)
    assert resolve_traces_sample_rate() == 0.1


def test_resolve_traces_sample_rate_env_override(monkeypatch) -> None:
    monkeypatch.setattr("app.core.sentry_setup.settings.sentry_traces_sample_rate", 0.25)
    assert resolve_traces_sample_rate() == 0.25
