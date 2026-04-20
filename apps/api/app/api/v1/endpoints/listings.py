from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.db.session import get_db
from app.schemas.listing import ListingCreate, ListingImageCreate, ListingImageRead, ListingRead, ListingUpdate
from app.schemas.trade_intelligence import TradeMatchRead
from app.services.trade_intelligence import list_matches_for_listing
from app.services.trade_service import (
    add_listing_image,
    add_uploaded_listing_image,
    create_listing,
    get_listing,
    list_listings,
    update_listing,
)


router = APIRouter()


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing_endpoint(
    payload: ListingCreate,
    db: Session = Depends(get_db),
) -> ListingRead:
    listing = create_listing(db, payload)
    return ListingRead.model_validate(listing)


@router.get("", response_model=list[ListingRead])
def list_listings_endpoint(db: Session = Depends(get_db)) -> list[ListingRead]:
    return [ListingRead.model_validate(listing) for listing in list_listings(db)]


@router.get("/{listing_id}", response_model=ListingRead)
def get_listing_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> ListingRead:
    return ListingRead.model_validate(get_listing(db, str(listing_id)))


@router.patch("/{listing_id}", response_model=ListingRead)
def update_listing_endpoint(
    listing_id: UUID,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
) -> ListingRead:
    listing = update_listing(db, str(listing_id), payload)
    return ListingRead.model_validate(listing)


@router.post("/{listing_id}/images", response_model=ListingImageRead, status_code=status.HTTP_201_CREATED)
async def add_listing_image_endpoint(
    listing_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
) -> ListingImageRead:
    content_type = request.headers.get("content-type", "")
    if content_type.startswith("multipart/form-data"):
        form = await request.form()
        file_value = form.get("file")
        if not isinstance(file_value, StarletteUploadFile):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Image file field is required.")
        sort_order = int(str(form.get("sort_order", "0") or "0"))
        is_primary = str(form.get("is_primary", "false")).lower() in {"true", "1", "yes", "on"}
        image = await add_uploaded_listing_image(
            db,
            str(listing_id),
            file_value,
            sort_order=sort_order,
            is_primary=is_primary,
        )
        return ListingImageRead.model_validate(image)

    payload = ListingImageCreate.model_validate(await request.json())
    image = add_listing_image(db, str(listing_id), payload)
    return ListingImageRead.model_validate(image)


@router.get("/{listing_id}/matches", response_model=list[TradeMatchRead])
def get_listing_matches_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> list[TradeMatchRead]:
    return [TradeMatchRead.model_validate(match) for match in list_matches_for_listing(db, str(listing_id))]
