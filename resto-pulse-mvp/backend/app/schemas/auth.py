from pydantic import BaseModel, Field
from uuid import UUID

from app.schemas.user import UserProfile


class GoogleMobileAuthPayload(BaseModel):
    id_token: str = Field(min_length=20)
    kvkk_consent_accepted: bool = False
    referrer_id: UUID | None = None
    device_hash: str | None = Field(default=None, max_length=128)


class GoogleMobileAuthResponse(BaseModel):
    profile: UserProfile
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class AuthRefreshPayload(BaseModel):
    refresh_token: str = Field(min_length=20)


class AuthTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int


class DevLoginPayload(BaseModel):
    email: str = Field(default="dev@gastroskor.local", min_length=3, max_length=120)
    dev_secret: str | None = Field(default=None, max_length=128)
