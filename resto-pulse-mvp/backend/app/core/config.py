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

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")


settings = Settings()

