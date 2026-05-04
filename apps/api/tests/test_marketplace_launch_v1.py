from __future__ import annotations

from uuid import uuid4

from app.models import AppRole, Listing, Profile, User
from tests.conftest import authorization_headers


AUTH_HEADERS = authorization_headers()


def listing_payload(**overrides):
    payload = {
        "title": "Used Casio Scientific Calculator",
        "description": "Good working calculator with minor scratches.",
        "category": "textbooks",
        "item_name": "Casio calculator",
        "condition_label": "good",
        "price": 30,
        "pickup_area": "library",
        "contact_method": "telegram",
        "contact_value": "@seller_um",
    }
    payload.update(overrides)
    return payload


def test_feed_filters_and_legacy_category_normalization(client) -> None:
    first = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload()).json()
    second = client.post(
        "/api/v1/listings",
        headers=AUTH_HEADERS,
        json=listing_payload(
            title="Rice cooker",
            category="small_appliances",
            condition_label="fair",
            price=45,
            pickup_area="KK",
        ),
    ).json()

    assert first["category"] == "textbooks_notes"
    assert second["category"] == "kitchen_appliances"

    response = client.get(
        "/api/v1/listings?category=kitchen_appliances&condition=fair&pickup_area=KK&min_price=40&max_price=60&status=available&sort=price_desc"
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body] == [second["id"]]


def test_public_feed_excludes_hidden_and_review_required_listings(client, db_session) -> None:
    visible = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload()).json()
    hidden = client.post(
        "/api/v1/listings",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Hidden listing", category="dorm_essentials"),
    ).json()
    review_required = client.post(
        "/api/v1/listings",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Cash urgent phone", description="No receipt, pay first, urgent cash."),
    ).json()
    db_session.query(Listing).filter(Listing.id == hidden["id"]).update({"status": "hidden"})
    db_session.commit()

    response = client.get("/api/v1/listings")

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert visible["id"] in ids
    assert hidden["id"] not in ids
    assert review_required["id"] not in ids


def test_prohibited_item_blocks_creation_and_suspicious_item_enters_review(client) -> None:
    blocked = client.post(
        "/api/v1/listings",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Vape pod", description="Unused vape pod for sale."),
    )
    suspicious = client.post(
        "/api/v1/listings",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Cheap phone", description="No receipt and urgent cash sale."),
    )

    assert blocked.status_code == 400
    assert suspicious.status_code == 201
    assert suspicious.json()["moderation_status"] == "review_required"


def test_contact_request_accept_reject_and_reveal_permissions(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload()).json()

    buyer_id = uuid4()
    token_verifier.claims = seller_claims.model_copy(
        update={"sub": buyer_id, "email": "buyer@siswa.um.edu.my"}
    )
    request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Is this still available?",
            "buyer_contact_method": "whatsapp",
            "buyer_contact_value": "+60123456789",
        },
    )

    assert request.status_code == 201
    assert request.json()["buyer_contact_value"] is None
    contact_request_id = request.json()["id"]

    token_verifier.claims = seller_claims
    accepted = client.patch(
        f"/api/v1/contact-requests/{contact_request_id}",
        headers=AUTH_HEADERS,
        json={"status": "accepted"},
    )

    assert accepted.status_code == 200
    assert accepted.json()["buyer_contact_value"] == "+60123456789"
    assert accepted.json()["seller_contact_value"] == "@seller_um"

    token_verifier.claims = seller_claims.model_copy(
        update={"sub": uuid4(), "email": "second-buyer@siswa.um.edu.my"}
    )
    second_request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Backup buyer",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer2",
        },
    ).json()
    token_verifier.claims = seller_claims
    rejected = client.patch(
        f"/api/v1/contact-requests/{second_request['id']}",
        headers=AUTH_HEADERS,
        json={"status": "rejected"},
    )

    assert rejected.status_code == 200
    assert rejected.json()["buyer_contact_value"] is None
    assert rejected.json()["seller_contact_value"] is None


def test_report_user_admin_dashboard_and_user_status_actions(client, db_session, token_verifier) -> None:
    admin_id = str(token_verifier.claims.sub)
    admin = User(id=admin_id, email="admin@siswa.um.edu.my")
    admin.profile = Profile(app_role=AppRole.ADMIN)
    reported = User(id=str(uuid4()), email="reported@siswa.um.edu.my")
    reported.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add_all([admin, reported])
    db_session.commit()

    report = client.post(
        f"/api/v1/users/{reported.id}/reports",
        headers=AUTH_HEADERS,
        json={"report_type": "unsafe_trade_behavior", "reason": "Asked to pay first."},
    )
    dashboard = client.get("/api/v1/admin/dashboard", headers=AUTH_HEADERS)
    suspended = client.patch(
        f"/api/v1/admin/users/{reported.id}/status",
        headers=AUTH_HEADERS,
        json={"status": "suspended"},
    )

    assert report.status_code == 201
    assert dashboard.status_code == 200
    assert dashboard.json()["statistics"]["total_users"] == 2
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"


