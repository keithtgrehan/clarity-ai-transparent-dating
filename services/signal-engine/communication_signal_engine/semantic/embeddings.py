"""Optional local embeddings over attested text; deterministic cues stay canonical."""

from __future__ import annotations

from dataclasses import dataclass

from ..contracts import SanitizedText
from .model_loader import ModelInventoryEntry, OfflineTransformerLoader


@dataclass(frozen=True, slots=True)
class SemanticResult:
    status: str


class SemanticAnalyzer:
    """Report availability without releasing vectors or experimental cues."""

    def __init__(self, entry: ModelInventoryEntry, *, enabled: bool = False) -> None:
        self.entry = entry
        self.enabled = enabled
        self.loader = OfflineTransformerLoader(entry)

    def analyze(self, sanitized: SanitizedText) -> SemanticResult:
        # Enforce the attested type even while the model feature is disabled.
        sanitized._read_attested()
        if not self.enabled:
            if not self.loader.available:
                return SemanticResult("abstain_model_not_local")
            return SemanticResult("abstain_disabled_by_policy")
        if not self.loader.available:
            return SemanticResult("abstain_model_not_local")
        # Schema v1 never authorizes a model call. Even a matching file must
        # abstain until a later schema adds a verified bundle plus enforced
        # subprocess timeout and memory isolation.
        return SemanticResult("abstain_disabled_by_policy")
