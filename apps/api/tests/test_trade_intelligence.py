from app.integrations.glm_client import DemoGLMClient
from app.models import HistoricalSale, ListingEmbedding, ListingReport, MediaAsset
from app.services.embedding_service import make_demo_embedding_text
from app.services.trade_intelligence_glm_service import retrieve_similar_examples
from app.services.trade_intelligence import create_pending_trade_intelligence_run
from scripts.seed_trade_demo import HISTORICAL_SALES, LISTINGS, WANTED_POSTS


AUTHLESS_HEADERS: dict[str, str] = {}


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
    response = client.post("/api/v1/listings", json=payload or listing_payload(), headers=AUTHLESS_HEADERS)
    assert response.status_code == 201
    return response.json()


def create_wanted_post(client, payload: dict | None = None) -> dict:
    response = client.post("/api/v1/wanted-posts", json=payload or wanted_post_payload(), headers=AUTHLESS_HEADERS)
    assert response.status_code == 201
    return response.json()


def add_image(client, listing_id: str) -> None:
    response = client.post(
        f"/api/v1/listings/{listing_id}/images",
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
    response = client.post(f"/api/v1/ai/trade/enrich-listing/{listing_id}")
    assert response.status_code == 202
    accepted = response.json()
    assert accepted["status"] == "accepted"

    result_response = client.get(f"/api/v1/ai/trade/result/{listing_id}")
    assert result_response.status_code == 200
    body = result_response.json()
    assert body["status"] == "completed"
    assert body["result"] is not None
    return body["result"]


def test_create_listing_without_auth(client) -> None:
    listing = create_listing(client)

    assert listing["title"] == "Casio FX-570EX calculator"
    assert listing["seller_id"] == "00000000-0000-4000-8000-000000000001"
    assert listing["is_ai_enriched"] is False


def test_create_wanted_post_without_auth(client) -> None:
    wanted_post = create_wanted_post(client)

    assert wanted_post["title"] == "Looking for Casio calculator near FSKTM"
    assert wanted_post["buyer_id"] == "00000000-0000-4000-8000-000000000001"


def test_upload_listing_image_metadata(client) -> None:
    listing = create_listing(client)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
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


def test_real_image_upload_persists_listing_image_and_media_asset(client, db_session) -> None:
    listing = create_listing(client)

    response = client.post(
        f"/api/v1/listings/{listing['id']}/images",
        files={"file": ("rice-cooker.jpg", b"fake-image-bytes", "image/jpeg")},
        data={"sort_order": "0", "is_primary": "true"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["public_url"].startswith("http://testserver/uploads/")
    assert body["is_primary"] is True

    media_asset = db_session.query(MediaAsset).filter(MediaAsset.entity_id == listing["id"]).one()
    assert media_asset.mime_type == "image/jpeg"
    assert media_asset.file_size == len(b"fake-image-bytes")


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


def test_async_enrich_listing_flow_returns_accepted(client, db_session) -> None:
    seed_historical_sales(db_session)
    listing = create_listing(client)

    response = client.post(f"/api/v1/ai/trade/enrich-listing/{listing['id']}")

    assert response.status_code == 202
    body = response.json()
    assert body["listing_id"] == listing["id"]
    assert body["agent_run_id"]
    assert body["status"] == "accepted"


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
