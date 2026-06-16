from typing import Literal

from pydantic import BaseModel, Field

AuthorNameDisplayMode = Literal["full", "masked", "nickname"]


class UserSyncPayload(BaseModel):
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    google_sub: str | None = None
    record_login: bool = False
    default_review_name_display: AuthorNameDisplayMode | None = None
    kvkk_consent_accepted: bool = False


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    avatar_preset: str | None = None
    nickname: str | None = None
    needs_nickname_setup: bool = False
    default_review_name_display: AuthorNameDisplayMode = "full"
    gastro_score: float | None = None
    review_count: int = Field(ge=0, default=0)
    google_sub: str | None = None


class NicknameCheckResponse(BaseModel):
    available: bool
    message: str | None = None
    highlights: list[str] = Field(default_factory=list)


class GourmetProfileUpdate(BaseModel):
    user_email: str
    nickname: str | None = None
    avatar_preset: str | None = None
    use_preset_avatar: bool = False
    default_review_name_display: AuthorNameDisplayMode | None = None


class AvatarPresetItem(BaseModel):
    id: str
    label: str
    emoji: str
