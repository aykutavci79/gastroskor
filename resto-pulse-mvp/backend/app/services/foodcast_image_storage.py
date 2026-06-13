from __future__ import annotations

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.media_storage import ALLOWED_CONTENT_TYPES, new_filename, upload_bytes
from app.services.review_image_storage import REVIEW_IMAGE_MAX_EDGE_PX, REVIEW_WEBP_QUALITY, compress_review_image

FOODCAST_IMAGE_MAX_EDGE_PX = REVIEW_IMAGE_MAX_EDGE_PX
FOODCAST_WEBP_QUALITY = REVIEW_WEBP_QUALITY


def foodcast_images_dir():
    from app.services.media_storage import local_subdir

    return local_subdir("foodcast_images")


async def save_foodcast_image(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sadece JPG, PNG veya WEBP yukleyebilirsiniz.",
        )

    raw = await file.read()
    max_bytes = settings.review_image_upload_max_bytes
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dosya cok buyuk (max 8 MB).",
        )
    if len(raw) < 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gecersiz dosya.")

    data = compress_review_image(raw)
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Sikistirilmis gorsel hala cok buyuk.",
        )

    filename = new_filename(".webp")
    return upload_bytes(folder="foodcast_images", filename=filename, data=data, content_type="image/webp")
