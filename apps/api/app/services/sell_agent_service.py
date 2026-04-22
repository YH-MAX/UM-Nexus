from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime
from decimal import Decimal
import json
from typing import Any
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.glm_client import GLMProviderError, collect_public_image_urls, get_glm_client
from app.models import ListingImage, User
from app.repositories.trade import TradeRepository
from app.schemas.listing import ListingCreate, ListingImageRead, ListingRead
from app.schemas.sell_agent import (
    SellAgentConfidenceItem,
    SellAgentDraftResponse,
    SellAgentMetadata,
    SellAgentPricing,
    SellAgentPriceOption,
    SellAgentPublishRequest,
    SellAgentPublishResponse,
    SellAgentSellerContext,
    SellAgentUploadedImage,
)
from app.schemas.trade_intelligence import (
    EnrichListingAccepted,
    PriceRangeBlock,
    TradeAction,
    TradeExpectedOutcome,
    TradeWhy,
)
from app.services.storage_service import store_draft_image_upload
from app.services.trade_intelligence import create_pending_trade_intelligence_run
from app.services.trade_service import create_listing
from app.tasks.trade_tasks import compute_trade_intelligence_task
from app.trade.constants import PICKUP_AREAS, RISK_LEVELS, TRADE_ACTION_TYPES, TRADE_CATEGORIES


SELL_AGENT_PROMPT = """\
You are the UM Nexus Sell Agent, a Z.AI GLM-powered campus resale assistant for University of Malaya students.

Create a seller-approved listing draft from uploaded public HTTPS image URLs and seller clues.
Infer the item type and likely condition from image + text, then recommend a fair price using campus resale context.

Return only valid JSON. Do not include markdown fences or commentary.

Description requirements for listing_payload.description:
- Write natural, human-like English for a peer-to-peer campus marketplace.
- Make it sound like a real student wrote it, not a professional marketer and not a robot.
- Do not start with robotic phrases like "Selling..." and do not use field labels like "Usage:" or "Notes:".
- Do not just repeat fields; turn the facts into 2-4 smooth sentences.
- Mention condition clearly and honestly.
- Include 1-2 buyer-relevant details such as course usefulness, daily use, hostel use, included accessories, or pickup convenience when supported by the clues.
- Avoid hype, marketing buzzwords, emojis, and hallucinated features.

Use only these category values: textbooks, electronics, small_appliances, dorm_essentials.
Use only these pickup_area values when known: KK, FSKTM, library, faculty_pickup, other.
Use only these seller action types: list_now, revise_price, upload_better_image, match_with_buyers, flag_for_review.
Use only these risk levels: low, medium, high.

Return this shape:
{
  "assistant_message": "short seller-facing summary",
  "missing_fields": ["field names that would improve confidence"],
  "listing_payload": {
    "title": "clear listing title",
    "description": "buyer-friendly description",
    "category": "textbooks | electronics | small_appliances | dorm_essentials",
    "item_name": "specific item name",
    "brand": "brand if known or null",
    "model": "model if known or null",
    "condition_label": "short condition label",
    "price": number,
    "currency": "MYR",
    "pickup_area": "KK | FSKTM | library | faculty_pickup | other | null",
    "residential_college": "college if known or null"
  },
  "pricing": {
    "suggested_listing_price": number,
    "minimum_acceptable_price": number,
    "sell_fast_price": number,
    "fair_price_range": {"low": number, "high": number},
    "risk_level": "low | medium | high"
  },
  "price_options": [
    {
      "type": "sell_fast | fair_price | maximize_revenue",
      "price": number,
      "expected_time_to_sell": "short time estimate",
      "buyer_interest": "low | moderate | high",
      "tradeoff_summary": "plain-language trade-off"
    }
  ],
  "confidence_breakdown": {
    "price_confidence": {"level": "low | medium | high", "reason": "why"},
    "condition_confidence": {"level": "low | medium | high", "reason": "why"},
    "demand_confidence": {"level": "low | medium | high", "reason": "why"},
    "risk_confidence": {"level": "low | medium | high", "reason": "why"}
  },
  "field_explanations": {
    "title": "why this title was chosen",
    "category": "why this category was chosen",
    "condition": "why this condition was chosen",
    "price": "why this price was chosen",
    "risk": "why this risk level was chosen"
  },
  "why": {
    "similar_item_pattern": "campus comparable signal",
    "condition_estimate": "image + text condition reasoning",
    "local_demand_context": "wanted-post and pickup context",
    "price_competitiveness": "price positioning explanation",
    "evidence": ["short evidence bullet"]
  },
  "expected_outcome": {
    "expected_time_to_sell": "short time estimate",
    "expected_buyer_interest": "low | moderate | high",
    "confidence_level": "low | medium | high",
    "confidence_factors": ["short confidence factor"]
  },
  "action": {
    "action_type": "list_now | revise_price | upload_better_image | match_with_buyers | flag_for_review",
    "action_reason": "why this next action is best",
    "next_steps": ["seller next step"]
  }
}

Keep the tone practical and student-friendly. The seller must still review before publication.
"""


