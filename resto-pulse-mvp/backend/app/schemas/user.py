from pydantic import BaseModel, Field


class UserSyncPayload(BaseModel):
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    google_sub: str | None = None


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    gastro_score: float | None = None
    review_count: int = Field(ge=0, default=0)
