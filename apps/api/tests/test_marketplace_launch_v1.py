from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.models import AppRole, Listing, Notification, Profile, TradeContactRequest, User
from app.repositories.trade import TradeRepository
from app.services.trade_notifications import create_trade_notification
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


def wanted_payload(**overrides):
    payload = {
        "title": "Looking for Casio scientific calculator",
        "description": "Need a calculator for exams and can meet around FSKTM.",
        "category": "electronics",
        "desired_item_name": "scientific calculator",
        "max_budget": 60,
        "currency": "MYR",
        "preferred_pickup_area": "fsktm",
        "residential_college": "KK12",
    }
    payload.update(overrides)
    return payload


def complete_profile(client) -> None:
    response = client.patch(
        "/api/v1/users/me/profile",
        headers=AUTH_HEADERS,
        json={
            "display_name": "UM Seller",
            "faculty": "FSKTM",
            "college_or_location": "kk12",
        },
    )
    assert response.status_code == 200


def create_published_listing(client, **overrides) -> dict:
    complete_profile(client)
    response = client.post("/api/v1/listings?publish=true", headers=AUTH_HEADERS, json=listing_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def create_wanted_post(client, **overrides) -> dict:
    complete_profile(client)
    response = client.post("/api/v1/wanted-posts", headers=AUTH_HEADERS, json=wanted_payload(**overrides))
    assert response.status_code == 201
    return response.json()


def send_contact_request(client, listing_id: str, **overrides) -> dict:
    payload = {
        "message": "Interested.",
        "buyer_contact_method": "telegram",
        "buyer_contact_value": "@buyer",
        "safety_acknowledged": True,
    }
    payload.update(overrides)
    response = client.post(
        f"/api/v1/listings/{listing_id}/contact-requests",
        headers=AUTH_HEADERS,
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def test_feed_filters_and_legacy_category_normalization(client) -> None:
    first = create_published_listing(client)
    second = create_published_listing(
        client,
        title="Rice cooker",
        category="small_appliances",
        condition_label="fair",
        price=45,
        pickup_area="KK",
    )

    assert first["category"] == "textbooks_notes"
    assert second["category"] == "kitchen_appliances"

    response = client.get(
        "/api/v1/listings?category=kitchen_appliances&condition=fair&pickup_area=KK&min_price=40&max_price=60&status=available&sort=price_desc"
    )

    assert response.status_code == 200
    body = response.json()
    assert [item["id"] for item in body["items"]] == [second["id"]]


def test_public_feed_excludes_hidden_and_review_required_listings(client, db_session) -> None:
    visible = create_published_listing(client)
    hidden = create_published_listing(client, title="Hidden listing", category="dorm_essentials")
    review_required = create_published_listing(
        client,
        title="Cash urgent phone",
        description="No receipt, pay first, urgent cash.",
    )
    db_session.query(Listing).filter(Listing.id == hidden["id"]).update({"status": "hidden"})
    db_session.commit()

    response = client.get("/api/v1/listings")

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["items"]}
    assert visible["id"] in ids
    assert hidden["id"] not in ids
    assert review_required["id"] not in ids


def test_prohibited_item_blocks_creation_and_suspicious_item_enters_review(client) -> None:
    complete_profile(client)
    blocked = client.post(
        "/api/v1/listings?publish=true",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Vape pod", description="Unused vape pod for sale."),
    )
    suspicious = client.post(
        "/api/v1/listings?publish=true",
        headers=AUTH_HEADERS,
        json=listing_payload(title="Cheap phone", description="No receipt and urgent cash sale."),
    )

    assert blocked.status_code == 400
    assert suspicious.status_code == 201
    assert suspicious.json()["moderation_status"] == "review_required"


def test_contact_request_accept_reject_and_reveal_permissions(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    buyer_id = uuid4()
    token_verifier.claims = seller_claims.model_copy(
        update={"sub": buyer_id, "email": "buyer@siswa.um.edu.my"}
    )
    complete_profile(client)
    request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Is this still available?",
            "buyer_contact_method": "whatsapp",
            "buyer_contact_value": "+60123456789",
            "safety_acknowledged": True,
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
    token_verifier.claims = seller_claims.model_copy(
        update={"sub": buyer_id, "email": "buyer@siswa.um.edu.my"}
    )
    buyer_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert accepted.status_code == 200
    assert accepted.json()["buyer_contact_value"] == "+60123456789"
    assert accepted.json()["seller_contact_value"] == "@seller_um"
    assert buyer_notifications.status_code == 200
    assert buyer_notifications.json()[0]["type"] == "contact_request_accepted"
    assert buyer_notifications.json()[0]["action_url"] == f"/trade/dashboard?tab=sent&request_id={contact_request_id}"
    assert buyer_notifications.json()[0]["actor_id"] == str(seller_claims.sub)
    assert buyer_notifications.json()[0]["metadata"]["request_id"] == contact_request_id
    assert buyer_notifications.json()[0]["priority"] == "high"

    token_verifier.claims = seller_claims.model_copy(
        update={"sub": uuid4(), "email": "second-buyer@siswa.um.edu.my"}
    )
    complete_profile(client)
    second_request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Backup buyer",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer2",
            "safety_acknowledged": True,
        },
    ).json()
    token_verifier.claims = seller_claims
    rejected = client.patch(
        f"/api/v1/contact-requests/{second_request['id']}",
        headers=AUTH_HEADERS,
        json={"status": "rejected"},
    )
    token_verifier.claims = seller_claims.model_copy(
        update={"sub": second_request["buyer_id"], "email": "second-buyer@siswa.um.edu.my"}
    )
    rejected_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert rejected.status_code == 200
    assert rejected.json()["buyer_contact_value"] == "@buyer2"
    assert rejected.json()["seller_contact_value"] is None
    assert rejected_notifications.json()[0]["type"] == "contact_request_rejected"

    token_verifier.claims = seller_claims
    completed = client.patch(
        f"/api/v1/contact-requests/{contact_request_id}/seller-resolution",
        headers=AUTH_HEADERS,
        json={"action": "mark_completed", "agreed_price": 30, "sold_source": "accepted_request"},
    )
    token_verifier.claims = seller_claims.model_copy(
        update={"sub": buyer_id, "email": "buyer@siswa.um.edu.my"}
    )
    completed_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert completed.status_code == 200
    assert "trade_marked_completed" in [notification["type"] for notification in completed_notifications.json()]


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
        json={"report_type": "suspicious_payment_behavior", "reason": "Asked to pay first."},
    )
    dashboard = client.get("/api/v1/admin/dashboard", headers=AUTH_HEADERS)
    suspended = client.patch(
        f"/api/v1/admin/users/{reported.id}/status",
        headers=AUTH_HEADERS,
        json={"status": "suspended", "reason": "Unsafe trade behavior."},
    )

    assert report.status_code == 201
    assert dashboard.status_code == 200
    assert dashboard.json()["statistics"]["total_users"] == 2
    assert suspended.status_code == 200
    assert suspended.json()["status"] == "suspended"


