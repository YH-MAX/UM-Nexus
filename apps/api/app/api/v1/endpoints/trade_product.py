from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_app_role, require_authenticated_user
from app.db.session import get_db
from app.models import AppRole
from app.schemas.ai_trade import TradeMatchRead
from app.schemas.listing import ListingRead, ListingReportRead, ListingReportReview
from app.schemas.trade_product import (
    ContactMatchCreate,
    ModerationListingRead,
    ModerationSummary,
    TradeDashboardResponse,
    TradeTransactionRead,
    TradeTransactionUpdate,
)
from app.services.trade_service import (
    contact_match,
    list_moderation_listings,
    moderation_summary,
    review_listing_reports,
    trade_dashboard,
    update_trade_transaction,
)


router = APIRouter()


@router.post("/matches/{match_id}/contact", response_model=TradeTransactionRead)
def contact_match_endpoint(
    match_id: UUID,
    payload: ContactMatchCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> TradeTransactionRead:
    transaction = contact_match(db, str(match_id), payload, current_user)
    return TradeTransactionRead.model_validate(transaction)


@router.patch("/trade-transactions/{transaction_id}", response_model=TradeTransactionRead)
def update_trade_transaction_endpoint(
    transaction_id: UUID,
    payload: TradeTransactionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> TradeTransactionRead:
    transaction = update_trade_transaction(db, str(transaction_id), payload, current_user)
    return TradeTransactionRead.model_validate(transaction)


@router.get("/moderation/listings", response_model=list[ModerationListingRead])
def list_moderation_listings_endpoint(
    db: Session = Depends(get_db),
    _moderator=Depends(require_app_role(AppRole.MODERATOR)),
) -> list[ModerationListingRead]:
    return [
        ModerationListingRead(
            listing=ListingRead.model_validate(listing),
            reports=[ListingReportRead.model_validate(report) for report in listing.reports],
        )
        for listing in list_moderation_listings(db)
    ]


@router.get("/moderation/summary", response_model=ModerationSummary)
def moderation_summary_endpoint(
    db: Session = Depends(get_db),
    _moderator=Depends(require_app_role(AppRole.MODERATOR)),
) -> ModerationSummary:
    return ModerationSummary(**moderation_summary(db))


@router.patch("/moderation/listings/{listing_id}/review", response_model=ListingRead)
def review_moderation_listing_endpoint(
    listing_id: UUID,
    payload: ListingReportReview,
    db: Session = Depends(get_db),
    moderator=Depends(require_app_role(AppRole.MODERATOR)),
) -> ListingRead:
    listing = review_listing_reports(db, str(listing_id), payload, moderator)
    return ListingRead.model_validate(listing)


@router.get("/users/me/trade-dashboard", response_model=TradeDashboardResponse)
def trade_dashboard_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> TradeDashboardResponse:
    dashboard = trade_dashboard(db, current_user)
    return TradeDashboardResponse(
        listings=[ListingRead.model_validate(listing) for listing in dashboard["listings"]],
        wanted_posts=dashboard["wanted_posts"],
        matches=[TradeMatchRead.model_validate(match) for match in dashboard["matches"]],
        transactions=[TradeTransactionRead.model_validate(transaction) for transaction in dashboard["transactions"]],
        metrics=dashboard["metrics"],
    )
