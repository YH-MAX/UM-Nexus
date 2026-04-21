from __future__ import annotations

from hashlib import sha256
from math import sqrt
from re import findall


VECTOR_DIMENSIONS = 1536


def make_demo_embedding_text(source_text: str) -> str:
    vector = make_demo_embedding(source_text)
    return "[" + ",".join(f"{value:.6f}" for value in vector) + "]"


def make_demo_embedding(source_text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIMENSIONS
    for token in findall(r"[a-z0-9]+", source_text.lower()):
        index = int.from_bytes(sha256(token.encode("utf-8")).digest()[:8], "big") % VECTOR_DIMENSIONS
        vector[index] += 1.0
    magnitude = sqrt(sum(value * value for value in vector)) or 1.0
    return [value / magnitude for value in vector]


def parse_embedding_text(value: str | None) -> list[float]:
    if not value:
        return []
    cleaned = value.strip().strip("[]")
    if not cleaned:
        return []
    return [float(part) for part in cleaned.split(",")]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    return sum(a * b for a, b in zip(left, right))
