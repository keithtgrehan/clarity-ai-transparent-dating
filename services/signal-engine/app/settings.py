"""Fail-closed settings for the private loopback synthetic adapter."""

from __future__ import annotations

import ipaddress
import os
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class Settings:
    environment: str
    bind_host: str
    internal_secret: str
    synthetic_only: bool = True
    privacy_model_inventory_id: str = "multilingual_spacy_ner_required_candidate"
    semantic_model_inventory_id: str = "multilingual_sentence_similarity_review_candidate"

    def __post_init__(self) -> None:
        try:
            address = ipaddress.ip_address(self.bind_host)
        except ValueError as exc:
            raise ValueError("Signal engine host must be an IP loopback address") from exc
        if not address.is_loopback:
            raise ValueError("Signal engine must bind to loopback")
        if not self.synthetic_only:
            raise ValueError("Only the synthetic review boundary is implemented")
        if len(self.internal_secret) < 32:
            raise ValueError("Internal service secret must contain at least 32 characters")
        if self.environment not in {"local", "test"}:
            raise ValueError("Signal engine environment is not approved")
        if self.privacy_model_inventory_id != "multilingual_spacy_ner_required_candidate":
            raise ValueError("Required privacy model inventory ID changed")
        if self.semantic_model_inventory_id != "multilingual_sentence_similarity_review_candidate":
            raise ValueError("Semantic model inventory ID changed")

    @classmethod
    def from_env(cls) -> "Settings":
        secret = os.getenv("SIGNAL_ENGINE_INTERNAL_SECRET", "")
        return cls(
            environment=os.getenv("SIGNAL_ENGINE_ENVIRONMENT", "local"),
            bind_host=os.getenv("SIGNAL_ENGINE_BIND_HOST", "127.0.0.1"),
            internal_secret=secret,
            synthetic_only=os.getenv("SIGNAL_ENGINE_SYNTHETIC_ONLY", "true").casefold() == "true",
            privacy_model_inventory_id=os.getenv(
                "SIGNAL_ENGINE_PRIVACY_MODEL_INVENTORY_ID",
                "multilingual_spacy_ner_required_candidate",
            ),
            semantic_model_inventory_id=os.getenv(
                "SIGNAL_ENGINE_SEMANTIC_MODEL_INVENTORY_ID",
                "multilingual_sentence_similarity_review_candidate",
            ),
        )
