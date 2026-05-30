from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.menu_image_storage import ALLOWED_CONTENT_TYPES

MAX_REVIEW_IMAGES_PER_REVIEW = 4


def review_images_dir() -> Path:
    root = Path(__file__).resolve().parents[2] / "data" / "review_images"
    try:
        root.mkdir(parents=True, exist_ok=True)
    except OSError:
        root = Path("/tmp/gastroskor_review_images")
        root.mkdir(parents=True, exist_ok=True)
    return root


def public_review_image_url(filename: str) -> str:
    base = (settings.public_api_base_url or "").rstrip("/")
    return f"{base}/media/reviews/{filename}"


async def save_review_image(file: UploadFile) -> str:
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
    path = review_images_dir() / filename
    path.write_bytes(data)
    return public_review_image_url(filename)
