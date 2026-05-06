from __future__ import annotations

from dataclasses import dataclass
from re import search
from typing import Any

from app.trade.constants import (
    CONDITION_LABELS,
    CONTACT_METHODS,
    LEGACY_CATEGORY_ALIASES,
    LEGACY_LISTING_STATUS_ALIASES,
    LEGACY_PICKUP_AREA_ALIASES,
    LISTING_STATUSES,
    LISTING_REPORT_REASONS,
    MODERATION_STATUSES,
    PICKUP_AREAS,
    REPORT_STATUSES,
    TRADE_CATEGORIES,
    USER_REPORT_REASONS,
)


@dataclass(frozen=True)
class PolicyScanResult:
    blocked: bool = False
    review_required: bool = False
    reason: str | None = None
    evidence: tuple[str, ...] = ()

    def as_evidence(self) -> dict[str, Any]:
        return {
            "policy_scan": {
                "blocked": self.blocked,
                "review_required": self.review_required,
                "reason": self.reason,
                "evidence": list(self.evidence),
            }
        }


PROHIBITED_PATTERNS: dict[str, tuple[str, ...]] = {
    "weapons": ("weapon", "knife", "gun", "pistol", "rifle", "taser", "pepper spray", "airsoft"),
    "vapes_or_cigarettes": ("vape", "e-cig", "e cigarette", "pod", "cigarette", "tobacco", "nicotine"),
    "alcohol": ("alcohol", "beer", "wine", "liquor", "vodka", "whisky", "whiskey", "soju"),
    "medicine_or_prescription_drugs": (
        "medicine",
        "prescription",
        "antibiotic",
        "painkiller",
        "ibuprofen",
        "paracetamol",
        "panadol",
    ),
    "exam_papers_or_leaked_materials": (
        "exam paper",
        "past year answer",
        "answer key",
        "leaked paper",
        "leaked exam",
        "test bank",
    ),
    "counterfeit_goods": ("counterfeit", "fake", "replica", "aaa grade", "copy watch"),
    "adult_items": ("adult toy", "sex toy", "porn", "explicit adult"),
    "illegal_software": ("cracked software", "pirated", "license key", "activation key", "torrent"),
    "stolen_items": ("stolen", "no owner", "found phone", "icloud locked"),
    "dangerous_chemicals": ("dangerous chemical", "acid", "poison", "cyanide", "mercury", "chloroform"),
}

SUSPICIOUS_PATTERNS: dict[str, tuple[str, ...]] = {
    "ownership_or_payment_risk": (
        "no receipt",
        "bank transfer first",
        "pay first",
        "deposit first",
        "urgent cash",
        "too good to be true",
    ),
    "authenticity_unclear": ("not sure authentic", "looks original", "mirror quality", "grade a"),
    "device_lock_risk": ("locked", "forgot password", "account locked"),
}


def normalize_category(value: Any) -> str | None:
    normalized = _token(value)
    if not normalized:
        return None
    normalized = LEGACY_CATEGORY_ALIASES.get(normalized, normalized)
    return normalized if normalized in TRADE_CATEGORIES else "others"


def normalize_condition(value: Any) -> str | None:
    normalized = _token(value)
    if not normalized:
        return None
    aliases = {
        "brand_new": "new",
        "unused": "new",
        "like_new": "like_new",
        "like": "like_new",
        "excellent": "like_new",
        "very_good": "good",
        "used": "good",
        "unknown": "good",
        "damaged": "poor",
        "broken": "poor",
        "not_working": "poor",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in CONDITION_LABELS else "good"


def normalize_pickup_location(value: Any) -> str | None:
    normalized = _token(value)
    if not normalized:
        return None
    normalized = LEGACY_PICKUP_AREA_ALIASES.get(normalized, normalized)
    return normalized if normalized in PICKUP_AREAS else None


def normalize_listing_status(value: Any) -> str | None:
    normalized = _token(value)
    if not normalized:
        return None
    normalized = LEGACY_LISTING_STATUS_ALIASES.get(normalized, normalized)
    return normalized if normalized in LISTING_STATUSES else None


def normalize_contact_method(value: Any) -> str | None:
    normalized = _token(value)
    aliases = {
        "inapp": "in_app",
        "in_platform": "in_app",
        "platform": "in_app",
        "um_email": "email",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in CONTACT_METHODS else None


def normalize_moderation_status(value: Any) -> str | None:
    normalized = _token(value)
    aliases = {
        "pending": "review_required",
        "pending_review": "review_required",
        "ok": "clear",
        "safe": "clear",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in MODERATION_STATUSES else None


def normalize_listing_report_reason(value: Any) -> str | None:
    normalized = _token(value)
    aliases = {
        "suspicious_payment": "unsafe_transaction",
        "unsafe_trade_behavior": "unsafe_transaction",
        "scam": "scam_suspicion",
        "prohibited": "prohibited_item",
        "fake_photo": "fake_photos",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in LISTING_REPORT_REASONS else None


def normalize_report_status(value: Any) -> str | None:
    normalized = _token(value)
    aliases = {
        "open": "pending",
        "resolved": "reviewed",
        "closed": "reviewed",
        "actioned": "action_taken",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in REPORT_STATUSES else None


def normalize_user_report_reason(value: Any) -> str | None:
    normalized = _token(value)
    aliases = {
        "no_show": "repeated_no_show",
        "unsafe_trade_behavior": "suspicious_payment_behavior",
        "unsafe_transaction": "suspicious_payment_behavior",
        "suspicious_payment": "suspicious_payment_behavior",
        "abuse": "abusive_messages",
        "fake": "fake_identity",
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in USER_REPORT_REASONS else None


def scan_listing_policy(*values: Any) -> PolicyScanResult:
    text = " ".join(str(value or "") for value in values).lower()
    if not text.strip():
        return PolicyScanResult()

    blocked_hits = _pattern_hits(text, PROHIBITED_PATTERNS)
    if blocked_hits:
        reason, evidence = blocked_hits[0]
        return PolicyScanResult(blocked=True, reason=reason, evidence=tuple(evidence[:5]))

    suspicious_hits = _pattern_hits(text, SUSPICIOUS_PATTERNS)
    if suspicious_hits:
        reason, evidence = suspicious_hits[0]
        return PolicyScanResult(review_required=True, reason=reason, evidence=tuple(evidence[:5]))

    return PolicyScanResult()


def _pattern_hits(text: str, grouped_terms: dict[str, tuple[str, ...]]) -> list[tuple[str, list[str]]]:
    hits: list[tuple[str, list[str]]] = []
    for reason, terms in grouped_terms.items():
        evidence = [term for term in terms if _term_found(text, term)]
        if evidence:
            hits.append((reason, evidence))
    return hits


def _term_found(text: str, term: str) -> bool:
    if " " in term or "-" in term:
        return term in text
    return bool(search(rf"\b{term}\b", text))


def _token(value: Any) -> str:
    return str(value or "").strip().lower().replace(" ", "_").replace("-", "_")
