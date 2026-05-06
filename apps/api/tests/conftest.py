from __future__ import annotations

from collections.abc import Generator
import shutil
import tempfile
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
import app.tasks.trade_tasks as trade_task_module


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
    original_upload_dir = settings.upload_storage_dir
    original_public_base_url = settings.upload_public_base_url
    original_supabase_url = settings.supabase_url
    original_supabase_service_role_key = settings.supabase_service_role_key
    original_supabase_storage_bucket = settings.supabase_storage_bucket
    original_glm_provider = settings.glm_provider
    original_zai_api_key = settings.zai_api_key
    original_zai_base_url = settings.zai_base_url
    original_zai_model = settings.zai_model
    original_zai_timeout_seconds = settings.zai_timeout_seconds
    original_zai_max_retries = settings.zai_max_retries
    original_ai_trade_enabled = settings.ai_trade_enabled
    original_ai_student_daily_limit = settings.ai_student_daily_limit
    original_ai_staff_daily_limit = settings.ai_staff_daily_limit
    original_ai_global_daily_limit = settings.ai_global_daily_limit
    original_contact_request_expiry_days = settings.contact_request_expiry_days
    original_trade_listing_daily_limit = settings.trade_listing_daily_limit
    original_trade_contact_request_daily_limit = settings.trade_contact_request_daily_limit
    original_trade_report_daily_limit = settings.trade_report_daily_limit
    original_trade_wanted_post_daily_limit = settings.trade_wanted_post_daily_limit
    temp_upload_dir = tempfile.mkdtemp(prefix="umnexus-test-uploads-")
    settings.allowed_email_domains = ("siswa.um.edu.my", "um.edu.my")
    settings.upload_storage_dir = temp_upload_dir
    settings.upload_public_base_url = "http://testserver/uploads"
    settings.supabase_url = "https://project-ref.supabase.co"
    settings.supabase_service_role_key = "test-service-role"
    settings.supabase_storage_bucket = "listing-images"
    settings.glm_provider = "demo"
    settings.zai_api_key = ""
    settings.ai_trade_enabled = True
    settings.ai_student_daily_limit = 3
    settings.ai_staff_daily_limit = 50
    settings.ai_global_daily_limit = 200
    settings.contact_request_expiry_days = 7
    settings.trade_listing_daily_limit = 10
    settings.trade_contact_request_daily_limit = 20
    settings.trade_report_daily_limit = 10
    settings.trade_wanted_post_daily_limit = 5
    celery_app.conf.task_always_eager = True
    session_module.SessionLocal = TestingSessionLocal
    trade_task_module.SessionLocal = TestingSessionLocal

    yield

    settings.allowed_email_domains = original_domains
    settings.upload_storage_dir = original_upload_dir
    settings.upload_public_base_url = original_public_base_url
    settings.supabase_url = original_supabase_url
    settings.supabase_service_role_key = original_supabase_service_role_key
    settings.supabase_storage_bucket = original_supabase_storage_bucket
    settings.glm_provider = original_glm_provider
    settings.zai_api_key = original_zai_api_key
    settings.zai_base_url = original_zai_base_url
    settings.zai_model = original_zai_model
    settings.zai_timeout_seconds = original_zai_timeout_seconds
    settings.zai_max_retries = original_zai_max_retries
    settings.ai_trade_enabled = original_ai_trade_enabled
    settings.ai_student_daily_limit = original_ai_student_daily_limit
    settings.ai_staff_daily_limit = original_ai_staff_daily_limit
    settings.ai_global_daily_limit = original_ai_global_daily_limit
    settings.contact_request_expiry_days = original_contact_request_expiry_days
    settings.trade_listing_daily_limit = original_trade_listing_daily_limit
    settings.trade_contact_request_daily_limit = original_trade_contact_request_daily_limit
    settings.trade_report_daily_limit = original_trade_report_daily_limit
    settings.trade_wanted_post_daily_limit = original_trade_wanted_post_daily_limit
    shutil.rmtree(temp_upload_dir, ignore_errors=True)


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
