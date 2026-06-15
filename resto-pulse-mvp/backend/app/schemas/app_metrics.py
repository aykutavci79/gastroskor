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
    web_visitors: int = 0
    web_sessions: int = 0
    mobile_visitors: int = 0
    mobile_sessions: int = 0
    avg_session_seconds: float | None
    web_avg_session_seconds: float | None = None
    mobile_avg_session_seconds: float | None = None
    logins: int
    live_searches: int
    reviews: int
    new_registrations: int = 0


class AppMetricsTotals(BaseModel):
    unique_users: int
    sessions: int
    web_visitors: int = 0
    web_sessions: int = 0
    mobile_visitors: int = 0
    mobile_sessions: int = 0
    avg_session_seconds: float | None
    web_avg_session_seconds: float | None = None
    mobile_avg_session_seconds: float | None = None
    logins: int
    live_searches: int
    reviews: int
    total_registered_users: int
    new_registrations: int = 0
    new_registrations_today: int = 0


class NewUserRow(BaseModel):
    email: str
    full_name: str | None = None
    created_at: str


class AppMetricsSummaryResponse(BaseModel):
    period_days: int
    totals: AppMetricsTotals
    daily: list[AppMetricsDailyRow]
    new_users_today: list[NewUserRow] = []
