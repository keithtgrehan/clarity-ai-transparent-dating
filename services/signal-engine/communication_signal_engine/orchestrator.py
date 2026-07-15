"""Sole composition point for the bounded communication pipeline."""

from __future__ import annotations

import gc
import hashlib
import json
import re
import secrets
from pathlib import Path
from typing import Any

import yaml

from .contracts import (
    AnalysisResponse,
    EngineProvenance,
    FIXED_ANALYSIS_LIMITATIONS,
    ProfileId,
    RepairAction,
    SyntheticAnalysisRequest,
)
from .cues.deterministic import DeterministicCueEngine
from .cues.explanations import repair_for
from .cues.registry import DEFAULT_REGISTRY_PATH, load_registry
from .limits import InputBoundaryError
from .privacy.redaction import LocalEntityDetector, PrivacyMinimizer
from .semantic.embeddings import SemanticAnalyzer
from .semantic.model_loader import DEFAULT_INVENTORY_PATH, load_model_inventory

ROOT = Path(__file__).resolve().parents[3]
DEFAULT_FIXTURE_PATH = ROOT / "configs" / "signal_synthetic_fixture_hashes.yml"
_FORBIDDEN_OUTPUT_KEYS = frozenset(
    {
        "raw_text", "sanitized_text", "text", "transcript", "message", "snippet",
        "evidence", "entity", "name", "email", "phone", "handle", "diagnosis",
        "emotion", "attraction", "compatibility", "confidence", "vector", "embedding",
    }
)
_CONTACT_OUTPUT = re.compile(
    r"(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?://\S+|(?<!\w)@[A-Za-z0-9_]{2,}|"
    r"(?<!\w)\+?\d(?:[\s()./-]*\d){7,}(?!\w)|"
    r"\b[A-Z]{2}\d{2}(?:[ -]?[A-Z0-9]){11,30}\b|"
    r"\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b)"
)

class SyntheticFixtureAllowlist:
    def __init__(self, path: Path = DEFAULT_FIXTURE_PATH) -> None:
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict) or payload.get("content_class") != "synthetic_only":
            raise InputBoundaryError("Synthetic fixture registry is invalid")
        fixtures = payload.get("fixtures")
        if not isinstance(fixtures, dict) or not fixtures:
            raise InputBoundaryError("Synthetic fixture registry is empty")
        self._fixtures = fixtures

    def attest(self, request: SyntheticAnalysisRequest) -> None:
        entry = self._fixtures.get(request.fixture_id)
        if not isinstance(entry, dict):
            raise InputBoundaryError("Fixture is not allowlisted")
        digest = hashlib.sha256(request.text.encode("utf-8")).hexdigest()
        if not secrets.compare_digest(digest, str(entry.get("sha256_utf8", ""))):
            raise InputBoundaryError("Fixture content does not match its reviewed hash")
        if request.task.value not in entry.get("allowed_tasks", []):
            raise InputBoundaryError("Fixture is not approved for this task")
        if request.language_tag != entry.get("language_tag"):
            raise InputBoundaryError("Fixture language metadata does not match its reviewed fixture")


