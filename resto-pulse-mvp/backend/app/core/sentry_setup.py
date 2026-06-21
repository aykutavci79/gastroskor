from __future__ import annotations

import logging
import sys

from app.core.config import settings
from app.core.production_guard import is_production_environment
from app.core.sentry_scrub import create_sentry_before_send

logger = logging.getLogger(__name__)

_initialized = False


def _sentry_log(message: str) -> None:
    """Railway deploy loglarinda gorunur olsun diye stdout + logger."""
    print(message, flush=True)
    logger.warning(message)


def resolve_traces_sample_rate() -> float:
    configured = settings.sentry_traces_sample_rate
    if configured is not None:
        return max(0.0, min(1.0, float(configured)))
    return 0.1 if is_production_environment() else 0.0


def is_sentry_initialized() -> bool:
    try:
        import sentry_sdk

        return sentry_sdk.Hub.current.client is not None
    except Exception:
        return False


def init_sentry() -> bool:
    """Sentry error + performance monitoring. DSN yoksa no-op."""
    global _initialized
    dsn_set = bool((settings.sentry_dsn or "").strip())
    _sentry_log(
        f"Sentry init: dsn_set={dsn_set} environment={settings.environment} "
        f"already_initialized={_initialized}"
    )

    if _initialized:
        _sentry_log("Sentry init: skip (already initialized)")
        return True

    if not dsn_set:
        _sentry_log("Sentry init: skip (SENTRY_DSN bos)")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError as exc:
        _sentry_log(f"Sentry init: FAILED import sentry-sdk — {exc}")
        return False

    traces_sample_rate = resolve_traces_sample_rate()
    try:
        sentry_sdk.init(
            dsn=settings.sentry_dsn.strip(),
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
    except Exception as exc:
        _sentry_log(f"Sentry init: FAILED sentry_sdk.init — {type(exc).__name__}: {exc}")
        return False

    _initialized = True
    client_ok = sentry_sdk.Hub.current.client is not None
    _sentry_log(
        f"Sentry init: OK client_active={client_ok} traces_sample_rate={traces_sample_rate:.2f} "
        f"python={sys.version.split()[0]}"
    )
    return client_ok


def capture_sentry_test_event() -> str:
    """Test exception — Sentry Issues'da gorunmeli."""
    import sentry_sdk

    if not is_sentry_initialized():
        raise RuntimeError("Sentry client not initialized")
    event_id = sentry_sdk.capture_exception(RuntimeError("GastroSkor Sentry test event (safe to ignore)"))
    sentry_sdk.flush(timeout=5)
    return str(event_id) if event_id else ""
