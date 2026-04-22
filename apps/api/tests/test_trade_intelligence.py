import json
from uuid import uuid4

from sqlalchemy import select

from app.integrations.glm_client import DemoGLMClient
from app.integrations.supabase_storage import SupabaseStoredFile
from app.models import AppRole, HistoricalSale, ListingEmbedding, ListingReport, MediaAsset, Profile
from app.services.embedding_service import make_demo_embedding_text
from app.services import sell_agent_service as sell_agent_module
from app.services import storage_service as storage_module
from app.services.trade_intelligence_glm_service import retrieve_similar_examples
from app.services.trade_intelligence import create_pending_trade_intelligence_run
from scripts.seed_trade_demo import HISTORICAL_SALES, LISTINGS, WANTED_POSTS


AUTHLESS_HEADERS: dict[str, str] = {}
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def listing_payload() -> dict:
    return {
        "title": "Casio FX-570EX calculator",
        "description": "Used for two semesters, works well with minor scratches.",
        "category": "electronics",
        "item_name": "scientific calculator",
        "brand": "Casio",
        "model": "FX-570EX",
        "condition_label": "good",
        "price": 55.0,
        "pickup_area": "FSKTM",
        "residential_college": "KK12",
    }


def wanted_post_payload() -> dict:
    return {
        "title": "Looking for Casio calculator near FSKTM",
        "description": "Need a scientific calculator for exams and can meet at FSKTM urgently.",
        "category": "electronics",
        "desired_item_name": "scientific calculator",
        "max_budget": 60.0,
        "preferred_pickup_area": "FSKTM",
        "residential_college": "KK12",
    }


def create_listing(client, payload: dict | None = None) -> dict:
    response = client.post("/api/v1/listings", json=payload or listing_payload(), headers=AUTH_HEADERS)
    assert response.status_code == 201
    return response.json()


def create_wanted_post(client, payload: dict | None = None) -> dict:
    response = client.post("/api/v1/wanted-posts", json=payload or wanted_post_payload(), headers=AUTH_HEADERS)
    assert response.status_code == 201
    return response.json()


def add_image(client, listing_id: str) -> None:
    response = client.post(
        f"/api/v1/listings/{listing_id}/images",
        headers=AUTH_HEADERS,
        json={"storage_path": "demo/listings/casio-fx570ex.jpg", "is_primary": True},
    )
    assert response.status_code == 201


def seed_historical_sales(db_session, item_name: str = "scientific calculator", category: str = "electronics") -> None:
    db_session.add_all(
        [
            HistoricalSale(item_name=item_name, category=category, condition_label="fair", sold_price=42, location="FSKTM"),
            HistoricalSale(item_name=item_name, category=category, condition_label="good", sold_price=52, location="FSKTM"),
            HistoricalSale(item_name=item_name, category=category, condition_label="like new", sold_price=64, location="FSKTM"),
        ]
    )
    db_session.commit()


def enrich_and_fetch_result(client, listing_id: str) -> dict:
    response = client.post(f"/api/v1/ai/trade/enrich-listing/{listing_id}", headers=AUTH_HEADERS)
    assert response.status_code == 202
    accepted = response.json()
    assert accepted["status"] == "accepted"

    result_response = client.get(f"/api/v1/ai/trade/result/{listing_id}")
    assert result_response.status_code == 200
    body = result_response.json()
    assert body["status"] == "completed"
    assert body["result"] is not None
    return body["result"]


def test_create_listing_uses_authenticated_user(client, token_verifier) -> None:
    listing = create_listing(client)

    assert listing["title"] == "Casio FX-570EX calculator"
    assert listing["seller_id"] == str(token_verifier.claims.sub)
    assert listing["is_ai_enriched"] is False


def test_create_listing_requires_auth(client) -> None:
    response = client.post("/api/v1/listings", json=listing_payload(), headers=AUTHLESS_HEADERS)

    assert response.status_code == 401


def test_create_wanted_post_uses_authenticated_user(client, token_verifier) -> None:
    wanted_post = create_wanted_post(client)

    assert wanted_post["title"] == "Looking for Casio calculator near FSKTM"
    assert wanted_post["buyer_id"] == str(token_verifier.claims.sub)


