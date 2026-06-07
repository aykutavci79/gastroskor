from datetime import datetime

from pydantic import BaseModel, Field


class CheckInPayload(BaseModel):
    user_email: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class CheckInResult(BaseModel):
    check_in_id: str
    created_at: datetime
    visitor_count: int = Field(ge=0)


class CheckInStatus(BaseModel):
    visitor_count: int = Field(ge=0, default=0)
    checked_in_today: bool = False
    last_check_in_at: datetime | None = None
