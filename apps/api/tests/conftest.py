from __future__ import annotations

from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.auth.jwt import TokenClaims, TokenVerificationError, get_token_verifier
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.tasks.celery_app import celery_app
import app.db.session as session_module
import app.tasks.trade_intelligence_tasks as trade_task_module


class StubTokenVerifier:
    def __init__(self) -> None:
        self.claims = TokenClaims(
            sub=uuid4(),
            email="tester@siswa.um.edu.my",
            role="authenticated",
        )
        self.error: Exception | None = None

    def verify_access_token(self, token: str) -> TokenClaims:
        if self.error is not None:
            raise self.error
        return self.claims


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
    class_=Session,
)


@pytest.fixture(autouse=True)
def reset_database() -> Generator[None, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    settings = get_settings()
    original_domains = settings.allowed_email_domains
    settings.allowed_email_domains = ("siswa.um.edu.my", "um.edu.my")
    celery_app.conf.task_always_eager = True
    session_module.SessionLocal = TestingSessionLocal
    trade_task_module.SessionLocal = TestingSessionLocal

    yield

    settings.allowed_email_domains = original_domains


@pytest.fixture
def token_verifier() -> StubTokenVerifier:
    return StubTokenVerifier()


@pytest.fixture
def client(token_verifier: StubTokenVerifier) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_token_verifier] = lambda: token_verifier

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def authorization_headers() -> dict[str, str]:
    return {"Authorization": "Bearer test-token"}


def invalid_token_error() -> TokenVerificationError:
    return TokenVerificationError("Invalid Supabase access token.")
