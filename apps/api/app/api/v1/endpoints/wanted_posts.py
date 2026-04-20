from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.wanted_post import WantedPostCreate, WantedPostRead
from app.services.trade_service import create_wanted_post, get_wanted_post, list_wanted_posts


router = APIRouter()


@router.post("", response_model=WantedPostRead, status_code=status.HTTP_201_CREATED)
def create_wanted_post_endpoint(
    payload: WantedPostCreate,
    db: Session = Depends(get_db),
) -> WantedPostRead:
    wanted_post = create_wanted_post(db, payload)
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