def test_upload_listing_image_metadata(client) -> None:
    listing = create_listing(client)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
        headers=AUTH_HEADERS,
        json={
            "storage_path": "demo/listings/casio-fx570ex.jpg",
            "public_url": None,
            "sort_order": 0,
            "is_primary": True,
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["storage_path"] == "demo/listings/casio-fx570ex.jpg"
    assert body["is_primary"] is True


def test_real_image_upload_persists_listing_image_and_media_asset(client, db_session, monkeypatch) -> None:
    listing = create_listing(client)

    async def fake_upload_listing_image_to_supabase(*, storage_path, content, mime_type, settings):
        return SupabaseStoredFile(
            storage_bucket=settings.supabase_storage_bucket,
            storage_path=storage_path,
            public_url=f"https://project-ref.supabase.co/storage/v1/object/public/{settings.supabase_storage_bucket}/{storage_path}",
            mime_type=mime_type,
            file_size=len(content),
        )

    monkeypatch.setattr(storage_module, "upload_listing_image_to_supabase", fake_upload_listing_image_to_supabase)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
        headers=AUTH_HEADERS,
        files={"file": ("rice-cooker.jpg", b"fake-image-bytes", "image/jpeg")},
        data={"sort_order": "0", "is_primary": "true"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["public_url"].startswith("https://project-ref.supabase.co/storage/v1/object/public/listing-images/")
    assert body["storage_path"].startswith(f"listings/{listing['id']}/")
    assert body["is_primary"] is True

    media_asset = db_session.query(MediaAsset).filter(MediaAsset.entity_id == listing["id"]).one()
    assert media_asset.storage_bucket == "listing-images"
    assert media_asset.mime_type == "image/jpeg"
    assert media_asset.file_size == len(b"fake-image-bytes")


def test_real_image_upload_rejects_unsupported_file(client) -> None:
    listing = create_listing(client)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
        headers=AUTH_HEADERS,
        files={"file": ("notes.txt", b"not-image", "text/plain")},
        data={"sort_order": "0", "is_primary": "true"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only jpg, jpeg, png, and webp images are allowed."


def test_real_image_upload_falls_back_to_local_storage_in_development(client, monkeypatch) -> None:
    listing = create_listing(client)

    async def fake_upload_listing_image_to_supabase(*, storage_path, content, mime_type, settings):
        raise storage_module.ExternalProviderError("Supabase Storage upload failed with status 400: Bucket not found")

    monkeypatch.setattr(storage_module, "upload_listing_image_to_supabase", fake_upload_listing_image_to_supabase)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
        headers=AUTH_HEADERS,
        files={"file": ("book.jpg", b"fake-image-bytes", "image/jpeg")},
        data={"sort_order": "0", "is_primary": "true"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["storage_path"].startswith(f"listings/{listing['id']}/")
    assert body["public_url"].startswith("http://testserver/uploads/listings/")
    assert body["is_primary"] is True


def test_sell_agent_draft_uploads_images_and_calls_glm(client, monkeypatch) -> None:
    recorded_payload: dict = {}

    async def fake_upload_listing_image_to_supabase(*, storage_path, content, mime_type, settings):
        return SupabaseStoredFile(
            storage_bucket=settings.supabase_storage_bucket,
            storage_path=storage_path,
            public_url=f"https://project-ref.supabase.co/storage/v1/object/public/{settings.supabase_storage_bucket}/{storage_path}",
            mime_type=mime_type,
            file_size=len(content),
        )

    class FakeSellAgentClient:
        model_name = "glm-test"

        def generate_sell_listing_draft(self, payload):
            recorded_payload.update(payload)
            return {
                "assistant_message": "Draft ready for seller review.",
                "missing_fields": [],
                "listing_payload": {
                    "title": "Database Systems Textbook",
                    "description": "Selling Database Systems textbook in good condition. Usage: 2 years.",
                    "category": "textbooks",
                    "item_name": "Database Systems textbook",
                    "brand": "Pearson",
                    "model": "7th edition",
                    "condition_label": "good",
                    "price": 42,
                    "currency": "MYR",
                    "pickup_area": "FSKTM",
                    "residential_college": "KK12",
                },
                "pricing": {
                    "suggested_listing_price": 42,
                    "minimum_acceptable_price": 34,
                    "sell_fast_price": 38,
                    "fair_price_range": {"low": 36, "high": 48},
                    "risk_level": "low",
                },
                "why": {
                    "similar_item_pattern": "Similar textbooks sell around RM36-RM48.",
                    "condition_estimate": "Image and notes indicate good condition.",
                    "local_demand_context": "FSKTM pickup fits nearby student demand.",
                    "price_competitiveness": "Fair for a quick sale.",
                    "evidence": ["Public image URL supplied."],
                },
                "expected_outcome": {
                    "expected_time_to_sell": "3-5 days",
                    "expected_buyer_interest": "moderate",
                    "confidence_level": "high",
                    "confidence_factors": ["Photo and condition notes supplied."],
                },
                "action": {
                    "action_type": "list_now",
                    "action_reason": "The listing is complete enough to publish.",
                    "next_steps": ["Review and publish."],
                },
            }

    monkeypatch.setattr(storage_module, "upload_listing_image_to_supabase", fake_upload_listing_image_to_supabase)
    monkeypatch.setattr(sell_agent_module, "get_glm_client", lambda: FakeSellAgentClient())

    response = client.post(
        "/api/v1/ai/trade/sell-agent/draft",
        headers=AUTH_HEADERS,
        data={
            "seller_context": json.dumps(
                {
                    "product_name": "Database Systems textbook",
                    "category_hint": "textbooks",
                    "condition_notes": "good condition, light highlighting",
                    "pickup_area": "FSKTM",
                    "residential_college": "KK12",
                    "seller_goal": "fair_price",
                }
            )
        },
        files=[("images", ("book.jpg", b"fake-image-bytes", "image/jpeg"))],
    )

    assert response.status_code == 200
    body = response.json()
    assert body["listing_payload"]["title"] == "Database Systems Textbook"
    description = body["listing_payload"]["description"]
    assert not description.lower().startswith("selling ")
    assert "Usage:" not in description
    assert 2 <= len([sentence for sentence in description.split(".") if sentence.strip()]) <= 4
    assert "condition" in description.lower()
    assert body["metadata"]["provider"] == "fakesellagentclient"
    assert body["metadata"]["analysis_mode"] == "multimodal"
    assert body["metadata"]["image_analysis_skipped"] is False
    assert body["uploaded_images"][0]["storage_path"].startswith(f"listing-drafts/{body['draft_id']}/")
    assert body["uploaded_images"][0]["public_url"].startswith("https://project-ref.supabase.co/storage/v1/object/public/listing-images/")
    assert [option["type"] for option in body["price_options"]] == ["sell_fast", "fair_price", "maximize_revenue"]
    assert all(option["price"] > 0 for option in body["price_options"])
    assert body["confidence_breakdown"]["price_confidence"]["level"] in {"low", "medium", "high"}
    assert body["field_explanations"]["price"]
    assert recorded_payload["draft_image_references"][0]["public_url"] == body["uploaded_images"][0]["public_url"]


def test_sell_agent_draft_rejects_unsupported_image(client) -> None:
    response = client.post(
        "/api/v1/ai/trade/sell-agent/draft",
        headers=AUTH_HEADERS,
        data={"seller_context": json.dumps({"product_name": "Desk lamp"})},
        files=[("images", ("notes.txt", b"not-image", "text/plain"))],
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Only jpg, jpeg, png, and webp images are allowed."


def test_sell_agent_publish_creates_listing_images_and_enrichment(client, db_session) -> None:
    payload = {
        "draft_id": str(uuid4()),
        "listing_payload": {
            "title": "AI drafted kettle listing",
            "description": "Compact kettle in good condition. Pickup at KK.",
            "category": "small_appliances",
            "item_name": "electric kettle",
            "brand": "Philips",
            "model": "1L",
            "condition_label": "good",
            "price": 35,
            "currency": "MYR",
            "pickup_area": "KK",
            "residential_college": "KK12",
        },
        "uploaded_images": [
            {
                "storage_bucket": "listing-images",
                "storage_path": "listing-drafts/draft-1/kettle.jpg",
                "public_url": "https://project-ref.supabase.co/storage/v1/object/public/listing-images/listing-drafts/draft-1/kettle.jpg",
                "mime_type": "image/jpeg",
                "file_size": 123,
                "content_hash": "abc123",
                "sort_order": 0,
                "is_primary": True,
            }
        ],
    }

    response = client.post("/api/v1/ai/trade/sell-agent/publish", headers=AUTH_HEADERS, json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body["listing"]["title"] == "AI drafted kettle listing"
    assert body["listing"]["images"][0]["storage_path"] == "listing-drafts/draft-1/kettle.jpg"
    assert body["uploaded_images"][0]["is_primary"] is True
    assert body["enrichment"]["status"] == "accepted"
    assert db_session.query(MediaAsset).filter(MediaAsset.entity_id == body["listing"]["id"]).count() == 1


def test_sell_agent_publish_requires_auth(client) -> None:
    response = client.post(
        "/api/v1/ai/trade/sell-agent/publish",
        json={
            "listing_payload": {
                "title": "Unauthenticated listing",
                "category": "electronics",
                "price": 50,
                "currency": "MYR",
            },
            "uploaded_images": [],
        },
    )

    assert response.status_code == 401


def test_glm_provider_abstraction_with_mocked_response() -> None:
    fallback = {
        "recommendation": {
            "suggested_listing_price": 50,
            "minimum_acceptable_price": 40,
            "fair_price_range": {"low": 45, "high": 60},
            "risk_level": "low",
            "best_match_candidates": [],
        },
        "why": {
            "similar_item_pattern": "Comparable campus sales support this price.",
            "condition_estimate": "Good condition.",
            "local_demand_context": "One wanted post exists.",
            "price_competitiveness": "Fair.",
        },
        "expected_outcome": {
            "expected_time_to_sell": "1-3 days",
            "expected_buyer_interest": "high",
            "confidence_level": "high",
        },
        "action": {"action_type": "list_now", "action_reason": "Ready."},
    }

    result = DemoGLMClient().generate_trade_decision(
        {
            "fallback_result": fallback,
            "image_references": [{"public_url": "http://test/image.jpg"}],
            "comparable_sales": [{"sold_price": 52}],
            "candidate_wanted_posts": [{"title": "Need calculator"}],
        }
    )

    assert result["recommendation"]["suggested_listing_price"] == 50
    assert "Demo GLM reviewed 1 uploaded image" in result["why"]["condition_estimate"]


def test_pricing_logic_uses_historical_sales(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    add_image(client, listing["id"])

    result = enrich_and_fetch_result(client, listing["id"])

    assert 45 <= result["recommendation"]["suggested_listing_price"] <= 70
    assert result["recommendation"]["fair_price_range"]["low"] > 0
    assert "campus comparable" in result["why"]["similar_item_pattern"] or "historical" in result["why"]["similar_item_pattern"]


def test_suspicious_price_risk_classification(client, db_session) -> None:
    seed_historical_sales(db_session, item_name="phone", category="electronics")
    listing = create_listing(
        client,
        {
            "title": "Too cheap iPhone, urgent cash",
            "description": "No receipt, password locked, bank transfer only before meet. Too good deal.",
            "category": "electronics",
            "item_name": "phone",
            "brand": "Apple",
            "model": "iPhone",
            "condition_label": "unknown",
            "price": 80.0,
            "pickup_area": "other",
        },
    )
    db_session.add(ListingReport(listing_id=listing["id"], report_type="suspicious_payment", reason="Seed test report"))
    db_session.commit()

    result = enrich_and_fetch_result(client, listing["id"])

    assert result["recommendation"]["risk_level"] == "high"
    assert result["action"]["action_type"] == "flag_for_review"


def test_match_scoring_uses_budget_and_location(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    add_image(client, listing["id"])
    wanted_post = create_wanted_post(client)

    enrich_and_fetch_result(client, listing["id"])
    response = client.get(f"/api/v1/listings/{listing['id']}/matches")

    assert response.status_code == 200
    matches = response.json()
    assert len(matches) >= 1
    assert matches[0]["wanted_post_id"] == wanted_post["id"]
    assert matches[0]["match_score"] >= 80
    assert "Price fit:" in matches[0]["explanation"]
    assert "Location fit:" in matches[0]["explanation"]


def test_wanted_post_recommendations_rank_strong_listing(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    add_image(client, listing["id"])
    wanted_post = create_wanted_post(client)

    response = client.get(f"/api/v1/wanted-posts/{wanted_post['id']}/recommended-listings")

    assert response.status_code == 200
    recommendations = response.json()
    assert recommendations
    assert recommendations[0]["listing"]["id"] == listing["id"]
    assert recommendations[0]["match_score"] >= 80
    assert recommendations[0]["recommended_action"] == "contact_seller"
    assert "risk" in recommendations[0]["risk_note"].lower()


def test_async_enrich_listing_flow_returns_accepted(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)

    response = client.post(f"/api/v1/ai/trade/enrich-listing/{listing['id']}", headers=AUTH_HEADERS)

    assert response.status_code == 202
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["agent_run_id"]
    assert body["status"] == "accepted"


def test_provider_status_returns_configured_state(client) -> None:
    response = client.get("/api/v1/ai/trade/provider-status")

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "demo"
    assert body["status"] == "demo"
    assert body["fallback_mode"] == "deterministic-campus-pricing-v1"


def test_enrich_listing_for_other_user_forbidden(client, db_session, token_verifier) -> None:
    listing = create_listing(client)
    token_verifier.claims = token_verifier.claims.model_copy(
        update={"sub": uuid4(), "email": "other@siswa.um.edu.my"}
    )

    response = client.post(f"/api/v1/ai/trade/enrich-listing/{listing['id']}", headers=AUTH_HEADERS)

    assert response.status_code == 403


def test_authenticated_trade_flow_apply_contact_and_complete(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    add_image(client, listing["id"])
    create_wanted_post(client)
    result = enrich_and_fetch_result(client, listing["id"])

    apply_response = client.post(
        f"/api/v1/listings/{listing['id']}/apply-recommended-price",
        headers=AUTH_HEADERS,
    )
    assert apply_response.status_code == 200
    assert apply_response.json()["accepted_recommended_price"] == result["recommendation"]["suggested_listing_price"]

    matches_response = client.get(f"/api/v1/listings/{listing['id']}/matches")
    match_id = matches_response.json()[0]["id"]
    contact_response = client.post(
        f"/api/v1/matches/{match_id}/contact",
        headers=AUTH_HEADERS,
        json={"message": "Can we meet at FSKTM today?"},
    )
    assert contact_response.status_code == 200
    transaction = contact_response.json()
    assert transaction["status"] == "contacted"

    complete_response = client.patch(
        f"/api/v1/trade-transactions/{transaction['id']}",
        headers=AUTH_HEADERS,
        json={
            "status": "completed",
            "agreed_price": result["recommendation"]["suggested_listing_price"],
            "followed_ai_recommendation": True,
        },
    )

    assert complete_response.status_code == 200
    assert complete_response.json()["completed_at"] is not None
    assert db_session.query(HistoricalSale).filter(HistoricalSale.source_type == "transaction").count() == 1


def test_completed_transaction_requires_outcome_fields(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    add_image(client, listing["id"])
    create_wanted_post(client)
    enrich_and_fetch_result(client, listing["id"])
    matches_response = client.get(f"/api/v1/listings/{listing['id']}/matches")
    match_id = matches_response.json()[0]["id"]
    contact_response = client.post(
        f"/api/v1/matches/{match_id}/contact",
        headers=AUTH_HEADERS,
        json={"message": "Can we meet at FSKTM today?"},
    )
    transaction = contact_response.json()

    response = client.patch(
        f"/api/v1/trade-transactions/{transaction['id']}",
        headers=AUTH_HEADERS,
        json={"status": "completed"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Completed transactions require agreed_price."


def test_decision_feedback_records_changed_price(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    enrich_and_fetch_result(client, listing["id"])

    response = client.post(
        f"/api/v1/listings/{listing['id']}/decision-feedback",
        headers=AUTH_HEADERS,
        json={
            "feedback_type": "changed_price",
            "applied_price": 49,
            "reason": "Seller chose a faster-sale price.",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["feedback_type"] == "changed_price"
    assert body["applied_price"] == 49
    updated = client.get(f"/api/v1/listings/{listing['id']}").json()
    assert updated["price"] == 49


def test_price_simulation_returns_tradeoff_output(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)

    response = client.post(
        f"/api/v1/ai/trade/price-simulation/{listing['id']}",
        json={"proposed_price": 95},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["proposed_price"] == 95
    assert body["expected_time_to_sell"]
    assert body["action_type"] in {
        "list_now",
        "revise_price",
        "upload_better_image",
        "match_with_buyers",
        "flag_for_review",
    }


def test_report_submission_and_moderation_review(client, db_session, token_verifier) -> None:
    listing = create_listing(client)

    report_response = client.post(
        f"/api/v1/listings/{listing['id']}/reports",
        headers=AUTH_HEADERS,
        json={"report_type": "suspicious_payment", "reason": "Seller asks for payment before meetup."},
    )
    assert report_response.status_code == 201

    forbidden_response = client.get("/api/v1/moderation/listings", headers=AUTH_HEADERS)
    assert forbidden_response.status_code == 403

    profile = db_session.scalar(select(Profile).where(Profile.user_id == str(token_verifier.claims.sub)))
    profile.app_role = AppRole.MODERATOR
    db_session.add(profile)
    db_session.commit()

    queue_response = client.get("/api/v1/moderation/listings", headers=AUTH_HEADERS)
    assert queue_response.status_code == 200
    assert any(item["listing"]["id"] == listing["id"] for item in queue_response.json())

    review_response = client.patch(
        f"/api/v1/moderation/listings/{listing['id']}/review",
        headers=AUTH_HEADERS,
        json={"status": "resolved", "moderation_status": "approved", "resolution": "Seller verified."},
    )

    assert review_response.status_code == 200
    assert review_response.json()["moderation_status"] == "approved"


def test_trade_dashboard_returns_owned_state(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    create_wanted_post(client)
    enrich_and_fetch_result(client, listing["id"])

    response = client.get("/api/v1/users/me/trade-dashboard", headers=AUTH_HEADERS)

    assert response.status_code == 200
    body = response.json()
    assert len(body["listings"]) == 1
    assert len(body["wanted_posts"]) == 1
    assert body["matches"]
    assert "metrics" in body


def test_fetch_trade_result_pending_vs_completed(client, db_session) -> None:
    listing = create_listing(client)
    pending = create_pending_trade_intelligence_run(db_session, listing["id"])

    pending_response = client.get(f"/api/v1/ai/trade/result/{listing['id']}")
    assert pending_response.status_code == 200
    assert pending_response.json()["status"] == "pending"
    assert pending_response.json()["agent_run_id"] == pending.agent_run_id
    assert pending_response.json()["last_run_id"] == pending.agent_run_id

    seed_historical_sales(db_session)
    result = enrich_and_fetch_result(client, listing["id"])
    assert result["why"]["condition_estimate"]


def test_result_retrieval_includes_metadata_after_completion(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)

    enrich_and_fetch_result(client, listing["id"])
    response = client.get(f"/api/v1/ai/trade/result/{listing['id']}")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "completed"
    assert body["last_run_id"]
    assert body["updated_at"]


def test_fetch_match_suggestions(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)
    wanted_post = create_wanted_post(client)

    enrich_and_fetch_result(client, listing["id"])
    response = client.get(f"/api/v1/listings/{listing['id']}/matches")

    assert response.status_code == 200
    matches = response.json()
    assert len(matches) >= 1
    assert matches[0]["wanted_post_id"] == wanted_post["id"]
    assert matches[0]["wanted_post"]["title"] == wanted_post["title"]


def test_pgvector_retrieval_helper_with_mocked_embedding(client, db_session) -> None:
    listing = create_listing(client)
    create_wanted_post(client)
    source_text = "scientific calculator Casio exams FSKTM"
    db_session.add(
        ListingEmbedding(
            listing_id=listing["id"],
            source_text=source_text,
            model_name="demo-hash-embedding-1536",
            embedding=make_demo_embedding_text(source_text),
        )
    )
    db_session.commit()

    from app.models import Listing

    listing_model = db_session.get(Listing, listing["id"])
    examples = retrieve_similar_examples(db_session, listing_model)

    assert examples
    assert examples[0]["entity_type"] in {"wanted_post", "historical_sale"}


def test_evaluation_runner_output(client, db_session) -> None:
    for item_name, category, condition, price in [
        ("scientific calculator", "electronics", "good", 52),
        ("phone", "electronics", "good", 520),
        ("mini fridge", "small_appliances", "fair", 150),
    ]:
        db_session.add(
            HistoricalSale(
                item_name=item_name,
                category=category,
                condition_label=condition,
                sold_price=price,
            )
        )
    db_session.commit()

    response = client.post("/api/v1/ai/trade/evaluate")

    assert response.status_code == 200
    body = response.json()
    assert body["case_count"] >= 3
    assert "average_pricing_error" in body
    assert "risk_agreement_rate" in body


def test_seed_demo_scenarios_are_competition_ready() -> None:
    suspicious = [item for item in LISTINGS if item.get("reports")]
    no_image = [item for item in LISTINGS if item.get("image") is None and not item.get("reports")]
    overpriced = [item for item in LISTINGS if item["title"].lower().startswith("overpriced")]
    same_kk_wanted = [item for item in WANTED_POSTS if item.get("preferred_pickup_area") == "KK"]

    assert len(HISTORICAL_SALES) >= 20
    assert len(WANTED_POSTS) >= 12
    assert len(LISTINGS) >= 12
    assert len(suspicious) >= 5
    assert len(overpriced) >= 3
    assert len(no_image) >= 2
    assert len(same_kk_wanted) >= 3
