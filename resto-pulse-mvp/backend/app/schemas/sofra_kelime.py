from pydantic import BaseModel, Field


class SofraWheelAttemptPayload(BaseModel):
    kelime: str = Field(min_length=1, max_length=32)


class SofraWheelAttemptResponse(BaseModel):
    ok: bool = True
    logged: bool