async def generate_sell_agent_draft(
    db: Session,
    *,
    seller_context: SellAgentSellerContext,
    image_uploads: list[UploadFile],
    current_user: User,
) -> SellAgentDraftResponse:
    if len(image_uploads) > 4:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at most 4 images.")

    draft_id = str(uuid4())
    uploaded_images: list[SellAgentUploadedImage] = []
    for index, upload in enumerate(image_uploads):
        stored = await store_draft_image_upload(draft_id, upload)
        uploaded_images.append(
            SellAgentUploadedImage(
                storage_bucket=stored.storage_bucket,
                storage_path=stored.storage_path,
                public_url=stored.public_url,
                mime_type=stored.mime_type,
                file_size=stored.file_size,
                content_hash=stored.content_hash,
                sort_order=index,
                is_primary=index == 0,
            )
        )

    repo = TradeRepository(db)
    category = _normalize_category(seller_context.category_hint) or _infer_category(seller_context)
    historical_sales = list(repo.list_historical_sales_for_category(category))
    wanted_posts = list(repo.list_wanted_posts_by_category(category))
    fallback = _fallback_draft(
        draft_id=draft_id,
        seller_context=seller_context,
        uploaded_images=uploaded_images,
        historical_sales=historical_sales,
        wanted_posts=wanted_posts,
    )
    payload = _build_sell_agent_payload(
        seller_context=seller_context,
        uploaded_images=uploaded_images,
        category=category,
        historical_sales=historical_sales,
        wanted_posts=wanted_posts,
        fallback=fallback,
    )

    client = get_glm_client()
    try:
        raw = client.generate_sell_listing_draft(payload)
        normalized = _normalize_draft(raw, fallback)
        normalized["metadata"] = {
            **normalized.get("metadata", {}),
            "provider": _provider_name(client),
            "model": getattr(client, "model_name", None),
            "used_fallback": False,
            "generated_at": datetime.now(UTC).isoformat(),
            "analysis_mode": "multimodal" if collect_public_image_urls([image.model_dump() for image in uploaded_images]) else "text_only",
            "image_analysis_skipped": not bool(collect_public_image_urls([image.model_dump() for image in uploaded_images])),
            "data_source": "sell_agent_glm_draft",
        }
    except (GLMProviderError, TypeError, ValueError, ValidationError) as exc:
        normalized = deepcopy(fallback)
        normalized["assistant_message"] = (
            "I drafted this with campus resale heuristics because the GLM provider was unavailable. "
            "Please review the price and description before publishing."
        )
        normalized["metadata"] = {
            **normalized.get("metadata", {}),
            "provider": "heuristic",
            "model": "deterministic-sell-agent-v1",
            "used_fallback": True,
            "generated_at": datetime.now(UTC).isoformat(),
            "analysis_mode": "deterministic_fallback",
            "image_analysis_skipped": True,
            "data_source": "sell_agent_fallback_draft",
            "provider_error": str(exc),
        }

    normalized["draft_id"] = draft_id
    normalized["uploaded_images"] = [image.model_dump(mode="json") for image in uploaded_images]
    return SellAgentDraftResponse.model_validate(normalized)


