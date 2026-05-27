from pydantic import BaseModel, ConfigDict, Field


class GeoIndicationRead(BaseModel):
    """Tescilli veya bilinen coğrafi isim / coğrafi işaret urunu."""

    product: str = Field(min_length=2, max_length=120)
    region: str | None = Field(default=None, max_length=120)
    registry_note: str | None = Field(
        default=None,
        max_length=255,
        description="Ornek: Turk Patent ve Marka Kurumu tescilli",
    )

    model_config = ConfigDict(from_attributes=True)
