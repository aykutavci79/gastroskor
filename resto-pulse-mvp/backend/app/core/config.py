import os
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
_ENV_FILE = None if os.getenv("ENVIRONMENT") == "production" else str(BASE_DIR / ".env")


class Settings(BaseSettings):
    app_name: str = "GastroSkor API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/resto_pulse"

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        if value.startswith("postgres://"):
            return "postgresql+psycopg://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://") and "+psycopg" not in value.split("://", 1)[0]:
            return "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"

    google_places_api_key: str | None = None
    gemini_api_key: str | None = None
    places_timeout_ms: int = 10000
    places_max_reviews: int = 5
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None

    sms_provider: str = "mock"
    netgsm_user: str | None = None
    netgsm_password: str | None = None
    netgsm_header: str | None = None
    otp_expiry_minutes: int = 10
    panel_admin_secret: str | None = None
    panel_admin_emails: str = ""
    trial_days: int = 30
    default_ai_analysis_interval_days: int = 33

    price_panel_intro_tl: int = 399
    price_panel_monthly_tl: int = 599
    price_extra_ai_tl: int = 199
    price_addon_weekly_tl: int = 249
    price_addon_daily_tl: int = 499
    panel_payments_mock: bool = True
    public_api_base_url: str = "https://api.gastroskor.com.tr"
    public_site_base_url: str = "https://www.gastroskor.com.tr"
    public_panel_base_url: str = "https://www.gastroskor.com.tr/panel"
    menu_upload_max_bytes: int = 5_000_000

    email_provider: str = "mock"
    email_from: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    cron_secret: str | None = None

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


settings = Settings()