def publish_sell_agent_draft(
    db: Session,
    *,
    payload: SellAgentPublishRequest,
    current_user: User,
) -> SellAgentPublishResponse:
    listing = create_listing(db, payload.listing_payload, current_user)
    repo = TradeRepository(db)
    created_images: list[ListingImage] = []
    for index, image in enumerate(payload.uploaded_images[:4]):
        repo.create_media_asset(
            {
                "owner_user_id": current_user.id,
                "entity_type": "listing",
                "entity_id": listing.id,
                "storage_bucket": image.storage_bucket,
                "storage_path": image.storage_path,
                "public_url": image.public_url,
                "mime_type": image.mime_type,
                "file_size": image.file_size,
            }
        )
        created_images.append(
            repo.add_listing_image(
                listing.id,
                {
                    "storage_path": image.storage_path,
                    "public_url": image.public_url,
                    "sort_order": image.sort_order if image.sort_order is not None else index,
                    "is_primary": image.is_primary or index == 0,
                    "content_hash": image.content_hash,
                },
            )
        )

    accepted = create_pending_trade_intelligence_run(db, listing.id, current_user)
    try:
        compute_trade_intelligence_task.delay(accepted.listing_id, accepted.agent_run_id)
    except Exception:
        pass

    db.expire_all()
    refreshed = repo.get_listing_or_none(listing.id) or listing
    return SellAgentPublishResponse(
        listing=ListingRead.model_validate(refreshed),
        uploaded_images=[ListingImageRead.model_validate(image) for image in created_images],
        enrichment=EnrichListingAccepted.model_validate(accepted),
        result_status="accepted",
    )


def _build_sell_agent_payload(
    *,
    seller_context: SellAgentSellerContext,
    uploaded_images: list[SellAgentUploadedImage],
    category: str,
    historical_sales: list[Any],
    wanted_posts: list[Any],
    fallback: dict[str, Any],
) -> dict[str, Any]:
    public_images = collect_public_image_urls([image.model_dump() for image in uploaded_images])
    context = {
        "seller_context": seller_context.model_dump(mode="json"),
        "draft_image_references": [image.model_dump(mode="json") for image in uploaded_images],
        "image_analysis": {
            "mode": "multimodal" if public_images else "text_only",
            "valid_public_image_count": len(public_images),
            "note": "Public HTTPS image URLs are available." if public_images else "No public image URL is available.",
        },
        "category_hint": category,
        "allowed_categories": list(TRADE_CATEGORIES),
        "allowed_pickup_areas": list(PICKUP_AREAS),
        "historical_comparable_sales": [
            {
                "item_name": sale.item_name,
                "category": sale.category,
                "condition_label": sale.condition_label,
                "sold_price": float(sale.sold_price),
                "location": sale.location,
                "residential_college": sale.residential_college,
            }
            for sale in historical_sales[:10]
        ],
        "candidate_wanted_posts": [
            {
                "title": wanted.title,
                "description": wanted.description,
                "category": wanted.category,
                "desired_item_name": wanted.desired_item_name,
                "max_budget": float(wanted.max_budget) if wanted.max_budget else None,
                "preferred_pickup_area": wanted.preferred_pickup_area,
                "residential_college": wanted.residential_college,
            }
            for wanted in wanted_posts[:10]
        ],
        "fallback_draft": fallback,
    }
    return {
        **context,
        "prompt": f"{SELL_AGENT_PROMPT}\n\nContext JSON:\n{json.dumps(context, default=str)}",
    }