class CommunicationSignalOrchestrator:
    """Compose privacy, rules, optional semantics, and output release once."""

    def __init__(
        self,
        *,
        detector: LocalEntityDetector | None = None,
        cue_registry_path: Path = DEFAULT_REGISTRY_PATH,
        model_inventory_path: Path = DEFAULT_INVENTORY_PATH,
        fixture_registry_path: Path = DEFAULT_FIXTURE_PATH,
        semantic_enabled: bool = False,
        allow_test_detector: bool = False,
    ) -> None:
        self.registry = load_registry(cue_registry_path)
        self.models = load_model_inventory(model_inventory_path)
        self.privacy = PrivacyMinimizer(
            detector=detector,
            model_entry=self.models.privacy_ner,
            allow_test_detector=allow_test_detector,
        )
        self.rules = DeterministicCueEngine(self.registry)
        self.semantic = SemanticAnalyzer(self.models.semantic, enabled=semantic_enabled)
        self.fixtures = SyntheticFixtureAllowlist(fixture_registry_path)

    def analyze(self, request: SyntheticAnalysisRequest) -> AnalysisResponse:
        self.fixtures.attest(request)
        sanitized = self.privacy.minimize(
            request.text,
            request.language_tag,
            synthetic_fixture_attested=True,
        )
        try:
            deterministic = self.rules.analyze(sanitized, request.profile_id)
            semantic = self.semantic.analyze(sanitized)
            if not deterministic.sufficient:
                repair = None
            elif deterministic.primary_definition is not None:
                repair = repair_for(deterministic.primary_definition)
            else:
                repair = None
            response = AnalysisResponse(
                schema_version="1.0.0",
                analysis_id=f"an_{secrets.token_hex(12)}",
                privacy_receipt=sanitized.receipt,
                cues=deterministic.cues,
                repair_action=repair,
                limitations=FIXED_ANALYSIS_LIMITATIONS,
                provenance=EngineProvenance(
                    engine_version="0.1.0",
                    ruleset_version=self.registry.ruleset_version,
                    cue_registry_version=self.registry.schema_version,
                    semantic_model_id=self.models.semantic.model_id,
                    semantic_model_revision=self.models.semantic.revision,
                    semantic_status=semantic.status,
                ),
                low_signal=not deterministic.sufficient,
            )
            self._validate_output(response)
            return response
        finally:
            del sanitized
            gc.collect()

    def _validate_output(self, response: AnalysisResponse) -> None:
        payload = response.model_dump(mode="json")

        if response.limitations != FIXED_ANALYSIS_LIMITATIONS:
            raise InputBoundaryError("Analysis limitations are not canonical")
        if (
            response.provenance.engine_version != "0.1.0"
            or response.provenance.ruleset_version != self.registry.ruleset_version
            or response.provenance.cue_registry_version != self.registry.schema_version
            or response.provenance.semantic_model_id != self.models.semantic.model_id
            or response.provenance.semantic_model_revision != self.models.semantic.revision
        ):
            raise InputBoundaryError("Engine provenance is not canonical")
        expected_receipt_limitations = {
            "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY": (
                "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation."
            ),
            "LOCAL_SPACY_APPLIED": (
                "Identifier minimisation reduces exposure but cannot guarantee anonymity or remove all sensitive context."
            ),
            "SYNTHETIC_TEST_DOUBLE_APPLIED": (
                "A synthetic test double exercised this privacy boundary; it is not evidence that spaCy or a production detector ran."
            ),
        }
        if response.privacy_receipt.limitation != expected_receipt_limitations[
            response.privacy_receipt.local_ner_status
        ]:
            raise InputBoundaryError("Privacy receipt copy is not canonical")
        for cue in response.cues:
            definition = self.registry.definition(cue.canonical_id)
            if cue.observation != definition.observation or cue.limitation != definition.limitation:
                raise InputBoundaryError("Cue copy is not canonical")
        if response.cues:
            expected_repair = repair_for(self.registry.definition(response.cues[0].canonical_id))
            if response.repair_action != expected_repair:
                raise InputBoundaryError("Repair copy is not canonical")

        surface_strings = [
            response.privacy_receipt.limitation,
            *response.limitations,
            *(item for cue in response.cues for item in (cue.observation, cue.limitation)),
        ]
        if response.repair_action is not None:
            surface_strings.extend(
                (
                    response.repair_action.title,
                    response.repair_action.editable_text,
                    response.repair_action.rationale,
                )
            )
        if any(_CONTACT_OUTPUT.search(value) for value in surface_strings):
            raise InputBoundaryError("PII-like output was blocked")

        def walk(value: Any) -> None:
            if isinstance(value, dict):
                for key, item in value.items():
                    if key.casefold() in _FORBIDDEN_OUTPUT_KEYS:
                        raise InputBoundaryError("Forbidden output field")
                    walk(item)
            elif isinstance(value, list):
                for item in value:
                    walk(item)

        walk(payload)
        json.dumps(payload, ensure_ascii=False, allow_nan=False, sort_keys=True)
