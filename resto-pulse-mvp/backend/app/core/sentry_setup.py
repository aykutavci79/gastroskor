from __future__ import annotations

import logging

from app.core.config import settings
from app.core.production_guard import is_production_environment
from app.core.sentry_scrub import create_sentry_before_send

logger = logging.getLogger(__name__)

_initialized = False


def resolve_traces_sample_rate() -> float:
    configured = settings.sentry_traces_sample_rate
    if configured is not None:
        return max(0.0, min(1.0, float(configured)))
    return 0.1 if is_production_environment() else 0.0


def init_sentry() -> bool:
    """Sentry error + performance monitoring. DSN yoksa no-op."""
    global _initialized
    if _initialized:
        return True

    dsn = (settings.sentry_dsn or "").strip()
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("sentry-sdk yuklu degil — Sentry atlandi")
        return False

    traces_sample_rate = resolve_traces_sample_rate()
    sentry_sdk.init(
        dsn=dsn,
        environment=settings.environment,
        send_default_pii=False,
        traces_sample_rate=traces_sample_rate,
        before_send=create_sentry_before_send(),
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
    )
    _initialized = True
    logger.info(
        "Sentry aktif (environment=%s, traces_sample_rate=%.2f)",
        settings.environment,
        traces_sample_rate,
    )
    return True
