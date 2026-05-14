from uuid import uuid4

from sqlalchemy import select

from app.auth.jwt import TokenVerificationError
from app.core.config import get_settings
from app.models import AppRole, BetaWaitlistEntry, Profile, User


AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def test_auth_me_returns_user_and_profile(client, token_verifier) -> None:
    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "tester@siswa.um.edu.my"
    assert body["profile"]["app_role"] == "student"


def test_first_authenticated_request_creates_local_user_profile(client, db_session, token_verifier) -> None:
    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 200

    user = db_session.scalar(select(User).where(User.email == "tester@siswa.um.edu.my"))
    profile = db_session.scalar(select(Profile).where(Profile.user_id == str(token_verifier.claims.sub)))
    assert user is not None
    assert profile is not None
    assert profile.app_role == AppRole.STUDENT


def test_beta_status_reports_capacity(client, db_session) -> None:
    settings = get_settings()
    settings.beta_max_users = 2
    for index in range(2):
        user = User(id=str(uuid4()), email=f"member-{index}@siswa.um.edu.my")
        user.profile = Profile(app_role=AppRole.STUDENT)
        db_session.add(user)
    db_session.commit()

    response = client.get("/api/v1/auth/beta-status")

    assert response.status_code == 200
    assert response.json() == {
        "signup_open": False,
        "current_users": 2,
        "max_users": 2,
    }


def test_beta_capacity_blocks_new_local_user(client, db_session, token_verifier) -> None:
    settings = get_settings()
    settings.beta_max_users = 1
    existing_user = User(id=str(uuid4()), email="existing@siswa.um.edu.my")
    existing_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add(existing_user)
    db_session.commit()

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 403
    assert "beta is currently full" in response.json()["detail"]
    assert db_session.scalar(select(User).where(User.email == token_verifier.claims.email)) is None


def test_beta_invited_email_can_join_after_capacity(client, db_session, token_verifier) -> None:
    settings = get_settings()
    settings.beta_max_users = 1
    settings.beta_invite_emails = ("tester@siswa.um.edu.my",)
    existing_user = User(id=str(uuid4()), email="existing@siswa.um.edu.my")
    existing_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add(existing_user)
    db_session.commit()

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 200
    assert db_session.scalar(select(User).where(User.email == "tester@siswa.um.edu.my")) is not None


def test_join_beta_waitlist_stores_um_email(client, db_session) -> None:
    response = client.post(
        "/api/v1/auth/beta-waitlist",
        json={"email": "FutureTester@SISWA.UM.EDU.MY", "reason": "I want to test listings."},
    )

    assert response.status_code == 201
    assert response.json()["email"] == "futuretester@siswa.um.edu.my"
    entry = db_session.scalar(
        select(BetaWaitlistEntry).where(BetaWaitlistEntry.email == "futuretester@siswa.um.edu.my")
    )
    assert entry is not None
    assert entry.reason == "I want to test listings."


def test_join_beta_waitlist_rejects_non_um_email(client) -> None:
    response = client.post(
        "/api/v1/auth/beta-waitlist",
        json={"email": "future@example.com", "reason": "I want to test listings."},
    )

    assert response.status_code == 403


def test_invalid_token_returns_401(client, token_verifier) -> None:
    token_verifier.error = TokenVerificationError("Invalid Supabase access token.")

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 401


def test_non_um_email_returns_403(client, token_verifier) -> None:
    token_verifier.claims = token_verifier.claims.model_copy(update={"email": "outside@example.com"})

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 403


def test_unconfirmed_supabase_email_returns_403(client, supabase_auth_user_client) -> None:
    supabase_auth_user_client.email_confirmed_at = None

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 403
    assert "Confirm your UM email" in response.json()["detail"]


def test_supabase_user_mismatch_returns_401(client, supabase_auth_user_client) -> None:
    supabase_auth_user_client.email = "someone-else@siswa.um.edu.my"

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 401


def test_profile_update_success(client, token_verifier) -> None:
    client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    response = client.patch(
        "/api/v1/users/me/profile",
        headers=AUTH_HEADERS,
        json={
            "full_name": "UM Student",
            "faculty": "Computer Science",
            "year_of_study": 2,
        },
    )

    assert response.status_code == 200
    assert response.json()["full_name"] == "UM Student"
    assert response.json()["faculty"] == "Computer Science"
    assert response.json()["year_of_study"] == 2


def test_admin_role_update_success(client, db_session, token_verifier) -> None:
    admin_user = User(id=str(token_verifier.claims.sub), email="admin@siswa.um.edu.my")
    admin_user.profile = Profile(app_role=AppRole.ADMIN)
    target_user = User(id=str(uuid4()), email="member@siswa.um.edu.my")
    target_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add_all([admin_user, target_user])
    db_session.commit()

    response = client.patch(
        f"/api/v1/users/{target_user.id}/role",
        headers=AUTH_HEADERS,
        json={"app_role": "moderator"},
    )

    assert response.status_code == 200
    assert response.json()["app_role"] == "moderator"


def test_non_admin_role_update_forbidden(client, db_session, token_verifier) -> None:
    member_user = User(id=str(token_verifier.claims.sub), email="member@siswa.um.edu.my")
    member_user.profile = Profile(app_role=AppRole.STUDENT)
    target_user = User(id=str(uuid4()), email="other@siswa.um.edu.my")
    target_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add_all([member_user, target_user])
    db_session.commit()

    response = client.patch(
        f"/api/v1/users/{target_user.id}/role",
        headers=AUTH_HEADERS,
        json={"app_role": "organizer"},
    )

    assert response.status_code == 403
