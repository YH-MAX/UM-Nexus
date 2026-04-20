from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Listing, ListingImage, WantedPost
from app.repositories.trade import TradeRepository
from app.schemas.listing import ListingCreate, ListingImageCreate, ListingUpdate
from app.schemas.wanted_post import WantedPostCreate
from app.services.demo_user import get_or_create_demo_user


def create_listing(db: Session, payload: ListingCreate) -> Listing:
    demo_user = get_or_create_demo_user(db)
    repo = TradeRepository(db)
    return repo.create_listing(demo_user.id, payload.model_dump())


def list_listings(db: Session) -> list[Listing]:
    repo = TradeRepository(db)
    return list(repo.list_listings())


def get_listing(db: Session, listing_id: str) -> Listing:
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")
    return listing


def update_listing(db: Session, listing_id: str, payload: ListingUpdate) -> Listing:
    get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    values = payload.model_dump(exclude_unset=True)
    return repo.update_listing(listing, values)


def add_listing_image(db: Session, listing_id: str, payload: ListingImageCreate) -> ListingImage:
    get_or_create_demo_user(db)
    repo = TradeRepository(db)
    listing = repo.get_listing_or_none(listing_id)
    if listing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found")

    return repo.add_listing_image(listing.id, payload.model_dump())


def create_wanted_post(db: Session, payload: WantedPostCreate) -> WantedPost:
    demo_user = get_or_create_demo_user(db)
    repo = TradeRepository(db)
    return repo.create_wanted_post(demo_user.id, payload.model_dump())


def list_wanted_posts(db: Session) -> list[WantedPost]:
    repo = TradeRepository(db)
    return list(repo.list_wanted_posts())


def get_wanted_post(db: Session, wanted_post_id: str) -> WantedPost:
    repo = TradeRepository(db)
    wanted_post = repo.get_wanted_post_or_none(wanted_post_id)
    if wanted_post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wanted post not found")
    return wanted_post
