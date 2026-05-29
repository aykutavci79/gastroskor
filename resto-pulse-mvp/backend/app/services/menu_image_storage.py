from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def menu_images_dir() -> Path:
    root = Path(__file__).resolve().parents[2] / "data" / "menu_images"
    root.mkdir(parents=True, exist_ok=True)
    return root


def public_menu_image_url(filename: str) -> str:
    base = (settings.public_api_base_url or "").rstrip("/")
    return f"{base}/media/menu/{filename}"


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

    filename = f"{uuid.uuid4().hex}{ext}"
    path = menu_images_dir() / filename
    path.write_bytes(data)
    return public_menu_image_url(filename)
