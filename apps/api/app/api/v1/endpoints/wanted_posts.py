from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_authenticated_user
from app.db.session import get_db
from app.schemas.listing import ListingRead
from app.schemas.trade_product import WantedListingRecommendation
from app.schemas.wanted_post import WantedPostCreate, WantedPostRead
from app.services.trade_intelligence import recommend_listings_for_wanted_post
from app.services.trade_service import create_wanted_post, get_wanted_post, list_wanted_posts


router = APIRouter()


@router.post("", response_model=WantedPostRead, status_code=status.HTTP_201_CREATED)
def create_wanted_post_endpoint(
    payload: WantedPostCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> WantedPostRead:
    wanted_post = create_wanted_post(db, payload, current_user)
    return WantedPostRead.model_validate(wanted_post)


@router.get("", response_model=list[WantedPostRead])
def list_wanted_posts_endpoint(db: Session = Depends(get_db)) -> list[WantedPostRead]:
    return [WantedPostRead.model_validate(wanted_post) for wanted_post in list_wanted_posts(db)]


@router.get("/{wanted_post_id}", response_model=WantedPostRead)
def get_wanted_post_endpoint(
    wanted_post_id: UUID,
    db: Session = Depends(get_db),
) -> WantedPostRead:
    return WantedPostRead.model_validate(get_wanted_post(db, str(wanted_post_id)))


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
