from pydantic import BaseModel, Field

from app.schemas.user import UserProfile


class GoogleMobileAuthPayload(BaseModel):
    id_token: str = Field(min_length=20)


class GoogleMobileAuthResponse(BaseModel):
    profile: UserProfile