def test_admin_categories_roles_ai_settings_and_actions(client, db_session, token_verifier) -> None:
    admin_id = str(token_verifier.claims.sub)
    admin = User(id=admin_id, email="admin@siswa.um.edu.my")
    admin.profile = Profile(app_role=AppRole.ADMIN)
    target = User(id=str(uuid4()), email="moderator@siswa.um.edu.my")
    target.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add_all([admin, target])
    db_session.commit()

    category = client.post(
        "/api/v1/admin/categories",
        headers=AUTH_HEADERS,
        json={"slug": "lab_tools", "label": "Lab Tools", "sort_order": 120, "is_active": True},
    )
    updated_category = client.patch(
        f"/api/v1/admin/categories/{category.json()['id']}",
        headers=AUTH_HEADERS,
        json={"is_active": False},
    )
    role = client.patch(
        f"/api/v1/admin/users/{target.id}/role",
        headers=AUTH_HEADERS,
        json={"app_role": "moderator", "reason": "Launch moderation staffing."},
    )
    settings = client.patch(
        "/api/v1/admin/ai-settings",
        headers=AUTH_HEADERS,
        json={"ai_trade_enabled": False, "ai_student_daily_limit": 2},
    )
    actions = client.get("/api/v1/admin/actions", headers=AUTH_HEADERS)
    ai_usage = client.get("/api/v1/admin/ai-usage", headers=AUTH_HEADERS)

    assert category.status_code == 201
    assert updated_category.status_code == 200
    assert updated_category.json()["is_active"] is False
    assert role.status_code == 200
    assert role.json()["app_role"] == "moderator"
    assert settings.status_code == 200
    assert settings.json()["ai_trade_enabled"] is False
    assert actions.status_code == 200
    assert len(actions.json()) >= 3
    assert ai_usage.status_code == 200


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


