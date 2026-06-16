from pydantic import BaseModel, Field

from app.schemas.user import UserProfile


class GoogleMobileAuthPayload(BaseModel):
    id_token: str = Field(min_length=20)
    kvkk_consent_accepted: bool = False


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
