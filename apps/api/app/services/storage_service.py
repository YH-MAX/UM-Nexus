from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError, ExternalProviderError
from app.integrations.supabase_storage import upload_listing_image_to_supabase


ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class StoredFile:
    def __init__(
        self,
        storage_bucket: str,
        storage_path: str,
        public_url: str,
        mime_type: str,
        file_size: int,
        content_hash: str,
    ) -> None:
        self.storage_bucket = storage_bucket
        self.storage_path = storage_path
        self.public_url = public_url
        self.mime_type = mime_type
        self.file_size = file_size
        self.content_hash = content_hash


async def store_listing_image_upload(listing_id: str, upload_file: UploadFile) -> StoredFile:
    settings = get_settings()
    original_name = upload_file.filename or ""
    suffix = Path(original_name).suffix.lower()
    content_type = (upload_file.content_type or "").lower()

    if suffix == ".jpeg":
        suffix = ".jpg"

    if suffix not in ALLOWED_IMAGE_EXTENSIONS or content_type not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only jpg, jpeg, png, and webp images are allowed.",
        )

    content = await upload_file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")
    if len(content) > settings.max_upload_file_size_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Uploaded file is too large.")

    filename = f"{uuid4()}{suffix}"
    storage_path = f"listings/{listing_id}/{filename}"
    try:
        uploaded = await upload_listing_image_to_supabase(
            storage_path=storage_path,
            content=content,
            mime_type=content_type,
            settings=settings,
        )
    except (ConfigurationError, ExternalProviderError) as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return StoredFile(
        storage_bucket=uploaded.storage_bucket,
        storage_path=uploaded.storage_path,
        public_url=uploaded.public_url,
        mime_type=uploaded.mime_type,
        file_size=uploaded.file_size,
        content_hash=sha256(content).hexdigest(),
    )
