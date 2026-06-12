from typing import Literal

from pydantic import BaseModel, Field


class VoiceTranscribeResponse(BaseModel):
    text: str = Field(..., description="Taninan metin (tr-TR)")
    provider: Literal["groq", "openai"]
    language: str = "tr"
