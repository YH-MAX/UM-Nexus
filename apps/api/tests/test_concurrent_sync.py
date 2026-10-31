from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from threading import Barrier
from unittest.mock import patch
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt import TokenClaims
from app.core.config import get_settings
from app.db.base import Base
from app.models import AppRole, Listing, ListingView, Profile, User
from app.repositories.trade import TradeRepository
from app.services.user_sync import ensure_local_user


@pytest.fixture
def concurrent_db(tmp_path):
    # Separate connections and transactions, unlike the API tests' StaticPool.
    engine = create_engine(
        f"sqlite:///{(tmp_path / 'concurrency.db').as_posix()}",
        connect_args={"check_same_thread": False, "timeout": 20},
    )
    errors = []

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

    @event.listens_for(engine, "handle_error")
    def record_error(context):
        errors.append(context.original_exception)

    Base.metadata.create_all(engine)
    yield engine, errors
    engine.dispose()


@pytest.mark.parametrize("existing_user", [False, True])
def test_simultaneous_auth_requests_create_one_user_and_profile(concurrent_db, existing_user):
    engine, errors = concurrent_db
    claims = TokenClaims(sub=uuid4(), email="parallel@siswa.um.edu.my", role="authenticated")
    if existing_user:
        with Session(engine) as db:
            db.add(User(id=str(claims.sub), email=claims.email))
            db.commit()
    barrier = Barrier(4)

    def authenticate(_):
        with Session(engine, autoflush=False, expire_on_commit=False) as db:
            scalar = db.scalar
            first = True

            def synchronized_read(*args, **kwargs):
                nonlocal first
                result = scalar(*args, **kwargs)
                if first:
                    first = False
                    # All requests have observed the missing user/profile before writing.
                    barrier.wait(timeout=10)
                return result

            with patch.object(db, "scalar", side_effect=synchronized_read):
                user = ensure_local_user(db, claims)
            return user.id, user.profile.id, user.profile.verified_um_email

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(authenticate, range(4)))
    assert len(set(results)) == 1
    assert results[0][0] == str(claims.sub)
    assert results[0][2] is True
    with Session(engine) as db:
        assert db.scalar(select(func.count()).select_from(User)) == 1
        assert db.scalar(select(func.count()).select_from(Profile)) == 1
    assert errors == []


def test_sync_preserves_profile_role_and_details(db_session, token_verifier):
    claims = token_verifier.claims
    user = User(id=str(claims.sub), email=claims.email)
    user.profile = Profile(app_role=AppRole.ADMIN, display_name="Existing name", bio="Keep this")
    db_session.add(user)
    db_session.commit()
    profile_id = user.profile.id
    for _ in range(2):
        synced = ensure_local_user(db_session, claims)
        assert synced.profile.id == profile_id
        assert synced.profile.app_role == AppRole.ADMIN
        assert synced.profile.display_name == "Existing name"
        assert synced.profile.bio == "Keep this"
        assert synced.profile.verified_um_email is True


def test_sync_does_not_ignore_email_owned_by_another_user(db_session, token_verifier):
    db_session.add(User(id=str(uuid4()), email=token_verifier.claims.email))
    db_session.commit()
    with pytest.raises(IntegrityError):
        ensure_local_user(db_session, token_verifier.claims)
    db_session.rollback()


def test_last_beta_spot_created_by_another_request_still_allows_same_user(db_session, token_verifier):
    claims = token_verifier.claims
    get_settings().beta_max_users = 1
    user = User(id=str(claims.sub), email=claims.email)
    user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add(user)
    db_session.commit()
    scalar = db_session.scalar
    first = True

    def stale_initial_read(*args, **kwargs):
        nonlocal first
        if first:
            first = False
            return None
        return scalar(*args, **kwargs)

    with patch.object(db_session, "scalar", side_effect=stale_initial_read):
        assert ensure_local_user(db_session, claims).id == user.id


@pytest.mark.parametrize("same_viewer", [False, True])
def test_concurrent_views_deduplicate_and_do_not_lose_counts(concurrent_db, same_viewer):
    engine, errors = concurrent_db
    with Session(engine) as db:
        seller = User(id=str(uuid4()), email="seller@siswa.um.edu.my")
        db.add(seller)
        db.flush()
        listing = Listing(seller_id=seller.id, title="Book", category="textbooks", price=10)
        db.add(listing)
        db.commit()
        listing_id = listing.id
    barrier = Barrier(4)
    today = date(2026, 10, 31)

    def view(index):
        with Session(engine, expire_on_commit=False) as db:
            listing = db.get(Listing, listing_id)
            barrier.wait(timeout=10)
            return TradeRepository(db).record_listing_view(
                listing=listing,
                viewer_fingerprint="same" if same_viewer else f"visitor-{index}",
                viewed_on=today,
            )

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(view, range(4)))
    expected = 1 if same_viewer else 4
    assert sum(results) == expected
    with Session(engine) as db:
        listing = db.get(Listing, listing_id)
        assert listing.view_count == expected
        assert db.scalar(select(func.count()).select_from(ListingView)) == expected
        # The same person can count again on the next day.
        assert TradeRepository(db).record_listing_view(
            listing=listing,
            viewer_fingerprint="same" if same_viewer else "visitor-0",
            viewed_on=today + timedelta(days=1),
        ) is True
        assert db.get(Listing, listing_id).view_count == expected + 1
    assert errors == []
