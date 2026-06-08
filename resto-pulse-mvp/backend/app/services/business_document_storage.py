"""Vergi levhasi vb. isletme belgeleri — herkese acik URL yok, yalnizca admin/indirme."""

from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, status

from app.services.media_storage import local_subdir, media_root, new_filename, s3_configured

BUSINESS_DOC_TYPES = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_BYTES = 8 * 1024 * 1024
FOLDER = "business_documents"


def validate_business_document(*, data: bytes, content_type: str) -> str:
    if len(data) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Belge en fazla 8 MB olabilir.",
        )
    ext = BUSINESS_DOC_TYPES.get(content_type.lower())
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="PDF veya JPEG/PNG/WebP yukleyin.",
        )
    return ext


def save_business_document(*, data: bytes, content_type: str) -> str:
    ext = validate_business_document(data=data, content_type=content_type)
    filename = new_filename(ext)
    if s3_configured():
        from app.services.media_storage import _upload_s3

        _upload_s3(folder=FOLDER, filename=filename, data=data, content_type=content_type)
    else:
        path = local_subdir(FOLDER) / filename
        path.write_bytes(data)
    return f"{FOLDER}/{filename}"


def read_business_document(storage_key: str) -> tuple[bytes, str]:
    key = storage_key.strip().lstrip("/")
    if ".." in key or not key.startswith(f"{FOLDER}/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Belge bulunamadi.")

    if s3_configured():
        from app.core.config import settings

        try:
            import boto3
            from botocore.config import Config
        except ImportError as exc:
            raise RuntimeError("S3 okuma icin boto3 gerekli.") from exc

        client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url or None,
            aws_access_key_id=settings.s3_access_key_id,
            aws_secret_access_key=settings.s3_secret_access_key,
            region_name=settings.s3_region or "auto",
            config=Config(signature_version="s3v4"),
        )
        obj = client.get_object(Bucket=settings.s3_bucket, Key=key)
        body = obj["Body"].read()
        content_type = obj.get("ContentType") or "application/octet-stream"
        return body, content_type

    path = media_root() / key
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Belge bulunamadi.")
    suffix = path.suffix.lower()
    content_type = next((ct for ct, ext in BUSINESS_DOC_TYPES.items() if ext == suffix), "application/octet-stream")
    return path.read_bytes(), content_type


def document_download_name(storage_key: str, prefix: str = "vergi-levhasi") -> str:
    suffix = Path(storage_key).suffix or ".pdf"
    return f"{prefix}{suffix}"
