from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.media_storage import (
    ALLOWED_CONTENT_TYPES,
    local_subdir,
    media_root,
    new_filename,
    upload_bytes,
)


def menu_images_dir():
    """FastAPI StaticFiles mount icin yerel menu klasoru."""
    return local_subdir("menu_images")


async def save_menu_image(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    ext = ALLOWED_CONTENT_TYPES.get(content_type)
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sadece JPG, PNG veya WEBP yukleyebilirsiniz.",
        )

    data = await file.read()
    if len(data) > settings.menu_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dosya cok buyuk (max 5 MB).",
        )
    if len(data) < 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gecersiz dosya.")

    filename = new_filename(ext)
    return upload_bytes(folder="menu_images", filename=filename, data=data, content_type=content_type)


__all__ = ["ALLOWED_CONTENT_TYPES", "menu_images_dir", "media_root", "save_menu_image"]
