from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.auth.dependencies import require_authenticated_user
from app.db.session import get_db
from app.schemas.listing import (
    ListingCreate,
    ListingImageCreate,
    ListingImageRead,
    ListingRead,
    ListingReportCreate,
    ListingReportRead,
    ListingUpdate,
)
from app.schemas.trade_intelligence import TradeMatchRead
from app.services.trade_intelligence import list_matches_for_listing
from app.services.trade_service import (
    add_listing_image,
    add_uploaded_listing_image,
    apply_recommended_price,
    create_listing,
    create_listing_report,
    get_listing,
    list_listings,
    update_listing,
)


router = APIRouter()


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing_endpoint(
    payload: ListingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = create_listing(db, payload, current_user)
    return ListingRead.model_validate(listing)


@router.get("", response_model=list[ListingRead])
def list_listings_endpoint(
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    pickup_area: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    status_filter: str | None = Query(default="active", alias="status"),
    sort: str = Query(default="newest"),
) -> list[ListingRead]:
    return [
        ListingRead.model_validate(listing)
        for listing in list_listings(
            db,
            category=category,
            search=search,
            min_price=min_price,
            max_price=max_price,
            pickup_area=pickup_area,
            risk_level=risk_level,
            status=status_filter,
            sort=sort,
        )
    ]


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
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = update_listing(db, str(listing_id), payload, current_user)
    return ListingRead.model_validate(listing)


@router.post("/{listing_id}/images", response_model=ListingImageRead, status_code=status.HTTP_201_CREATED)
async def add_listing_image_endpoint(
    listing_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
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
            current_user=current_user,
            sort_order=sort_order,
            is_primary=is_primary,
        )
        return ListingImageRead.model_validate(image)

    payload = ListingImageCreate.model_validate(await request.json())
    image = add_listing_image(db, str(listing_id), payload, current_user)
    return ListingImageRead.model_validate(image)


@router.post("/{listing_id}/apply-recommended-price", response_model=ListingRead)
def apply_recommended_price_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = apply_recommended_price(db, str(listing_id), current_user)
    return ListingRead.model_validate(listing)


@router.post("/{listing_id}/reports", response_model=ListingReportRead, status_code=status.HTTP_201_CREATED)
def create_listing_report_endpoint(
    listing_id: UUID,
    payload: ListingReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingReportRead:
    report = create_listing_report(db, str(listing_id), payload, current_user)
    return ListingReportRead.model_validate(report)


@router.get("/{listing_id}/matches", response_model=list[TradeMatchRead])
def get_listing_matches_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
) -> list[TradeMatchRead]:
    return [TradeMatchRead.model_validate(match) for match in list_matches_for_listing(db, str(listing_id))]
