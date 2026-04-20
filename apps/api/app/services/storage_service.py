from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings


ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


class StoredFile:
    def __init__(self, storage_path: str, public_url: str, mime_type: str, file_size: int) -> None:
        self.storage_path = storage_path
        self.public_url = public_url
        self.mime_type = mime_type
        self.file_size = file_size


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

    storage_root = Path(settings.upload_storage_dir)
    relative_dir = Path("listing-images") / listing_id
    target_dir = storage_root / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid4()}{suffix}"
    target_path = target_dir / filename
    target_path.write_bytes(content)

    storage_path = str(relative_dir / filename).replace("\\", "/")
    public_url = f"{settings.upload_public_base_url.rstrip('/')}/{storage_path}"
    return StoredFile(
        storage_path=storage_path,
        public_url=public_url,
        mime_type=content_type,
        file_size=len(content),
    )
