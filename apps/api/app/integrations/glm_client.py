from __future__ import annotations

import ipaddress
import json
import logging
import socket
import time
from typing import Any, Protocol
from urllib.parse import urlparse

from zai import ZaiClient
from zai.core import APIReachLimitError, APIResponseValidationError, APIStatusError, APITimeoutError, ZaiError

from app.core.config import Settings, get_settings
from app.core.exceptions import ConfigurationError, ExternalProviderError


logger = logging.getLogger(__name__)


class GLMProviderError(ExternalProviderError):
    """Raised when a GLM provider call fails or returns invalid data."""


class GLMDecisionClient(Protocol):
    def generate_trade_decision(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Return a decision result using the canonical Trade Intelligence shape."""


class DemoGLMClient:
    """Demo multimodal GLM stand-in that preserves local offline behavior."""

    def generate_trade_decision(self, payload: dict[str, Any]) -> dict[str, Any]:
        fallback = payload["fallback_result"]
        image_count = len(payload.get("image_references", []))
        comparable_count = len(payload.get("comparable_sales", []))
        candidate_count = len(payload.get("candidate_wanted_posts", []))

        fallback["why"]["condition_estimate"] = (
            f"Demo GLM reviewed {image_count} uploaded image reference(s) with the seller text. "
            f"{fallback['why']['condition_estimate']}"
        )
        fallback["why"]["similar_item_pattern"] = (
            f"Demo GLM compared this listing with {comparable_count} campus comparable(s). "
            f"{fallback['why']['similar_item_pattern']}"
        )
        fallback["why"]["local_demand_context"] = (
            f"Demo GLM checked {candidate_count} candidate wanted post(s). "
            f"{fallback['why']['local_demand_context']}"
        )
        return fallback


class ZAIGLMClient:
    """Backend-only Z.AI GLM client using the official zai-sdk."""

    def __init__(
        self,
        settings: Settings | None = None,
        sdk_client: ZaiClient | None = None,
    ) -> None:
        self.settings = settings or get_settings()
        missing = self.settings.missing_zai_settings()
        if missing:
            joined = ", ".join(missing)
            raise ConfigurationError(f"Missing required Z.AI settings: {joined}.")
        self.sdk_client = sdk_client or self._create_sdk_client()

    @property
    def model_name(self) -> str:
        return self.settings.zai_model

    def simple_test(self) -> str:
        response = self._chat_completion(
            messages=[
                {
                    "role": "user",
                    "content": "Reply with one short sentence confirming Z.AI GLM connectivity.",
                }
            ],
            response_format=None,
            metadata={"purpose": "test-glm"},
        )
        return _extract_text_response(response)

    def health_check(self) -> str:
        return self.simple_test()

    def analyze_trade_listing(
        self,
        *,
        listing: dict[str, Any],
        structured_context: dict[str, Any],
        comparable_sales_summary: list[dict[str, Any]],
        candidate_matches_summary: list[dict[str, Any]],
        image_references: list[dict[str, Any]],
        retrieved_examples: list[dict[str, Any]],
        fallback_result: dict[str, Any],
        prompt: str,
    ) -> dict[str, Any]:
        public_image_urls = _validated_public_image_urls(image_references)
        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for image_url in public_image_urls:
            content.append({"type": "image_url", "image_url": {"url": image_url}})

        response = self._chat_completion(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are UM Nexus Trade Intelligence, a University of Malaya campus "
                        "resale decision engine. Return only valid JSON."
                    ),
                },
                {"role": "user", "content": content},
            ],
            response_format={"type": "json_object"},
            metadata={
                "listing_id": listing.get("id"),
                "category": listing.get("category"),
                "comparable_count": len(comparable_sales_summary),
                "candidate_count": len(candidate_matches_summary),
                "image_count": len(public_image_urls),
                "retrieved_count": len(retrieved_examples),
                "has_fallback": bool(fallback_result),
            },
        )
        return _extract_json_response(response)

    def generate_trade_decision(self, payload: dict[str, Any]) -> dict[str, Any]:
        prompt = payload.get("prompt") or _build_fallback_prompt(payload)
        return self.analyze_trade_listing(
            listing=payload.get("listing") or {},
            structured_context=payload.get("structured_context") or {},
            comparable_sales_summary=payload.get("comparable_sales") or [],
            candidate_matches_summary=payload.get("candidate_wanted_posts") or [],
            image_references=payload.get("image_references") or [],
            retrieved_examples=payload.get("retrieved_examples") or [],
            fallback_result=payload.get("fallback_result") or {},
            prompt=prompt,
        )

    def _create_sdk_client(self) -> ZaiClient:
        kwargs: dict[str, Any] = {
            "api_key": self.settings.zai_api_key,
            "timeout": self.settings.zai_timeout_seconds,
            "max_retries": self.settings.zai_max_retries,
        }
        if self.settings.zai_base_url:
            kwargs["base_url"] = self.settings.zai_base_url
        return ZaiClient(**kwargs)

    def _chat_completion(
        self,
        *,
        messages: list[dict[str, Any]],
        response_format: dict[str, str] | None,
        metadata: dict[str, Any] | None = None,
    ) -> Any:
        started = time.perf_counter()
        logger.info(
            "Starting Z.AI SDK request",
            extra={"model": self.settings.zai_model, "metadata": metadata or {}},
        )
        try:
            response = self.sdk_client.chat.completions.create(
                model=self.settings.zai_model,
                messages=messages,
                response_format=response_format,
                timeout=self.settings.zai_timeout_seconds,
            )
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "Z.AI SDK request succeeded",
                extra={"model": self.settings.zai_model, "elapsed_ms": elapsed_ms},
            )
            return response
        except APIReachLimitError as exc:
            logger.warning("Z.AI SDK request hit rate or quota limits", extra={"model": self.settings.zai_model})
            raise GLMProviderError(f"Z.AI rate limit or quota exceeded for model {self.settings.zai_model}.") from exc
        except APITimeoutError as exc:
            logger.warning("Z.AI SDK request timed out", extra={"model": self.settings.zai_model})
            raise GLMProviderError(f"Z.AI request timed out for model {self.settings.zai_model}.") from exc
        except APIResponseValidationError as exc:
            raise GLMProviderError("Z.AI returned a malformed response.") from exc
        except APIStatusError as exc:
            logger.warning(
                "Z.AI SDK request failed with provider status",
                extra={"model": self.settings.zai_model, "status_code": exc.status_code},
            )
            raise GLMProviderError(f"Z.AI request failed for model {self.settings.zai_model} with status {exc.status_code}.") from exc
        except ZaiError as exc:
            logger.warning("Z.AI SDK request failed", extra={"model": self.settings.zai_model, "error_type": type(exc).__name__})
            raise GLMProviderError(f"Z.AI request failed for model {self.settings.zai_model}.") from exc


ZAIClient = ZAIGLMClient


def get_glm_client(settings: Settings | None = None) -> GLMDecisionClient:
    resolved_settings = settings or get_settings()
    if resolved_settings.should_use_zai_provider:
        return ZAIGLMClient(resolved_settings)
    return DemoGLMClient()


def _build_fallback_prompt(payload: dict[str, Any]) -> str:
    safe_payload = {
        "listing": payload.get("listing"),
        "structured_context": payload.get("structured_context"),
        "comparable_sales": payload.get("comparable_sales"),
        "candidate_wanted_posts": payload.get("candidate_wanted_posts"),
        "retrieved_examples": payload.get("retrieved_examples"),
        "fallback_result": payload.get("fallback_result"),
    }
    return (
        "Return only valid JSON with keys recommendation, why, expected_outcome, and action.\n\n"
        f"Context JSON:\n{json.dumps(safe_payload, default=str)}"
    )


def _extract_text_response(response_body: Any) -> str:
    normalized = _model_to_dict(response_body)
    try:
        content = normalized["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise GLMProviderError("Z.AI returned an invalid health-check response.") from exc

    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = [
            item.get("text", "")
            for item in content
            if isinstance(item, dict) and item.get("type") in {None, "text"}
        ]
        return " ".join(part for part in parts if part).strip()
    return str(content).strip()


def _extract_json_response(response_body: Any) -> dict[str, Any]:
    content = _extract_text_response(response_body)
    content = _strip_json_fence(content)
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise GLMProviderError("Z.AI returned text that could not be parsed as JSON.") from exc
    if not isinstance(parsed, dict):
        raise GLMProviderError("Z.AI returned JSON that is not an object.")
    return parsed


def _model_to_dict(response_body: Any) -> dict[str, Any]:
    if isinstance(response_body, dict):
        return response_body
    if hasattr(response_body, "model_dump"):
        return response_body.model_dump()
    if hasattr(response_body, "dict"):
        return response_body.dict()
    raise GLMProviderError("Z.AI returned an unsupported response object.")


def _strip_json_fence(content: str) -> str:
    stripped = content.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped


def _validated_public_image_urls(image_references: list[dict[str, Any]]) -> list[str]:
    urls: list[str] = []
    for image in image_references:
        public_url = image.get("public_url")
        if not public_url:
            continue
        if not _is_public_image_url(public_url):
            raise GLMProviderError("Z.AI multimodal analysis requires public image URLs; localhost and private URLs are not supported.")
        urls.append(public_url)
    return urls


def _is_public_image_url(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return False

    hostname = parsed.hostname.lower()
    if hostname in {"localhost", "0.0.0.0"} or hostname.endswith(".localhost") or hostname.endswith(".local"):
        return False

    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return _looks_public_hostname(hostname)

    return not (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    )


def _looks_public_hostname(hostname: str) -> bool:
    if "." not in hostname:
        return False
    if hostname.endswith((".internal", ".invalid", ".test", ".example")):
        return False
    try:
        socket.inet_aton(hostname)
    except OSError:
        return True
    return False
