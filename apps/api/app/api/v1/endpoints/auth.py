from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.auth.dependencies import require_authenticated_user
from app.db.session import get_db
from app.schemas.beta import BetaStatusRead, BetaWaitlistCreate, BetaWaitlistRead
from app.schemas.profile import ProfileRead
from app.schemas.user import CurrentUserResponse, UserRead
from app.services.beta_waitlist import create_or_update_waitlist_entry
from app.services.user_sync import get_beta_signup_status


router = APIRouter()


@router.get("/beta-status", response_model=BetaStatusRead)
def read_beta_status(db: Session = Depends(get_db)) -> BetaStatusRead:
    return BetaStatusRead.model_validate(get_beta_signup_status(db))


@router.post(
    "/beta-waitlist",
    response_model=BetaWaitlistRead,
    status_code=status.HTTP_201_CREATED,
)
def join_beta_waitlist(
    payload: BetaWaitlistCreate,
    db: Session = Depends(get_db),
) -> BetaWaitlistRead:
    entry = create_or_update_waitlist_entry(db, payload)
    return BetaWaitlistRead.model_validate(entry)


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(current_user=Depends(require_authenticated_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        user=UserRead.model_validate(current_user),
        profile=ProfileRead.model_validate(current_user.profile),
    )
