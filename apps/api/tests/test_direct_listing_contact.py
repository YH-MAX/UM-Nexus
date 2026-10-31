from uuid import uuid4

import pytest

from app.auth.jwt import TokenClaims
from app.models import Listing, TradeContactRequest, TradeTransaction, User
from tests.conftest import authorization_headers
from tests.test_marketplace_launch_v1 import create_published_listing, listing_payload, complete_profile


AUTH = authorization_headers()


def become_buyer(token_verifier):
    buyer_id = uuid4()
    token_verifier.claims = TokenClaims(sub=buyer_id, email=f"buyer.{buyer_id.hex}@siswa.um.edu.my", role="authenticated")


@pytest.mark.parametrize("method,value,expected_value,expected_url", [
    ("telegram", "@seller_um", "@seller_um", "https://t.me/seller_um"),
    ("telegram", "https://t.me/seller_um", "@seller_um", "https://t.me/seller_um"),
    ("whatsapp", "+60 (12) 345-6789", "+60123456789", "https://wa.me/60123456789"),
    ("email", "seller+trade@example.com", "seller+trade@example.com", "mailto:seller%2Btrade@example.com"),
])
def test_verified_buyer_gets_direct_action_without_profile_or_approval(client, token_verifier, db_session, method, value, expected_value, expected_url):
    listing = create_published_listing(client, contact_method=method, contact_value=value)
    become_buyer(token_verifier)
    response = client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH)
    assert response.status_code == 200
    assert response.json() == {"listing_id": listing["id"], "contact_method": method, "contact_value": expected_value, "contact_url": expected_url}
    assert response.headers["cache-control"] == "private, no-store"
    assert "Authorization" in response.headers["vary"]
    assert db_session.query(TradeContactRequest).count() == 0
    assert db_session.query(TradeTransaction).count() == 0


def test_contact_stays_out_of_public_responses_and_requires_auth(client):
    listing = create_published_listing(client)
    assert client.get(f"/api/v1/listings/{listing['id']}/contact").status_code == 401
    for data in [client.get(f"/api/v1/listings/{listing['id']}").json(), *client.get("/api/v1/listings").json()["items"]]:
        assert "contact_value" not in data
        assert "contact_url" not in data


def test_owner_can_read_and_update_listing_contact_and_email_fallback(client, token_verifier):
    listing = create_published_listing(client)
    seller = token_verifier.claims
    own = client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH)
    assert own.json()["contact_value"] == "@seller_um"
    assert client.patch(f"/api/v1/listings/{listing['id']}", headers=AUTH, json={"contact_method": "whatsapp", "contact_value": "+60123456789"}).status_code == 200
    become_buyer(token_verifier)
    assert client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH).json()["contact_url"] == "https://wa.me/60123456789"
    token_verifier.claims = seller
    assert client.patch(f"/api/v1/listings/{listing['id']}", headers=AUTH, json={"contact_method": "email", "contact_value": ""}).status_code == 200
    become_buyer(token_verifier)
    contact = client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH).json()
    assert contact["contact_value"] == seller.email
    assert contact["contact_url"] == f"mailto:{seller.email}"


@pytest.mark.parametrize("listing_status", ["draft", "sold", "hidden", "deleted"])
def test_unavailable_listings_do_not_reveal_contact(client, token_verifier, db_session, listing_status):
    listing = create_published_listing(client)
    record = db_session.get(Listing, listing["id"])
    record.status = listing_status
    db_session.commit()
    become_buyer(token_verifier)
    response = client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH)
    assert response.status_code in {404, 409}
    assert "@seller_um" not in response.text


def test_suspended_seller_and_unconfirmed_buyers_do_not_reveal_contact(client, token_verifier, db_session, supabase_auth_user_client):
    listing = create_published_listing(client)
    seller = db_session.get(User, listing["seller_id"])
    seller.status = "suspended"
    db_session.commit()
    become_buyer(token_verifier)
    assert client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH).status_code in {404, 409}
    seller.status = "active"
    db_session.commit()
    supabase_auth_user_client.email_confirmed_at = None
    assert client.get(f"/api/v1/listings/{listing['id']}/contact", headers=AUTH).status_code == 403


@pytest.mark.parametrize("method,value", [
    ("in_app", None), ("telegram", "javascript:alert(1)"),
    ("telegram", "https://evil.example/seller_um"), ("whatsapp", "0123456789"),
    ("whatsapp", "https://evil.example/60123456789"), ("email", "seller@example.com\r\nBcc:other@example.com"),
])
def test_publish_rejects_unusable_or_unsafe_contact_destinations(client, method, value):
    complete_profile(client)
    response = client.post("/api/v1/listings?publish=true", headers=AUTH, json=listing_payload(contact_method=method, contact_value=value))
    assert response.status_code == 400
