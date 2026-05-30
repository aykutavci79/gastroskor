from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.services.menu_image_storage import ALLOWED_CONTENT_TYPES

MAX_REVIEW_IMAGES_PER_REVIEW = 4
REVIEW_IMAGE_MAX_EDGE_PX = 1280
REVIEW_WEBP_QUALITY = 82


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


def compress_review_image(data: bytes) -> bytes:
    """Resize + WebP; typical phone photo 3–5 MB -> ~150–400 KB."""
    try:
        img = Image.open(BytesIO(data))
        img = ImageOps.exif_transpose(img)
    except UnidentifiedImageError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Gecersiz gorsel dosyasi.",
        ) from exc

    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        if img.mode in ("RGBA", "LA"):
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    img.thumbnail((REVIEW_IMAGE_MAX_EDGE_PX, REVIEW_IMAGE_MAX_EDGE_PX), Image.Resampling.LANCZOS)

    out = BytesIO()
    img.save(out, format="WEBP", quality=REVIEW_WEBP_QUALITY, method=4)
    return out.getvalue()


async def save_review_image(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Sadece JPG, PNG veya WEBP yukleyebilirsiniz.",
        )

    raw = await file.read()
    if len(raw) > settings.menu_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Dosya cok buyuk (max 5 MB).",
        )
    if len(raw) < 100:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Gecersiz dosya.")

    data = compress_review_image(raw)
    if len(data) > settings.menu_upload_max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Sikistirilmis gorsel hala cok buyuk.",
        )

    filename = f"{uuid.uuid4().hex}.webp"
    path = review_images_dir() / filename
    path.write_bytes(data)
    return public_review_image_url(filename)