def test_default_listing_create_is_draft_and_notifications_can_be_read(client, db_session, token_verifier) -> None:
    seller_claims = token_verifier.claims
    draft = client.post("/api/v1/listings", headers=AUTH_HEADERS, json=listing_payload())

    assert draft.status_code == 201
    assert draft.json()["status"] == "draft"

    complete_profile(client)
    published = client.post(f"/api/v1/listings/{draft.json()['id']}/publish", headers=AUTH_HEADERS).json()
    token_verifier.claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "notify-buyer@siswa.um.edu.my"})
    complete_profile(client)
    request = client.post(
        f"/api/v1/listings/{published['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Interested.",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer",
            "safety_acknowledged": True,
        },
    )

    token_verifier.claims = seller_claims
    notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)
    unread = client.get("/api/v1/users/me/notifications/unread-count", headers=AUTH_HEADERS)
    other_user_id = uuid4()
    other_user = User(id=str(other_user_id), email="other-notify@siswa.um.edu.my")
    other_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add(other_user)
    db_session.commit()
    TradeRepository(db_session).create_notification(
        {
            "user_id": other_user.id,
            "type": "contact_request_received",
            "title": "Other user alert",
            "body": "This alert should stay unread.",
            "entity_type": "contact_request",
            "entity_id": request.json()["id"],
        }
    )
    limited_unread = client.get(
        "/api/v1/users/me/notifications?limit=1&unread_only=true&type=contact_request_received",
        headers=AUTH_HEADERS,
    )
    read = client.patch(f"/api/v1/notifications/{notifications.json()[0]['id']}/read", headers=AUTH_HEADERS)
    token_verifier.claims = seller_claims.model_copy(update={"sub": other_user_id, "email": other_user.email})
    forbidden_read = client.patch(f"/api/v1/notifications/{notifications.json()[0]['id']}/read", headers=AUTH_HEADERS)
    token_verifier.claims = seller_claims
    read_all = client.patch("/api/v1/notifications/read-all", headers=AUTH_HEADERS)
    unread_after = client.get("/api/v1/users/me/notifications/unread-count", headers=AUTH_HEADERS)

    assert request.status_code == 201
    assert notifications.status_code == 200
    assert notifications.json()[0]["type"] == "contact_request_received"
    assert notifications.json()[0]["action_url"] == f"/trade/dashboard?tab=received&request_id={request.json()['id']}"
    assert notifications.json()[0]["actor_id"] == str(request.json()["buyer_id"])
    assert notifications.json()[0]["metadata"]["listing_id"] == published["id"]
    assert notifications.json()[0]["priority"] == "high"
    assert unread.status_code == 200
    assert unread.json()["unread"] == 1
    assert limited_unread.status_code == 200
    assert len(limited_unread.json()) == 1
    assert read.status_code == 200
    assert read.json()["is_read"] is True
    assert forbidden_read.status_code == 404
    assert read_all.status_code == 200
    assert unread_after.json()["unread"] == 0
    db_session.expire_all()
    other_notification = db_session.query(Notification).filter(Notification.user_id == other_user.id).one()
    assert other_notification.is_read is False