def test_suspended_user_cannot_create_listing(client, db_session, token_verifier) -> None:
    user_id = str(token_verifier.claims.sub)
    user = User(id=user_id, email="tester@siswa.um.edu.my", status="suspended")
    user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add(user)
    db_session.commit()

    response = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload())

    assert response.status_code == 403
    assert "suspended or banned" in response.json()["detail"]


def test_draft_publish_view_count_and_favorites(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    draft = client.post(
        "/api/v1/listings?publish=false",
        headers=AUTH_HEADERS,
        json=listing_payload(pickup_area="main_library"),
    )
    assert draft.status_code == 201
    assert draft.json()["status"] == "draft"

    publish_blocked = client.post(f"/api/v1/listings/{draft.json()['id']}/publish", headers=AUTH_HEADERS)
    assert publish_blocked.status_code == 400

    profile = client.patch(
        "/api/v1/users/me/profile",
        headers=AUTH_HEADERS,
        json={
            "display_name": "UM Seller",
            "faculty": "FSKTM",
            "college_or_location": "KK12",
        },
    )
    published = client.post(f"/api/v1/listings/{draft.json()['id']}/publish", headers=AUTH_HEADERS)
    detail = client.get(f"/api/v1/listings/{draft.json()['id']}")
    detail_again = client.get(f"/api/v1/listings/{draft.json()['id']}")

    assert profile.status_code == 200
    assert published.status_code == 200
    assert published.json()["status"] == "available"
    assert detail.json()["view_count"] == 1
    assert detail_again.json()["view_count"] == 1

    token_verifier.claims = seller_claims.model_copy(
        update={"sub": uuid4(), "email": "favorite-buyer@siswa.um.edu.my"}
    )
    favorite = client.post(f"/api/v1/listings/{draft.json()['id']}/favorite", headers=AUTH_HEADERS)
    duplicate = client.post(f"/api/v1/listings/{draft.json()['id']}/favorite", headers=AUTH_HEADERS)
    favorites = client.get("/api/v1/users/me/favorites", headers=AUTH_HEADERS)
    removed = client.delete(f"/api/v1/listings/{draft.json()['id']}/favorite", headers=AUTH_HEADERS)

    assert favorite.status_code == 201
    assert duplicate.status_code == 201
    assert favorites.status_code == 200
    assert len(favorites.json()) == 1
    assert removed.status_code == 204


def test_contact_request_cancel_and_expire_on_sold(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload()).json()

    token_verifier.claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "buyer@siswa.um.edu.my"})
    request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Interested.",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer",
        },
    )
    cancelled = client.patch(f"/api/v1/contact-requests/{request.json()['id']}/cancel", headers=AUTH_HEADERS)
    second = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Still interested.",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer",
        },
    )

    token_verifier.claims = seller_claims
    sold = client.patch(
        f"/api/v1/listings/{listing['id']}/status",
        headers=AUTH_HEADERS,
        json={"status": "sold", "reason": "Sold after campus meetup."},
    )

    token_verifier.claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "third@siswa.um.edu.my"})
    blocked = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Can I buy?",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@third",
        },
    )

    assert request.status_code == 201
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert second.status_code == 201
    assert sold.status_code == 200
    assert blocked.status_code == 409


def test_duplicate_report_prevention_and_threshold_auto_hide(client, db_session, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload()).json()

    reporter_one = seller_claims.model_copy(update={"sub": uuid4(), "email": "r1@siswa.um.edu.my"})
    token_verifier.claims = reporter_one
    first = client.post(
        f"/api/v1/listings/{listing['id']}/reports",
        headers=AUTH_HEADERS,
        json={"report_type": "misleading_description", "reason": "Details seem wrong."},
    )
    duplicate = client.post(
        f"/api/v1/listings/{listing['id']}/reports",
        headers=AUTH_HEADERS,
        json={"report_type": "misleading_description", "reason": "Same report."},
    )

    for index in range(2, 4):
        token_verifier.claims = seller_claims.model_copy(
            update={"sub": uuid4(), "email": f"r{index}@siswa.um.edu.my"}
        )
        response = client.post(
            f"/api/v1/listings/{listing['id']}/reports",
            headers=AUTH_HEADERS,
            json={"report_type": "unsafe_transaction", "reason": "Asked to pay first."},
        )
        assert response.status_code == 201

    db_session.expire_all()
    db_listing = db_session.query(Listing).filter(Listing.id == listing["id"]).one()

    assert first.status_code == 201
    assert first.json()["status"] == "pending"
    assert duplicate.status_code == 409
    assert db_listing.status == "hidden"
    assert db_listing.moderation_status == "review_required"
