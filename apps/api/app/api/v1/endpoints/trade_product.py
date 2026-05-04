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
    AdminDashboardResponse,
    AdminListingUpdate,
    AdminStatistics,
    AdminUserStatusUpdate,
    AdminUserSummary,
    ContactMatchCreate,
    ContactRequestDecision,
    ContactRequestRead,
    ContactRequestsResponse,
    ModerationListingRead,
    ModerationSummary,
    TradeDashboardResponse,
    TradeTransactionRead,
    TradeTransactionUpdate,
    UserReportRead,
)
from app.services.trade_service import (
    admin_dashboard,
    admin_update_listing,
    admin_update_user_status,
    contact_match,
    contact_request_read,
    decide_contact_request,
    list_contact_requests_for_user,
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


@router.get("/users/me/contact-requests", response_model=ContactRequestsResponse)
def list_my_contact_requests_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ContactRequestsResponse:
    requests = list_contact_requests_for_user(db, current_user)
    return ContactRequestsResponse(
        received=[contact_request_read(item, current_user) for item in requests["received"]],
        sent=[contact_request_read(item, current_user) for item in requests["sent"]],
    )


@router.patch("/contact-requests/{contact_request_id}", response_model=ContactRequestRead)
def decide_contact_request_endpoint(
    contact_request_id: UUID,
    payload: ContactRequestDecision,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ContactRequestRead:
    contact_request = decide_contact_request(db, str(contact_request_id), payload, current_user)
    return contact_request_read(contact_request, current_user)


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
        contact_requests_received=[
            contact_request_read(contact_request, current_user)
            for contact_request in dashboard["contact_requests_received"]
        ],
        contact_requests_sent=[
            contact_request_read(contact_request, current_user)
            for contact_request in dashboard["contact_requests_sent"]
        ],
        metrics=dashboard["metrics"],
    )


@router.get("/admin/dashboard", response_model=AdminDashboardResponse)
def admin_dashboard_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> AdminDashboardResponse:
    dashboard = admin_dashboard(db)
    return AdminDashboardResponse(
        statistics=AdminStatistics(**dashboard["statistics"]),
        listings=[ListingRead.model_validate(listing) for listing in dashboard["listings"]],
        listing_reports=[ListingReportRead.model_validate(report) for report in dashboard["listing_reports"]],
        user_reports=[UserReportRead.model_validate(report) for report in dashboard["user_reports"]],
        suspicious_ai_flags=[ListingRead.model_validate(listing) for listing in dashboard["suspicious_ai_flags"]],
        users=[_admin_user_summary(user) for user in dashboard["users"]],
    )


@router.patch("/admin/listings/{listing_id}", response_model=ListingRead)
def admin_update_listing_endpoint(
    listing_id: UUID,
    payload: AdminListingUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_app_role(AppRole.ADMIN)),
) -> ListingRead:
    listing = admin_update_listing(db, str(listing_id), payload, admin)
    return ListingRead.model_validate(listing)


@router.patch("/admin/users/{user_id}/status", response_model=AdminUserSummary)
def admin_update_user_status_endpoint(
    user_id: UUID,
    payload: AdminUserStatusUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> AdminUserSummary:
    user = admin_update_user_status(db, str(user_id), payload)
    return _admin_user_summary(user)


def _admin_user_summary(user) -> AdminUserSummary:
    profile = getattr(user, "profile", None)
    app_role = getattr(profile, "app_role", None)
    return AdminUserSummary(
        id=user.id,
        email=user.email,
        username=user.username,
        status=user.status,
        app_role=getattr(app_role, "value", app_role),
        full_name=getattr(profile, "full_name", None),
        faculty=getattr(profile, "faculty", None),
        residential_college=getattr(profile, "residential_college", None),
    )