def _fallback_draft(
    *,
    draft_id: str,
    seller_context: SellAgentSellerContext,
    uploaded_images: list[SellAgentUploadedImage],
    historical_sales: list[Any],
    wanted_posts: list[Any],
) -> dict[str, Any]:
    category = _normalize_category(seller_context.category_hint) or _infer_category(seller_context)
    item_name = _first_text(seller_context.product_name, seller_context.free_text, _category_label(category))
    title = _title_from_context(item_name, seller_context)
    condition_label = _condition_from_context(seller_context)
    pickup_area = _normalize_pickup_area(seller_context.pickup_area)
    base_price = _base_price(category, historical_sales)
    if seller_context.seller_goal == "sell_fast":
        suggested = base_price * 0.92
    elif seller_context.seller_goal == "maximize_revenue":
        suggested = base_price * 1.12
    else:
        suggested = base_price
    suggested = round(max(suggested, 5), 2)
    minimum = round(max(suggested * 0.78, 3), 2)
    sell_fast = round(max(minimum, suggested * 0.9), 2)
    fair_range = {"low": round(suggested * 0.88, 2), "high": round(suggested * 1.12, 2)}
    description = _description_from_context(item_name, condition_label, category, seller_context)
    public_images = collect_public_image_urls([image.model_dump() for image in uploaded_images])
    missing = _missing_fields(seller_context, uploaded_images)
    buyer_interest = "high" if wanted_posts else "moderate"
    risk_level = "low" if uploaded_images and seller_context.condition_notes else "medium"
    return {
        "draft_id": draft_id,
        "assistant_message": "I prepared a seller-approved draft using your clues and campus resale signals.",
        "missing_fields": missing,
        "uploaded_images": [image.model_dump(mode="json") for image in uploaded_images],
        "listing_payload": {
            "title": title,
            "description": description,
            "category": category,
            "item_name": item_name,
            "brand": _brand_from_context(seller_context),
            "model": _model_from_context(seller_context),
            "condition_label": condition_label,
            "price": suggested,
            "currency": "MYR",
            "pickup_area": pickup_area,
            "residential_college": seller_context.residential_college or None,
        },
        "pricing": {
            "suggested_listing_price": suggested,
            "minimum_acceptable_price": minimum,
            "sell_fast_price": sell_fast,
            "fair_price_range": fair_range,
            "risk_level": risk_level,
        },
        "price_options": _price_options(suggested, minimum, buyer_interest),
        "confidence_breakdown": _confidence_breakdown(
            seller_context=seller_context,
            uploaded_images=uploaded_images,
            historical_sales=historical_sales,
            wanted_posts=wanted_posts,
            missing_fields=missing,
            risk_level=risk_level,
        ),
        "field_explanations": _field_explanations(
            category=category,
            condition_label=condition_label,
            suggested_price=suggested,
            risk_level=risk_level,
            historical_sales=historical_sales,
            uploaded_images=uploaded_images,
            seller_context=seller_context,
        ),
        "why": {
            "similar_item_pattern": _comparable_summary(category, historical_sales),
            "condition_estimate": (
                f"Condition is estimated as {condition_label} from seller notes"
                + (" and uploaded image references." if public_images else ".")
            ),
            "local_demand_context": (
                f"{len(wanted_posts)} active wanted post(s) in this category can support matching."
                if wanted_posts
                else "No strong wanted-post demand is available yet, so pricing should stay fair."
            ),
            "price_competitiveness": "The draft price is positioned for the seller goal while keeping room for negotiation.",
            "evidence": [
                f"Seller goal: {seller_context.seller_goal.replace('_', ' ')}.",
                f"Draft image count: {len(uploaded_images)}.",
            ],
        },
        "expected_outcome": {
            "expected_time_to_sell": "1-3 days" if seller_context.seller_goal == "sell_fast" else "3-7 days",
            "expected_buyer_interest": buyer_interest,
            "confidence_level": "high" if not missing else "medium",
            "confidence_factors": [
                "More complete seller clues improve pricing confidence.",
                "Public images improve condition confidence." if public_images else "No public image was available for condition analysis.",
            ],
        },
        "action": {
            "action_type": "list_now" if not missing else "upload_better_image" if "photo" in missing else "revise_price",
            "action_reason": "Review the AI draft, then publish when the price and details look right.",
            "next_steps": ["Check the draft title and price.", "Publish after seller approval."],
        },
        "metadata": {
            "provider": "heuristic",
            "model": "deterministic-sell-agent-v1",
            "used_fallback": False,
            "generated_at": datetime.now(UTC).isoformat(),
            "analysis_mode": "multimodal" if public_images else "text_only",
            "image_analysis_skipped": not bool(public_images),
            "data_source": "sell_agent_fallback_seed",
        },
    }


