from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_authenticated_user
from app.db.session import get_db
from app.schemas.listing import ListingRead
from app.schemas.trade_product import WantedListingRecommendation
from app.schemas.wanted_post import (
    WantedPostCreate,
    WantedPostPage,
    WantedPostRead,
    WantedPostStatusUpdate,
    WantedResponseCreate,
    WantedResponseDecision,
    WantedResponseRead,
)
from app.services.trade_intelligence import recommend_listings_for_wanted_post
from app.services.trade_service import (
    cancel_wanted_response,
    create_wanted_post,
    create_wanted_response,
    decide_wanted_response,
    get_wanted_post,
    list_wanted_posts,
    update_wanted_post_status,
    wanted_response_read,
)


router = APIRouter()


@router.post("", response_model=WantedPostRead, status_code=status.HTTP_201_CREATED)
def create_wanted_post_endpoint(
    payload: WantedPostCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedPostRead:
    wanted_post = create_wanted_post(db, payload, current_user)
    return WantedPostRead.model_validate(wanted_post)


@router.get("", response_model=WantedPostPage)
def list_wanted_posts_endpoint(
    search: str | None = None,
    category: str | None = None,
    pickup_area: str | None = None,
    max_budget: float | None = Query(default=None, gt=0),
    status_filter: str = Query(default="active", alias="status"),
    sort: str = "latest",
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _current_user=Depends(require_authenticated_user),
) -> WantedPostPage:
    page = list_wanted_posts(
        db,
        search=search,
        category=category,
        pickup_area=pickup_area,
        max_budget=max_budget,
        status_filter=status_filter,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return WantedPostPage(
        items=[WantedPostRead.model_validate(wanted_post) for wanted_post in page["items"]],
        total=page["total"],
        limit=page["limit"],
        offset=page["offset"],
        has_more=page["has_more"],
    )


@router.get("/{wanted_post_id}", response_model=WantedPostRead)
def get_wanted_post_endpoint(
    wanted_post_id: UUID,
    db: Session = Depends(get_db),
) -> WantedPostRead:
    return WantedPostRead.model_validate(get_wanted_post(db, str(wanted_post_id)))


@router.patch("/{wanted_post_id}/status", response_model=WantedPostRead)
def update_wanted_post_status_endpoint(
    wanted_post_id: UUID,
    payload: WantedPostStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedPostRead:
    return WantedPostRead.model_validate(update_wanted_post_status(db, str(wanted_post_id), payload, current_user))


@router.post("/{wanted_post_id}/responses", response_model=WantedResponseRead, status_code=status.HTTP_201_CREATED)
def create_wanted_response_endpoint(
    wanted_post_id: UUID,
    payload: WantedResponseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedResponseRead:
    wanted_response = create_wanted_response(db, str(wanted_post_id), payload, current_user)
    return wanted_response_read(wanted_response, current_user)


@router.patch("/responses/{wanted_response_id}", response_model=WantedResponseRead)
def decide_wanted_response_endpoint(
    wanted_response_id: UUID,
    payload: WantedResponseDecision,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedResponseRead:
    wanted_response = decide_wanted_response(db, str(wanted_response_id), payload, current_user)
    return wanted_response_read(wanted_response, current_user)


@router.patch("/responses/{wanted_response_id}/cancel", response_model=WantedResponseRead)
def cancel_wanted_response_endpoint(
    wanted_response_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedResponseRead:
    wanted_response = cancel_wanted_response(db, str(wanted_response_id), current_user)
    return wanted_response_read(wanted_response, current_user)


@router.get("/{wanted_post_id}/recommended-listings", response_model=list[WantedListingRecommendation])
def get_wanted_post_recommendations_endpoint(
    wanted_post_id: UUID,
    limit: int = Query(default=12, ge=1, le=50),
    min_score: float = Query(default=58.0, ge=0, le=100),
    db: Session = Depends(get_db),
) -> list[WantedListingRecommendation]:
    return [
        WantedListingRecommendation(
            listing=ListingRead.model_validate(item["listing"]),
            match_score=item["match_score"],
            price_fit_score=item["price_fit_score"],
            location_fit_score=item["location_fit_score"],
            semantic_fit_score=item["semantic_fit_score"],
            final_match_confidence=item["final_match_confidence"],
            explanation=item["explanation"],
            price_fit_summary=item["price_fit_summary"],
            location_fit_summary=item["location_fit_summary"],
            item_fit_summary=item["item_fit_summary"],
            risk_note=item["risk_note"],
            recommended_action=item["recommended_action"],
        )
        for item in recommend_listings_for_wanted_post(db, str(wanted_post_id), limit=limit, min_score=min_score)
    ]
