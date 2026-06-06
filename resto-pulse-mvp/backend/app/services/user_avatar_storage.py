from __future__ import annotations

from io import BytesIO

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings
from app.services.media_storage import ALLOWED_CONTENT_TYPES, local_subdir, new_filename, upload_bytes

AVATAR_MAX_EDGE_PX = 512
AVATAR_WEBP_QUALITY = 85


def user_avatars_dir():
    return local_subdir("user_avatars")


def compress_avatar_image(data: bytes) -> bytes:
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

    img.thumbnail((AVATAR_MAX_EDGE_PX, AVATAR_MAX_EDGE_PX), Image.Resampling.LANCZOS)

    out = BytesIO()
    img.save(out, format="WEBP", quality=AVATAR_WEBP_QUALITY, method=4)
    return out.getvalue()


async def save_user_avatar(file: UploadFile) -> str:
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

    data = compress_avatar_image(raw)
    filename = new_filename(".webp")
    return upload_bytes(folder="user_avatars", filename=filename, data=data, content_type="image/webp")
