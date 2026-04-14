from fastapi import APIRouter, Depends

from app.auth.dependencies import require_authenticated_user
from app.schemas.profile import ProfileRead
from app.schemas.user import CurrentUserResponse, UserRead


router = APIRouter()


@router.get("/me", response_model=CurrentUserResponse)
def read_current_user(current_user=Depends(require_authenticated_user)) -> CurrentUserResponse:
    return CurrentUserResponse(
        user=UserRead.model_validate(current_user),
        profile=ProfileRead.model_validate(current_user.profile),
    )