def test_trade_notification_dedupe_window_and_scope(db_session) -> None:
    first_user = User(id=str(uuid4()), email="dedupe-one@siswa.um.edu.my")
    first_user.profile = Profile(app_role=AppRole.STUDENT)
    second_user = User(id=str(uuid4()), email="dedupe-two@siswa.um.edu.my")
    second_user.profile = Profile(app_role=AppRole.STUDENT)
    db_session.add_all([first_user, second_user])
    db_session.commit()
    repo = TradeRepository(db_session)
    listing_id = str(uuid4())

    first = create_trade_notification(
        repo,
        user_id=first_user.id,
        notification_type="listing_marked_sold",
        title="Listing sold",
        body="A listing was sold.",
        entity_type="listing",
        entity_id=listing_id,
    )
    duplicate = create_trade_notification(
        repo,
        user_id=first_user.id,
        notification_type="listing_marked_sold",
        title="Listing sold again",
        body="This should dedupe.",
        entity_type="listing",
        entity_id=listing_id,
    )
    different_user = create_trade_notification(
        repo,
        user_id=second_user.id,
        notification_type="listing_marked_sold",
        title="Listing sold",
        body="Different users do not dedupe.",
        entity_type="listing",
        entity_id=listing_id,
    )
    different_entity = create_trade_notification(
        repo,
        user_id=first_user.id,
        notification_type="listing_marked_sold",
        title="Other listing sold",
        body="Different entities do not dedupe.",
        entity_type="listing",
        entity_id=str(uuid4()),
    )
    db_session.query(Notification).filter(Notification.id == first.id).update(
        {"created_at": datetime.now(UTC) - timedelta(days=2)}
    )
    db_session.commit()
    outside_window = create_trade_notification(
        repo,
        user_id=first_user.id,
        notification_type="listing_marked_sold",
        title="Listing sold later",
        body="Outside the dedupe window.",
        entity_type="listing",
        entity_id=listing_id,
    )

    assert duplicate.id == first.id
    assert different_user.id != first.id
    assert different_entity.id != first.id
    assert outside_window.id != first.id
    assert db_session.query(Notification).count() == 4


def test_contact_request_cancel_and_expire_on_sold(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    token_verifier.claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "buyer@siswa.um.edu.my"})
    complete_profile(client)
    request = client.post(
        f"/api/v1/listings/{listing['id']}/contact-requests",
        headers=AUTH_HEADERS,
        json={
            "message": "Interested.",
            "buyer_contact_method": "telegram",
            "buyer_contact_value": "@buyer",
            "safety_acknowledged": True,
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
    seller_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)
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
    assert "contact_request_cancelled" in [notification["type"] for notification in seller_notifications.json()]
    assert second.status_code == 201
    assert sold.status_code == 200
    assert blocked.status_code == 409


def test_listing_reserved_and_sold_notify_interested_buyers(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    first_buyer_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "reserved-one@siswa.um.edu.my"})
    token_verifier.claims = first_buyer_claims
    complete_profile(client)
    first_request = send_contact_request(client, listing["id"], buyer_contact_value="@buyer1")

    second_buyer_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "reserved-two@siswa.um.edu.my"})
    token_verifier.claims = second_buyer_claims
    complete_profile(client)
    second_request = send_contact_request(client, listing["id"], buyer_contact_value="@buyer2")

    token_verifier.claims = seller_claims
    accepted = client.patch(
        f"/api/v1/contact-requests/{first_request['id']}",
        headers=AUTH_HEADERS,
        json={"status": "accepted", "mark_listing_reserved": True},
    )

    token_verifier.claims = first_buyer_claims
    first_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)
    token_verifier.claims = second_buyer_claims
    second_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    token_verifier.claims = seller_claims
    sold = client.patch(
        f"/api/v1/listings/{listing['id']}/status",
        headers=AUTH_HEADERS,
        json={"status": "sold", "reason": "Sold after meetup."},
    )
    repeated_sold = client.patch(
        f"/api/v1/listings/{listing['id']}/status",
        headers=AUTH_HEADERS,
        json={"status": "sold", "reason": "Already sold."},
    )

    token_verifier.claims = first_buyer_claims
    first_after_sold = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)
    token_verifier.claims = second_buyer_claims
    second_after_sold = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert accepted.status_code == 200
    assert second_request["status"] == "pending"
    assert {"contact_request_accepted", "listing_marked_reserved"} <= {
        notification["type"] for notification in first_notifications.json()
    }
    assert "listing_marked_reserved" in [notification["type"] for notification in second_notifications.json()]
    assert sold.status_code == 200
    assert repeated_sold.status_code == 200
    assert "listing_marked_sold" in [notification["type"] for notification in first_after_sold.json()]
    assert [notification["type"] for notification in second_after_sold.json()].count("listing_marked_sold") == 1
    assert second_after_sold.json()[0]["action_url"] == f"/trade/{listing['id']}"


