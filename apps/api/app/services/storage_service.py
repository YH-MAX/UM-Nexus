from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from urllib.parse import quote
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
    return await _store_image_upload(f"listings/{listing_id}", upload_file)


async def store_draft_image_upload(draft_id: str, upload_file: UploadFile) -> StoredFile:
    return await _store_image_upload(f"listing-drafts/{draft_id}", upload_file)


async def _store_image_upload(storage_prefix: str, upload_file: UploadFile) -> StoredFile:
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
    normalized_prefix = "/".join(part for part in storage_prefix.replace("\\", "/").split("/") if part not in {"", ".", ".."})
    if not normalized_prefix:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image storage path cannot be empty.")
    storage_path = f"{normalized_prefix}/{filename}"
    try:
        uploaded = await upload_listing_image_to_supabase(
            storage_path=storage_path,
            content=content,
            mime_type=content_type,
            settings=settings,
        )
    except (ConfigurationError, ExternalProviderError) as exc:
        if settings.app_env != "development":
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
        uploaded = _store_local_development_upload(
            storage_path=storage_path,
            content=content,
            mime_type=content_type,
            error_message=str(exc),
        )

    return StoredFile(
        storage_bucket=uploaded.storage_bucket,
        storage_path=uploaded.storage_path,
        public_url=uploaded.public_url,
        mime_type=uploaded.mime_type,
        file_size=uploaded.file_size,
        content_hash=sha256(content).hexdigest(),
    )


def _store_local_development_upload(
    *,
    storage_path: str,
    content: bytes,
    mime_type: str,
    error_message: str,
) -> StoredFile:
    settings = get_settings()
    normalized_path = "/".join(part for part in storage_path.replace("\\", "/").split("/") if part not in {"", ".", ".."})
    if not normalized_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image storage path cannot be empty.")

    target_path = Path(settings.upload_storage_dir) / normalized_path
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(content)
    public_path = "/".join(quote(part, safe="") for part in normalized_path.split("/"))
    public_url = f"{settings.upload_public_base_url.rstrip('/')}/{public_path}"

    return StoredFile(
        storage_bucket="local-development-uploads",
        storage_path=normalized_path,
        public_url=public_url,
        mime_type=mime_type,
        file_size=len(content),
        content_hash=sha256(content).hexdigest(),
    )
