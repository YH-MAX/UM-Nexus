from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile as StarletteUploadFile

from app.auth.dependencies import get_optional_authenticated_user, require_authenticated_user
from app.db.session import get_db
from app.schemas.listing import (
    ListingCreate,
    ListingFavoriteRead,
    ListingImageCreate,
    ListingImageRead,
    ListingRead,
    ListingReportCreate,
    ListingReportRead,
    ListingStatusUpdate,
    ListingUpdate,
)
from app.schemas.trade_product import ContactRequestCreate, ContactRequestRead, DecisionFeedbackCreate, DecisionFeedbackRead
from app.schemas.trade_intelligence import TradeMatchRead
from app.services.trade_intelligence import list_matches_for_listing
from app.services.trade_service import (
    add_listing_image,
    add_uploaded_listing_image,
    apply_recommended_price,
    contact_request_read,
    create_contact_request,
    create_listing,
    create_decision_feedback,
    create_listing_report,
    add_favorite,
    delete_listing,
    get_listing,
    publish_listing,
    remove_favorite,
    remove_listing_image,
    update_listing_status,
    list_listings,
    update_listing,
)


router = APIRouter()


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
def create_listing_endpoint(
    payload: ListingCreate,
    publish: bool | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    # Backward compatibility: pre-launch clients posted directly to publish.
    should_publish = True if publish is None else publish
    listing = create_listing(
        db,
        payload,
        current_user,
        publish=should_publish,
        require_profile=publish is True,
    )
    return ListingRead.model_validate(listing)


@router.get("", response_model=list[ListingRead])
def list_listings_endpoint(
    db: Session = Depends(get_db),
    category: str | None = Query(default=None),
    search: str | None = Query(default=None),
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    pickup_area: str | None = Query(default=None),
    pickup_location: str | None = Query(default=None),
    condition: str | None = Query(default=None),
    risk_level: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    sort: str = Query(default="latest"),
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
            pickup_location=pickup_location,
            condition=condition,
            risk_level=risk_level,
            status=status_filter,
            sort=sort,
        )
    ]


@router.get("/{listing_id}", response_model=ListingRead)
def get_listing_endpoint(
    listing_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_authenticated_user),
) -> ListingRead:
    return ListingRead.model_validate(
        get_listing(db, str(listing_id), viewer=current_user, request=request, increment_view=True)
    )


@router.patch("/{listing_id}", response_model=ListingRead)
def update_listing_endpoint(
    listing_id: UUID,
    payload: ListingUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = update_listing(db, str(listing_id), payload, current_user)
    return ListingRead.model_validate(listing)


@router.post("/{listing_id}/publish", response_model=ListingRead)
def publish_listing_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = publish_listing(db, str(listing_id), current_user)
    return ListingRead.model_validate(listing)


@router.patch("/{listing_id}/status", response_model=ListingRead)
def update_listing_status_endpoint(
    listing_id: UUID,
    payload: ListingStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = update_listing_status(db, str(listing_id), payload, current_user)
    return ListingRead.model_validate(listing)


@router.delete("/{listing_id}", response_model=ListingRead)
def delete_listing_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = delete_listing(db, str(listing_id), current_user)
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


@router.delete("/{listing_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_listing_image_endpoint(
    listing_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> Response:
    remove_listing_image(db, str(listing_id), str(image_id), current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{listing_id}/favorite", response_model=ListingFavoriteRead, status_code=status.HTTP_201_CREATED)
def add_favorite_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingFavoriteRead:
    return ListingFavoriteRead.model_validate(add_favorite(db, str(listing_id), current_user))


@router.delete("/{listing_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> Response:
    remove_favorite(db, str(listing_id), current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{listing_id}/apply-recommended-price", response_model=ListingRead)
def apply_recommended_price_endpoint(
    listing_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingRead:
    listing = apply_recommended_price(db, str(listing_id), current_user)
    return ListingRead.model_validate(listing)


@router.post("/{listing_id}/decision-feedback", response_model=DecisionFeedbackRead, status_code=status.HTTP_201_CREATED)
def create_decision_feedback_endpoint(
    listing_id: UUID,
    payload: DecisionFeedbackCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> DecisionFeedbackRead:
    feedback = create_decision_feedback(db, str(listing_id), payload, current_user)
    return DecisionFeedbackRead.model_validate(feedback)


@router.post("/{listing_id}/reports", response_model=ListingReportRead, status_code=status.HTTP_201_CREATED)
def create_listing_report_endpoint(
    listing_id: UUID,
    payload: ListingReportCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ListingReportRead:
    report = create_listing_report(db, str(listing_id), payload, current_user)
    return ListingReportRead.model_validate(report)


@router.post("/{listing_id}/contact-requests", response_model=ContactRequestRead, status_code=status.HTTP_201_CREATED)
def create_contact_request_endpoint(
    listing_id: UUID,
    payload: ContactRequestCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ContactRequestRead:
    contact_request = create_contact_request(db, str(listing_id), payload, current_user)
    return contact_request_read(contact_request, current_user)


@router.get("/{listing_id}/matches", response_model=list[TradeMatchRead])
def get_listing_matches_endpoint(
    listing_id: UUID,
    limit: int = Query(default=10, ge=1, le=50),
    min_score: float = Query(default=58.0, ge=0, le=100),
    db: Session = Depends(get_db),
) -> list[TradeMatchRead]:
    return [
        TradeMatchRead.model_validate(match)
        for match in list_matches_for_listing(db, str(listing_id), limit=limit, min_score=min_score)
    ]
