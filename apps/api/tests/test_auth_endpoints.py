from uuid import uuid4

from sqlalchemy import select

from app.auth.jwt import TokenVerificationError
from app.models import AppRole, Profile, User


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


def test_invalid_token_returns_401(client, token_verifier) -> None:
    token_verifier.error = TokenVerificationError("Invalid Supabase access token.")

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 401


def test_non_um_email_returns_403(client, token_verifier) -> None:
    token_verifier.claims = token_verifier.claims.model_copy(update={"email": "outside@example.com"})

    response = client.get("/api/v1/auth/me", headers=AUTH_HEADERS)

    assert response.status_code == 403


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