def _normalize_draft(raw: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("Sell agent result must be a JSON object.")
    merged = deepcopy(fallback)
    for key in (
        "assistant_message",
        "missing_fields",
        "listing_payload",
        "pricing",
        "price_options",
        "confidence_breakdown",
        "field_explanations",
        "why",
        "expected_outcome",
        "action",
    ):
        if raw.get(key) is not None:
            merged[key] = raw[key]

    listing = merged.get("listing_payload") or {}
    pricing = merged.get("pricing") or {}
    suggested = _coerce_number(pricing.get("suggested_listing_price") or listing.get("price"), fallback["pricing"]["suggested_listing_price"])
    minimum = _coerce_number(pricing.get("minimum_acceptable_price"), max(suggested * 0.78, 3))
    sell_fast = _coerce_number(pricing.get("sell_fast_price"), max(minimum, suggested * 0.9))
    fair_range = pricing.get("fair_price_range") if isinstance(pricing.get("fair_price_range"), dict) else {}
    normalized_listing = {
        **fallback["listing_payload"],
        **{key: value for key, value in listing.items() if value is not None},
        "category": _normalize_category(listing.get("category")) or fallback["listing_payload"]["category"],
        "pickup_area": _normalize_pickup_area(listing.get("pickup_area")) or fallback["listing_payload"].get("pickup_area"),
        "price": suggested,
        "currency": "MYR",
    }
    normalized_listing["title"] = str(normalized_listing.get("title") or fallback["listing_payload"]["title"])[:255]
    normalized_listing["description"] = _normalize_description(
        normalized_listing.get("description"),
        fallback["listing_payload"]["description"],
    )
    merged["listing_payload"] = ListingCreate.model_validate(normalized_listing).model_dump(mode="json")
    merged["pricing"] = SellAgentPricing(
        suggested_listing_price=suggested,
        minimum_acceptable_price=minimum,
        sell_fast_price=sell_fast,
        fair_price_range=PriceRangeBlock(
            low=_coerce_number(fair_range.get("low"), round(suggested * 0.88, 2)),
            high=_coerce_number(fair_range.get("high"), round(suggested * 1.12, 2)),
        ),
        risk_level=_normalize_choice(pricing.get("risk_level"), RISK_LEVELS, fallback["pricing"]["risk_level"]),
    ).model_dump(mode="json")
    merged["price_options"] = _normalize_price_options(
        merged.get("price_options"),
        fallback.get("price_options"),
        suggested=suggested,
        minimum=minimum,
    )
    merged["confidence_breakdown"] = _normalize_confidence_breakdown(
        merged.get("confidence_breakdown"),
        fallback.get("confidence_breakdown") or {},
    )
    merged["field_explanations"] = _normalize_field_explanations(
        merged.get("field_explanations"),
        fallback.get("field_explanations") or {},
    )
    merged["why"] = TradeWhy.model_validate({**fallback["why"], **(merged.get("why") or {})}).model_dump(mode="json")
    merged["expected_outcome"] = TradeExpectedOutcome.model_validate(
        {**fallback["expected_outcome"], **(merged.get("expected_outcome") or {})}
    ).model_dump(mode="json")
    action = {**fallback["action"], **(merged.get("action") or {})}
    action["action_type"] = _normalize_choice(action.get("action_type"), TRADE_ACTION_TYPES, fallback["action"]["action_type"])
    merged["action"] = TradeAction.model_validate(action).model_dump(mode="json")
    merged["missing_fields"] = [str(field) for field in merged.get("missing_fields") or [] if field]
    merged["assistant_message"] = str(merged.get("assistant_message") or fallback["assistant_message"])
    return merged


def _normalize_category(value: Any) -> str | None:
    normalized = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "book": "textbooks",
        "books": "textbooks",
        "textbook": "textbooks",
        "appliance": "small_appliances",
        "small_appliance": "small_appliances",
        "dorm": "dorm_essentials",
        "furniture": "dorm_essentials",
        "calculator": "electronics",
        "electronic": "electronics",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in TRADE_CATEGORIES else None


def _normalize_pickup_area(value: Any) -> str | None:
    normalized = str(value or "").strip()
    if not normalized:
        return None
    lookup = {area.lower(): area for area in PICKUP_AREAS}
    aliases = {"faculty": "faculty_pickup", "faculty pickup": "faculty_pickup", "kk": "KK"}
    candidate = aliases.get(normalized.lower(), lookup.get(normalized.lower(), normalized))
    return candidate if candidate in PICKUP_AREAS else "other"


def _infer_category(context: SellAgentSellerContext) -> str:
    text = " ".join(
        part.lower()
        for part in [
            context.product_name,
            context.free_text,
            context.brand_model,
            context.accessories,
        ]
        if part
    )
    if any(word in text for word in ("book", "textbook", "course", "database", "calculus")):
        return "textbooks"
    if any(word in text for word in ("rice cooker", "kettle", "fan", "lamp", "blender")):
        return "small_appliances"
    if any(word in text for word in ("mattress", "chair", "desk", "hanger", "basket", "dorm")):
        return "dorm_essentials"
    return "electronics"


def _base_price(category: str, historical_sales: list[Any]) -> float:
    if historical_sales:
        prices = [float(sale.sold_price) for sale in historical_sales if sale.sold_price is not None]
        if prices:
            return round(sum(prices) / len(prices), 2)
    return {"textbooks": 38.0, "electronics": 70.0, "small_appliances": 45.0, "dorm_essentials": 28.0}.get(category, 45.0)


def _missing_fields(context: SellAgentSellerContext, uploaded_images: list[SellAgentUploadedImage]) -> list[str]:
    missing: list[str] = []
    if not uploaded_images:
        missing.append("photo")
    if not context.product_name and not context.free_text:
        missing.append("product_name")
    if not context.condition_notes:
        missing.append("condition")
    if not context.pickup_area:
        missing.append("pickup_area")
    return missing


def _description_from_context(item_name: str, condition_label: str, category: str, context: SellAgentSellerContext) -> str:
    clean_item = _clean_phrase(item_name)
    clean_condition = _clean_phrase(condition_label)
    age_usage = _clean_phrase(context.age_usage)
    defects = _clean_phrase(context.defects)
    accessories = _clean_phrase(context.accessories)
    pickup = _clean_phrase(context.pickup_area or context.residential_college)

    first_sentence = f"{clean_item} is in {clean_condition} condition"
    if age_usage:
        first_sentence += f" and has been used for {age_usage}"
    first_sentence += "."

    sentences = [first_sentence]
    buyer_detail = _buyer_relevant_detail(category, clean_item)
    if buyer_detail:
        sentences.append(buyer_detail)
    if defects:
        sentences.append(f"Please note that {defects}.")
    elif accessories:
        sentences.append(f"It comes with {accessories}.")
    if pickup:
        sentences.append(f"Pickup can be arranged around {pickup}.")
    return " ".join(sentences[:4])


def _buyer_relevant_detail(category: str, item_name: str) -> str:
    lowered = item_name.lower()
    if category == "textbooks":
        if any(word in lowered for word in ("algorithm", "database", "calculus", "accounting", "economics")):
            return "It should be useful for coursework, revision, or anyone taking a related class."
        return "It should be useful for coursework or revision if it matches your syllabus."
    if category == "small_appliances":
        return "It is practical for hostel or room use if you need something for daily routines."
    if category == "dorm_essentials":
        return "It is useful for setting up a hostel room without buying everything new."
    if category == "electronics":
        return "It should be useful for daily campus use if the model fits what you need."
    return ""


def _clean_phrase(value: str | None) -> str:
    return " ".join(str(value or "").strip().strip(".").split())


def _normalize_description(value: Any, fallback: str) -> str:
    description = " ".join(str(value or "").strip().split())
    if not description or _description_needs_repair(description):
        description = fallback
    sentences = _split_sentences(description)
    if len(sentences) < 2:
        fallback_sentences = _split_sentences(fallback)
        for sentence in fallback_sentences:
            if sentence not in sentences:
                sentences.append(sentence)
            if len(sentences) >= 2:
                break
    return " ".join(sentences[:4])


def _description_needs_repair(description: str) -> bool:
    lowered = description.lower()
    robotic_markers = ("selling ", "usage:", "notes:", "included:", "condition:", "description:")
    if lowered.startswith(robotic_markers):
        return True
    return any(marker in lowered for marker in (" usage:", " notes:", " included:", " condition:"))


def _split_sentences(description: str) -> list[str]:
    normalized = " ".join(description.strip().split())
    if not normalized:
        return []
    raw_sentences = normalized.replace("!", ".").replace("?", ".").split(".")
    sentences = [sentence.strip() for sentence in raw_sentences if sentence.strip()]
    return [f"{sentence}." for sentence in sentences]


def _title_from_context(item_name: str, context: SellAgentSellerContext) -> str:
    if context.brand_model and context.brand_model.lower() not in item_name.lower():
        return f"{context.brand_model} {item_name}".strip()[:255]
    return item_name.title()[:255]


def _condition_from_context(context: SellAgentSellerContext) -> str:
    text = (context.condition_notes or context.free_text or "").lower()
    if "new" in text or "unused" in text:
        return "like new"
    if "scratch" in text or "minor" in text or "good" in text:
        return "good"
    if "defect" in text or "broken" in text or "repair" in text:
        return "fair"
    return "good"


def _brand_from_context(context: SellAgentSellerContext) -> str | None:
    if not context.brand_model:
        return None
    return context.brand_model.split()[0][:255]


def _model_from_context(context: SellAgentSellerContext) -> str | None:
    if not context.brand_model:
        return None
    parts = context.brand_model.split(maxsplit=1)
    return parts[1][:255] if len(parts) > 1 else None


def _first_text(*values: str | None) -> str:
    for value in values:
        if value and value.strip():
            return value.strip()
    return "Campus resale item"


def _category_label(category: str) -> str:
    return category.replace("_", " ")


def _comparable_summary(category: str, historical_sales: list[Any]) -> str:
    if not historical_sales:
        return f"No close completed sale was found yet, so the draft uses the campus default for {category.replace('_', ' ')}."
    prices = [float(sale.sold_price) for sale in historical_sales if sale.sold_price is not None]
    return f"{len(prices)} campus comparable sale(s) suggest a range around RM{min(prices):.0f}-RM{max(prices):.0f}."


def _price_options(suggested: float, minimum: float, buyer_interest: str) -> list[dict[str, Any]]:
    sell_fast_price = round(max(minimum, suggested * 0.92), 2)
    fair_price = round(max(suggested, 1), 2)
    max_revenue_price = round(max(suggested * 1.12, suggested + 1), 2)
    return [
        {
            "type": "sell_fast",
            "price": sell_fast_price,
            "expected_time_to_sell": "1-3 days",
            "buyer_interest": "high",
            "tradeoff_summary": "Lower price improves buyer urgency and is best before move-out or exam deadlines.",
        },
        {
            "type": "fair_price",
            "price": fair_price,
            "expected_time_to_sell": "3-7 days",
            "buyer_interest": buyer_interest,
            "tradeoff_summary": "Balanced price keeps the listing fair while preserving room for negotiation.",
        },
        {
            "type": "maximize_revenue",
            "price": max_revenue_price,
            "expected_time_to_sell": "7-14 days",
            "buyer_interest": "moderate",
            "tradeoff_summary": "Higher price may increase seller revenue but can slow matching and negotiation.",
        },
    ]


def _confidence_breakdown(
    *,
    seller_context: SellAgentSellerContext,
    uploaded_images: list[SellAgentUploadedImage],
    historical_sales: list[Any],
    wanted_posts: list[Any],
    missing_fields: list[str],
    risk_level: str,
) -> dict[str, dict[str, str]]:
    has_public_images = bool(collect_public_image_urls([image.model_dump() for image in uploaded_images]))
    price_level = "high" if historical_sales and seller_context.product_name else "medium" if historical_sales else "low"
    condition_level = "high" if has_public_images and seller_context.condition_notes else "medium" if has_public_images or seller_context.condition_notes else "low"
    demand_level = "high" if len(wanted_posts) >= 2 else "medium" if wanted_posts else "low"
    risk_confidence = "high" if has_public_images and not missing_fields else "medium" if risk_level != "high" else "low"
    return {
        "price_confidence": {
            "level": price_level,
            "reason": (
                "Campus comparable sales and item clues support the price."
                if price_level == "high"
                else "The price uses limited comparable evidence and should be reviewed."
            ),
        },
        "condition_confidence": {
            "level": condition_level,
            "reason": (
                "Condition uses both public images and seller notes."
                if condition_level == "high"
                else "More condition detail or clearer photos would improve the estimate."
            ),
        },
        "demand_confidence": {
            "level": demand_level,
            "reason": (
                f"{len(wanted_posts)} active wanted post(s) inform demand."
                if wanted_posts
                else "No active wanted posts were available for this category."
            ),
        },
        "risk_confidence": {
            "level": risk_confidence,
            "reason": (
                "Risk uses image presence, detail completeness, and price position."
                if risk_confidence != "low"
                else "Risk confidence is limited by missing seller evidence."
            ),
        },
    }


def _field_explanations(
    *,
    category: str,
    condition_label: str,
    suggested_price: float,
    risk_level: str,
    historical_sales: list[Any],
    uploaded_images: list[SellAgentUploadedImage],
    seller_context: SellAgentSellerContext,
) -> dict[str, str]:
    return {
        "title": "The title is based on the product name plus brand/model clues when provided.",
        "category": f"The category is set to {category.replace('_', ' ')} from seller clues and item wording.",
        "condition": (
            f"Condition is marked {condition_label} from seller notes"
            + (" and uploaded image evidence." if uploaded_images else ".")
        ),
        "price": (
            f"The RM{suggested_price:.0f} price uses campus comparable sales and the seller goal "
            f"'{seller_context.seller_goal.replace('_', ' ')}'."
            if historical_sales
            else f"The RM{suggested_price:.0f} price uses the campus default for this category because comparables are limited."
        ),
        "risk": f"Risk is {risk_level} based on image availability, listing completeness, and abnormal-price signals.",
    }


def _normalize_price_options(
    raw_options: Any,
    fallback_options: Any,
    *,
    suggested: float,
    minimum: float,
) -> list[dict[str, Any]]:
    option_types = ("sell_fast", "fair_price", "maximize_revenue")
    fallback = fallback_options if isinstance(fallback_options, list) and fallback_options else _price_options(suggested, minimum, "moderate")
    by_type: dict[str, dict[str, Any]] = {
        str(option.get("type")): option
        for option in fallback
        if isinstance(option, dict) and option.get("type") in option_types
    }
    if isinstance(raw_options, list):
        for option in raw_options:
            if isinstance(option, dict) and option.get("type") in option_types:
                by_type[str(option["type"])] = {**by_type.get(str(option["type"]), {}), **option}

    normalized: list[dict[str, Any]] = []
    for fallback_option in fallback:
        option_type = fallback_option.get("type") if isinstance(fallback_option, dict) else None
        if option_type not in option_types:
            continue
        option = by_type.get(str(option_type), fallback_option)
        price = max(_coerce_number(option.get("price"), fallback_option.get("price", suggested)), 1.0)
        normalized.append(
            SellAgentPriceOption(
                type=option_type,
                price=price,
                expected_time_to_sell=str(option.get("expected_time_to_sell") or fallback_option.get("expected_time_to_sell") or "3-7 days"),
                buyer_interest=str(option.get("buyer_interest") or fallback_option.get("buyer_interest") or "moderate"),
                tradeoff_summary=str(option.get("tradeoff_summary") or fallback_option.get("tradeoff_summary") or "Review this trade-off before publishing."),
            ).model_dump(mode="json")
        )
    return normalized


def _normalize_confidence_breakdown(raw: Any, fallback: dict[str, Any]) -> dict[str, dict[str, str]]:
    keys = ("price_confidence", "condition_confidence", "demand_confidence", "risk_confidence")
    raw_dict = raw if isinstance(raw, dict) else {}
    normalized: dict[str, dict[str, str]] = {}
    for key in keys:
        fallback_item = fallback.get(key) if isinstance(fallback.get(key), dict) else {}
        raw_item = raw_dict.get(key) if isinstance(raw_dict.get(key), dict) else {}
        level = _normalize_confidence_level(raw_item.get("level") or fallback_item.get("level"))
        reason = str(raw_item.get("reason") or fallback_item.get("reason") or "Confidence is based on available seller and campus resale evidence.")
        normalized[key] = SellAgentConfidenceItem(level=level, reason=reason).model_dump(mode="json")
    return normalized


def _normalize_field_explanations(raw: Any, fallback: dict[str, str]) -> dict[str, str]:
    keys = ("title", "category", "condition", "price", "risk")
    raw_dict = raw if isinstance(raw, dict) else {}
    return {
        key: str(raw_dict.get(key) or fallback.get(key) or "Generated from seller clues and campus resale evidence.")
        for key in keys
    }


def _coerce_number(value: Any, default: float) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return round(float(default), 2)


def _normalize_choice(value: Any, allowed: tuple[str, ...], default: str) -> str:
    normalized = str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {"review": "flag_for_review", "match": "match_with_buyers", "add_photo": "upload_better_image"}
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in allowed else default


def _normalize_confidence_level(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    return normalized if normalized in {"low", "medium", "high"} else "medium"


def _provider_name(client: Any) -> str:
    name = client.__class__.__name__.lower()
    if "zai" in name:
        return "zai"
    if "demo" in name:
        return "demo"
    return name or "glm"
