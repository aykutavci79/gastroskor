import os
from pathlib import Path

from pydantic import field_validator, model_validator
from typing import Self
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
    jwt_access_token_expire_hours: int = 2
    jwt_refresh_token_expire_days: int = 30
    # production'da varsayilan true; lokal test icin AUTH_REQUIRE_BEARER=false
    auth_require_bearer: bool | None = None

    google_places_api_key: str | None = None
    google_oauth_web_client_id: str | None = None
    google_oauth_web_client_secret: str | None = None
    google_oauth_android_client_id: str | None = None
    google_oauth_ios_client_id: str | None = None
    gemini_api_key: str | None = None
    places_timeout_ms: int = 10000
    places_max_reviews: int = 5
    openai_api_key: str | None = None
    groq_api_key: str | None = None
    anthropic_api_key: str | None = None
    voice_transcribe_groq_model: str = "whisper-large-v3-turbo"
    voice_transcribe_openai_model: str = "gpt-4o-mini-transcribe"
    voice_transcribe_max_bytes: int = 5_000_000
    voice_transcribe_timeout_sec: float = 25.0

    sms_provider: str = "mock"
    netgsm_user: str | None = None
    netgsm_password: str | None = None
    netgsm_header: str | None = None
    iletimerkezi_api_key: str | None = None
    iletimerkezi_api_hash: str | None = None
    iletimerkezi_sender: str = "APITEST"
    otp_expiry_minutes: int = 10
    # Virgulle: bu numaralar siparis SMS OTP atlanir (or. 05321234567,+905551112233)
    order_phone_test_bypass: str = ""
    panel_admin_secret: str | None = None
    panel_admin_emails: str = ""
    # Mekan claim: SMS yerine admin onayi (pilot icin varsayilan acik)
    claim_admin_approval_only: bool = True
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
    review_image_upload_max_bytes: int = 8_000_000

    # Gorsel depolama: local (MEDIA_DATA_DIR + Railway Volume) veya s3 (Cloudflare R2 / AWS)
    media_storage: str = "local"
    media_data_dir: str | None = None
    s3_bucket: str | None = None
    s3_region: str = "auto"
    s3_endpoint_url: str | None = None
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_public_base_url: str | None = None

    email_provider: str = "mock"
    email_from: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    cron_secret: str | None = None
    # Günlük KPI e-postası (bos ise panel_admin_emails kullanilir)
    metrics_daily_report_emails: str = ""

    gourmet_assistant_enabled: bool = True
    gourmet_assistant_greeting_delay_sec: int = 180
    gourmet_assistant_followup_delay_sec: int = 60
    gourmet_assistant_room_cooldown_sec: int = 1800
    gourmet_assistant_max_per_room_hour: int = 3
    gourmet_assistant_max_per_user_day: int = 5
    gourmet_assistant_room_max_msg_per_hour: int = 20
    gourmet_assistant_gemini_personality: bool = True

    gourmet_trivia_enabled: bool = True
    gourmet_trivia_interval_sec: int = 180
    gourmet_trivia_answer_window_sec: int = 90

    # Kelime Sofrası — anonim deneme loglama
    sofra_havuz_json_path: str | None = None
    sofra_tdk_json_path: str | None = None
    sofra_attempt_min_count: int = 3
    sofra_mobile_root: str | None = None
    sentry_dsn: str | None = None

    # Sosyal kanit (discover/search) — last30days + Groq sentiment
    social_proof_groq_model: str = "llama-3.1-8b-instant"
    social_proof_groq_timeout_sec: float = 30.0
    social_proof_scan_timeout_sec: float = 120.0
    social_proof_scan_mock: bool = False
    social_proof_last30days_script: str | None = None
    social_proof_last30days_python: str | None = None
    social_proof_eksi_enabled: bool = True
    social_proof_eksi_timeout_sec: float = 20.0
    social_proof_eksi_max_topics: int = 6
    social_proof_eksi_max_entries: int = 50
    # Rozet tazeligi: sosyal sentiment yavas degisir → 7 gun cache yeterli (maliyet/tazelik dengesi)
    social_proof_cache_ttl_hours: int = 168
    # Rozet uygunluk tabani: az taninan mekan sosyal kanit listesine giremez
    social_proof_min_reviews: int = 1000
    # Google puani bu esigin altina duserse rozet gizlenir (sentiment ne olursa olsun)
    social_proof_min_rating: float = 4.0

    # Yorum, DM, gurme sohbet, takma ad — argo/kufur filtresi (varsayilan kapali)
    content_moderation_enabled: bool = False

    # Rate limiting — Redis yoksa in-memory fallback (cok instance'da zayif koruma)
    redis_url: str | None = None
    redis_private_url: str | None = None
    rate_limit_redis_key_prefix: str = "gastroskor:rl"
    rate_limit_user_global_per_minute: int = 100
    rate_limit_user_global_window_sec: int = 60

    @field_validator("redis_url", "redis_private_url", mode="before")
    @classmethod
    def strip_redis_url(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def merge_redis_urls(self) -> Self:
        if not self.redis_url and self.redis_private_url:
            self.redis_url = self.redis_private_url
        return self

    # Kart/liste Google foto — her img yuklemesi Places Photo ucreti. Varsayilan kapali.
    google_card_photos_enabled: bool = False

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


settings = Settings()

