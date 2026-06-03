"""Menu / kapak / yorum gorselleri — kalici depolama (yerel volume veya S3/R2)."""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def media_root() -> Path:
    if settings.media_data_dir:
        root = Path(settings.media_data_dir)
    else:
        root = Path(__file__).resolve().parents[2] / "data"
    try:
        root.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        if settings.environment.lower() == "production":
            logger.error(
                "MEDIA_DATA_DIR yazilamiyor (%s). Railway Volume veya S3/R2 ayarla.", exc
            )
        root = Path("/tmp/gastroskor_media")
        root.mkdir(parents=True, exist_ok=True)
    return root


def local_subdir(name: str) -> Path:
    path = media_root() / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def local_public_url(folder: str, filename: str) -> str:
    base = (settings.public_api_base_url or "").rstrip("/")
    return f"{base}/media/{folder}/{filename}"


def s3_configured() -> bool:
    return bool(
        settings.media_storage == "s3"
        and settings.s3_bucket
        and settings.s3_access_key_id
        and settings.s3_secret_access_key
        and settings.s3_public_base_url
    )


FOLDER_PUBLIC_PATH = {
    "menu_images": "menu",
    "review_images": "reviews",
}


def upload_bytes(*, folder: str, filename: str, data: bytes, content_type: str) -> str:
    if s3_configured():
        return _upload_s3(folder=folder, filename=filename, data=data, content_type=content_type)
    path = local_subdir(folder) / filename
    path.write_bytes(data)
    public_path = FOLDER_PUBLIC_PATH.get(folder, folder)
    return local_public_url(public_path, filename)


def _upload_s3(*, folder: str, filename: str, data: bytes, content_type: str) -> str:
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError("S3 depolama icin boto3 gerekli (requirements.txt).") from exc

    key = f"{folder}/{filename}"
    client = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url or None,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region or "auto",
        config=Config(signature_version="s3v4"),
    )
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=data,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )
    base = settings.s3_public_base_url.rstrip("/")
    return f"{base}/{key}"


def new_filename(ext: str) -> str:
    return f"{uuid.uuid4().hex}{ext}"
