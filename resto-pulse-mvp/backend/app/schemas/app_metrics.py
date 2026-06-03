from pydantic import BaseModel, Field


class AppUsageEventCreate(BaseModel):
    event_type: str = Field(description="session_start | session_end")
    session_id: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0, le=86400)
    platform: str | None = Field(default=None, max_length=16)
    app_version: str | None = Field(default=None, max_length=32)
    user_id: str | None = None


class AppMetricsDailyRow(BaseModel):
    date: str
    unique_users: int
    sessions: int
    avg_session_seconds: float | None
    logins: int
    live_searches: int
    reviews: int


class AppMetricsTotals(BaseModel):
    unique_users: int
    sessions: int
    avg_session_seconds: float | None
    logins: int
    live_searches: int
    reviews: int
    total_registered_users: int


class AppMetricsSummaryResponse(BaseModel):
    period_days: int
    totals: AppMetricsTotals
    daily: list[AppMetricsDailyRow]
