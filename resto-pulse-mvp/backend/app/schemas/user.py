from typing import Literal

from pydantic import BaseModel, Field

AuthorNameDisplayMode = Literal["full", "masked"]


class UserSyncPayload(BaseModel):
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    google_sub: str | None = None
    record_login: bool = False
    default_review_name_display: AuthorNameDisplayMode | None = None


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    default_review_name_display: AuthorNameDisplayMode = "full"
    gastro_score: float | None = None
    review_count: int = Field(ge=0, default=0)
