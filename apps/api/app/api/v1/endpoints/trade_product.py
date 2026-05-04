from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.dependencies import require_app_role, require_authenticated_user
from app.db.session import get_db
from app.models import AppRole
from app.schemas.ai_trade import TradeMatchRead
from app.schemas.listing import ListingFavoriteRead, ListingRead, ListingReportRead, ListingReportReview
from app.schemas.trade_product import (
    AISettingsRead,
    AISettingsUpdate,
    AIUsageLogRead,
    AdminActionRead,
    AdminDashboardResponse,
    AdminListingUpdate,
    AdminStatistics,
    AdminUserRoleUpdate,
    AdminUserStatusUpdate,
    AdminUserSummary,
    ContactMatchCreate,
    ContactRequestDecision,
    ContactRequestRead,
    ContactRequestsResponse,
    ModerationListingRead,
    ModerationSummary,
    TradeCategoryCreate,
    TradeCategoryRead,
    TradeCategoryUpdate,
    TradeDashboardResponse,
    TradeTransactionRead,
    TradeTransactionUpdate,
    UserReportRead,
)
from app.services.trade_service import (
    admin_dashboard,
    admin_update_listing,
    admin_update_user_role,
    admin_update_user_status,
    cancel_contact_request,
    contact_match,
    contact_request_read,
    create_trade_category,
    decide_contact_request,
    get_ai_settings,
    list_admin_actions,
    list_ai_usage_logs,
    list_contact_requests_for_user,
    list_favorites,
    list_moderation_listings,
    list_trade_categories,
    moderation_summary,
    review_listing_reports,
    trade_dashboard,
    update_ai_settings,
    update_trade_category,
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


@router.get("/users/me/favorites", response_model=list[ListingFavoriteRead])
def list_my_favorites_endpoint(
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> list[ListingFavoriteRead]:
    return [ListingFavoriteRead.model_validate(favorite) for favorite in list_favorites(db, current_user)]


@router.patch("/contact-requests/{contact_request_id}", response_model=ContactRequestRead)
def decide_contact_request_endpoint(
    contact_request_id: UUID,
    payload: ContactRequestDecision,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ContactRequestRead:
    contact_request = decide_contact_request(db, str(contact_request_id), payload, current_user)
    return contact_request_read(contact_request, current_user)


@router.patch("/contact-requests/{contact_request_id}/cancel", response_model=ContactRequestRead)
def cancel_contact_request_endpoint(
    contact_request_id: UUID,
    db: Session = Depends(get_db),
    current_user=Depends(require_authenticated_user),
) -> ContactRequestRead:
    contact_request = cancel_contact_request(db, str(contact_request_id), current_user)
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
        favorites=[ListingFavoriteRead.model_validate(favorite) for favorite in dashboard["favorites"]],
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
        categories=[TradeCategoryRead.model_validate(category) for category in dashboard["categories"]],
        ai_usage_logs=[AIUsageLogRead.model_validate(log) for log in dashboard["ai_usage_logs"]],
        admin_actions=[AdminActionRead.model_validate(action) for action in dashboard["admin_actions"]],
        ai_settings=AISettingsRead(**dashboard["ai_settings"]),
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
    admin=Depends(require_app_role(AppRole.ADMIN)),
) -> AdminUserSummary:
    user = admin_update_user_status(db, str(user_id), payload, admin)
    return _admin_user_summary(user)


@router.patch("/admin/users/{user_id}/role", response_model=AdminUserSummary)
def admin_update_user_role_endpoint(
    user_id: UUID,
    payload: AdminUserRoleUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_app_role(AppRole.ADMIN)),
) -> AdminUserSummary:
    user = admin_update_user_role(db, str(user_id), payload, admin)
    return _admin_user_summary(user)


@router.get("/admin/actions", response_model=list[AdminActionRead])
def admin_actions_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> list[AdminActionRead]:
    return [AdminActionRead.model_validate(action) for action in list_admin_actions(db)]


@router.get("/admin/ai-usage", response_model=list[AIUsageLogRead])
def admin_ai_usage_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> list[AIUsageLogRead]:
    return [AIUsageLogRead.model_validate(log) for log in list_ai_usage_logs(db)]


@router.get("/admin/categories", response_model=list[TradeCategoryRead])
def admin_categories_endpoint(
    db: Session = Depends(get_db),
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> list[TradeCategoryRead]:
    return [TradeCategoryRead.model_validate(category) for category in list_trade_categories(db)]


@router.post("/admin/categories", response_model=TradeCategoryRead, status_code=201)
def admin_create_category_endpoint(
    payload: TradeCategoryCreate,
    db: Session = Depends(get_db),
    admin=Depends(require_app_role(AppRole.ADMIN)),
) -> TradeCategoryRead:
    return TradeCategoryRead.model_validate(create_trade_category(db, payload, admin))


@router.patch("/admin/categories/{category_id}", response_model=TradeCategoryRead)
def admin_update_category_endpoint(
    category_id: UUID,
    payload: TradeCategoryUpdate,
    db: Session = Depends(get_db),
    admin=Depends(require_app_role(AppRole.ADMIN)),
) -> TradeCategoryRead:
    return TradeCategoryRead.model_validate(update_trade_category(db, str(category_id), payload, admin))


@router.get("/admin/ai-settings", response_model=AISettingsRead)
def admin_ai_settings_endpoint(_admin=Depends(require_app_role(AppRole.ADMIN))) -> AISettingsRead:
    return AISettingsRead(**get_ai_settings())


@router.patch("/admin/ai-settings", response_model=AISettingsRead)
def admin_update_ai_settings_endpoint(
    payload: AISettingsUpdate,
    _admin=Depends(require_app_role(AppRole.ADMIN)),
) -> AISettingsRead:
    return AISettingsRead(**update_ai_settings(payload))


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
        display_name=getattr(profile, "display_name", None),
        faculty=getattr(profile, "faculty", None),
        residential_college=getattr(profile, "residential_college", None),
        college_or_location=getattr(profile, "college_or_location", None),
    )