def test_seller_resolution_notifies_buyer_when_request_is_closed(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    no_response_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "no-response@siswa.um.edu.my"})
    token_verifier.claims = no_response_claims
    complete_profile(client)
    no_response_request = send_contact_request(client, listing["id"], buyer_contact_value="@noresponse")

    token_verifier.claims = seller_claims
    accepted_no_response = client.patch(
        f"/api/v1/contact-requests/{no_response_request['id']}",
        headers=AUTH_HEADERS,
        json={"status": "accepted"},
    )
    no_response = client.patch(
        f"/api/v1/contact-requests/{no_response_request['id']}/seller-resolution",
        headers=AUTH_HEADERS,
        json={"action": "buyer_no_response"},
    )

    token_verifier.claims = no_response_claims
    no_response_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    cancelled_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "cancelled-accepted@siswa.um.edu.my"})
    token_verifier.claims = cancelled_claims
    complete_profile(client)
    cancelled_request = send_contact_request(client, listing["id"], buyer_contact_value="@cancelled")

    token_verifier.claims = seller_claims
    accepted_cancelled = client.patch(
        f"/api/v1/contact-requests/{cancelled_request['id']}",
        headers=AUTH_HEADERS,
        json={"status": "accepted"},
    )
    cancelled = client.patch(
        f"/api/v1/contact-requests/{cancelled_request['id']}/seller-resolution",
        headers=AUTH_HEADERS,
        json={"action": "cancel_accepted"},
    )

    token_verifier.claims = cancelled_claims
    cancelled_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert accepted_no_response.status_code == 200
    assert no_response.status_code == 200
    assert "buyer_no_response" in [notification["type"] for notification in no_response_notifications.json()]
    assert accepted_cancelled.status_code == 200
    assert cancelled.status_code == 200
    assert "contact_request_cancelled" in [notification["type"] for notification in cancelled_notifications.json()]


def test_stale_contact_request_expiry_notifies_buyer(client, db_session, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    buyer_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "expired-buyer@siswa.um.edu.my"})
    token_verifier.claims = buyer_claims
    complete_profile(client)
    request = send_contact_request(client, listing["id"])
    db_session.query(TradeContactRequest).filter(TradeContactRequest.id == request["id"]).update(
        {"created_at": datetime.now(UTC) - timedelta(days=8)}
    )
    db_session.commit()

    contact_requests = client.get("/api/v1/users/me/contact-requests", headers=AUTH_HEADERS)
    notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert contact_requests.status_code == 200
    assert contact_requests.json()["sent"][0]["status"] == "expired"
    assert "contact_request_expired" in [notification["type"] for notification in notifications.json()]


def test_moderation_notifications_reach_listing_seller(client, db_session, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

    reporter_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "reporter@siswa.um.edu.my"})
    token_verifier.claims = reporter_claims
    complete_profile(client)
    report = client.post(
        f"/api/v1/listings/{listing['id']}/reports",
        headers=AUTH_HEADERS,
        json={"report_type": "misleading_description", "reason": "The listing details seem inaccurate."},
    )

    token_verifier.claims = seller_claims
    seller_reported_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    moderator_id = str(uuid4())
    moderator = User(id=moderator_id, email="moderator@siswa.um.edu.my")
    moderator.profile = Profile(app_role=AppRole.MODERATOR)
    admin_id = str(uuid4())
    admin = User(id=admin_id, email="admin@siswa.um.edu.my")
    admin.profile = Profile(app_role=AppRole.ADMIN)
    db_session.add_all([moderator, admin])
    db_session.commit()

    token_verifier.claims = seller_claims.model_copy(update={"sub": moderator_id, "email": moderator.email})
    reviewed = client.patch(
        f"/api/v1/moderation/listings/{listing['id']}/review",
        headers=AUTH_HEADERS,
        json={"status": "reviewed", "moderation_status": "clear", "resolution": "Report reviewed by moderator."},
    )
    token_verifier.claims = reporter_claims
    reporter_after_review = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    token_verifier.claims = seller_claims.model_copy(update={"sub": admin_id, "email": admin.email})
    hidden = client.patch(
        f"/api/v1/admin/listings/{listing['id']}",
        headers=AUTH_HEADERS,
        json={"status": "hidden", "reason": "Temporarily hidden for safety review."},
    )

    token_verifier.claims = seller_claims
    seller_after_review = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    notification_types = [notification["type"] for notification in seller_after_review.json()]
    assert report.status_code == 201
    assert seller_reported_notifications.json() == []
    assert reviewed.status_code == 200
    assert reporter_after_review.status_code == 200
    assert "report_reviewed" in [notification["type"] for notification in reporter_after_review.json()]
    assert hidden.status_code == 200
    assert "listing_hidden_by_moderation" in notification_types
    assert seller_after_review.json()[0]["actor_id"] == admin_id


