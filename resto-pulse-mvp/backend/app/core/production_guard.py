from __future__ import annotations

from app.core.config import Settings


def is_production_environment(environment: str | None = None) -> bool:
    if environment is None:
        from app.core.config import settings

        env = settings.environment
    else:
        env = environment
    return env.strip().lower() == "production"


def _secret_invalid(value: str | None, forbidden: frozenset[str]) -> bool:
    cleaned = (value or "").strip()
    return not cleaned or cleaned in forbidden


def assert_production_secrets(settings: Settings) -> None:
    """Production'da zorunlu secret'lar yoksa veya placeholder ise startup'i durdur."""
    if not is_production_environment(settings.environment):
        return

    if _secret_invalid(settings.jwt_secret, frozenset({"", "change-me"})):
        raise RuntimeError("JWT_SECRET production ortaminda ayarlanmali (change-me kullanilamaz).")

    if _secret_invalid(settings.cron_secret, frozenset({"", "change-me-cron-secret"})):
        raise RuntimeError("CRON_SECRET production ortaminda ayarlanmali (bos veya placeholder olamaz).")

    if _secret_invalid(settings.panel_admin_secret, frozenset({"", "change-me-panel-admin"})):
        raise RuntimeError(
            "PANEL_ADMIN_SECRET production ortaminda ayarlanmali (bos veya placeholder olamaz)."
        )

    if _secret_invalid(settings.otp_pepper, frozenset({"", "dev-otp-pepper-change-me"})):
        raise RuntimeError("OTP_PEPPER production ortaminda ayarlanmali (bos veya placeholder olamaz).")