def test_listing_created_from_wanted_post_notifies_wanted_owner(client, token_verifier) -> None:
    seller_claims = token_verifier.claims
    buyer_claims = seller_claims.model_copy(update={"sub": uuid4(), "email": "wanted-owner@siswa.um.edu.my"})
    token_verifier.claims = buyer_claims
    complete_profile(client)
    wanted = client.post(
        "/api/v1/wanted-posts",
        headers=AUTH_HEADERS,
        json={
            "title": "Looking for a calculator",
            "description": "Need a scientific calculator for exams.",
            "category": "electronics",
            "desired_item_name": "Scientific calculator",
            "max_budget": 50,
            "currency": "MYR",
            "preferred_pickup_area": "fsktm",
        },
    )

    token_verifier.claims = seller_claims
    listing = create_published_listing(
        client,
        title="Calculator from wanted post",
        category="electronics",
        source_wanted_post_id=wanted.json()["id"],
    )

    token_verifier.claims = buyer_claims
    notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert wanted.status_code == 201
    assert listing["source_wanted_post_id"] == wanted.json()["id"]
    assert notifications.status_code == 200
    assert notifications.json()[0]["type"] == "wanted_match_listing_created"


def test_wanted_board_filters_pagination_and_owner_status_controls(client, token_verifier) -> None:
    owner_claims = token_verifier.claims
    first = create_wanted_post(client)
    create_wanted_post(
        client,
        title="Need a compact desk lamp",
        description="Small lamp for dorm desk.",
        category="dorm_room",
        desired_item_name="desk lamp",
        max_budget=25,
        preferred_pickup_area="kk",
    )

    filtered = client.get(
        "/api/v1/wanted-posts?search=casio&category=electronics&pickup_area=fsktm&max_budget=80&limit=1",
        headers=AUTH_HEADERS,
    )
    closed = client.patch(f"/api/v1/wanted-posts/{first['id']}/status", headers=AUTH_HEADERS, json={"status": "closed"})
    active_after_close = client.get("/api/v1/wanted-posts?status=active", headers=AUTH_HEADERS)
    all_after_close = client.get("/api/v1/wanted-posts?status=all", headers=AUTH_HEADERS)

    token_verifier.claims = owner_claims.model_copy(update={"sub": uuid4(), "email": "other-seller@siswa.um.edu.my"})
    complete_profile(client)
    forbidden = client.patch(f"/api/v1/wanted-posts/{first['id']}/status", headers=AUTH_HEADERS, json={"status": "active"})

    token_verifier.claims = owner_claims
    reopened = client.patch(f"/api/v1/wanted-posts/{first['id']}/status", headers=AUTH_HEADERS, json={"status": "active"})

    assert filtered.status_code == 200
    assert filtered.json()["total"] == 1
    assert filtered.json()["items"][0]["id"] == first["id"]
    assert filtered.json()["has_more"] is False
    assert closed.status_code == 200
    assert closed.json()["status"] == "closed"
    assert first["id"] not in {item["id"] for item in active_after_close.json()["items"]}
    assert first["id"] in {item["id"] for item in all_after_close.json()["items"]}
    assert forbidden.status_code == 403
    assert reopened.status_code == 200
    assert reopened.json()["status"] == "active"


def test_wanted_response_lifecycle_hides_contact_until_buyer_accepts(client, token_verifier) -> None:
    buyer_claims = token_verifier.claims
    wanted = create_wanted_post(client)

    seller_claims = buyer_claims.model_copy(update={"sub": uuid4(), "email": "wanted-seller@siswa.um.edu.my"})
    token_verifier.claims = seller_claims
    complete_profile(client)
    response = client.post(
        f"/api/v1/wanted-posts/{wanted['id']}/responses",
        headers=AUTH_HEADERS,
        json={
            "message": "I have a clean FX-570EX and can meet at FSKTM.",
            "seller_contact_method": "telegram",
            "seller_contact_value": "@seller_fx",
        },
    )
    duplicate = client.post(
        f"/api/v1/wanted-posts/{wanted['id']}/responses",
        headers=AUTH_HEADERS,
        json={
            "message": "Second offer should be blocked.",
            "seller_contact_method": "telegram",
            "seller_contact_value": "@seller_fx",
        },
    )

    token_verifier.claims = buyer_claims
    buyer_dashboard = client.get("/api/v1/users/me/trade-dashboard", headers=AUTH_HEADERS)
    accepted = client.patch(
        f"/api/v1/wanted-posts/responses/{response.json()['id']}",
        headers=AUTH_HEADERS,
        json={"status": "accepted", "buyer_response": "Accepted, please message me."},
    )
    buyer_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    token_verifier.claims = seller_claims
    seller_dashboard = client.get("/api/v1/users/me/trade-dashboard", headers=AUTH_HEADERS)
    cancel_after_accept = client.patch(f"/api/v1/wanted-posts/responses/{response.json()['id']}/cancel", headers=AUTH_HEADERS)

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["seller_contact_value"] is None
    assert duplicate.status_code == 409
    assert buyer_dashboard.status_code == 200
    assert buyer_dashboard.json()["wanted_responses_received"][0]["seller_contact_value"] is None
    assert buyer_notifications.json()[0]["type"] == "wanted_response_received"
    assert accepted.status_code == 200
    assert accepted.json()["seller_contact_value"] == "@seller_fx"
    assert accepted.json()["status"] == "accepted"
    assert seller_dashboard.status_code == 200
    assert seller_dashboard.json()["wanted_responses_sent"][0]["seller_contact_value"] == "@seller_fx"
    assert cancel_after_accept.status_code == 409


def test_wanted_response_reject_and_cancel_notifications(client, token_verifier) -> None:
    buyer_claims = token_verifier.claims
    rejected_wanted = create_wanted_post(client)
    cancelled_wanted = create_wanted_post(client, title="Looking for a monitor", desired_item_name="monitor")

    seller_claims = buyer_claims.model_copy(update={"sub": uuid4(), "email": "wanted-response@siswa.um.edu.my"})
    token_verifier.claims = seller_claims
    complete_profile(client)
    rejected_response = client.post(
        f"/api/v1/wanted-posts/{rejected_wanted['id']}/responses",
        headers=AUTH_HEADERS,
        json={"message": "I have one.", "seller_contact_method": "email"},
    )
    cancelled_response = client.post(
        f"/api/v1/wanted-posts/{cancelled_wanted['id']}/responses",
        headers=AUTH_HEADERS,
        json={"message": "Actually unavailable soon.", "seller_contact_method": "email"},
    )
    cancelled = client.patch(f"/api/v1/wanted-posts/responses/{cancelled_response.json()['id']}/cancel", headers=AUTH_HEADERS)

    token_verifier.claims = buyer_claims
    rejected = client.patch(
        f"/api/v1/wanted-posts/responses/{rejected_response.json()['id']}",
        headers=AUTH_HEADERS,
        json={"status": "rejected", "buyer_response": "Found another item."},
    )
    buyer_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    token_verifier.claims = seller_claims
    seller_notifications = client.get("/api/v1/users/me/notifications", headers=AUTH_HEADERS)

    assert rejected_response.status_code == 201
    assert cancelled_response.status_code == 201
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"
    assert "wanted_response_cancelled" in [notification["type"] for notification in buyer_notifications.json()]
    assert "wanted_response_rejected" in [notification["type"] for notification in seller_notifications.json()]


def test_duplicate_report_prevention_and_threshold_auto_hide(client, db_session, token_verifier) -> None:
    seller_claims = token_verifier.claims
    listing = create_published_listing(client)

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
