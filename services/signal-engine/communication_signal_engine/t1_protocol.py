"""Private T1 prepare/review/continue/clear state machine.

The protocol is local technical-readiness infrastructure. It does not provide
authentication, consent, a lawful basis, production admission, or a public
route. Fastify owns the authenticated public token mapping. Python receives no
subject identity and stores only minimised text under a transient nonce.
"""

from __future__ import annotations

import gc
import hashlib
import json
import secrets
from pathlib import Path

from .contracts import FIXED_ANALYSIS_LIMITATIONS, RepairAction
from .contracts_v2 import (
    T1AnalysisResponse,
    T1ContinueRequest,
    T1CueObservation,
    T1EngineProvenance,
    T1PrepareRequest,
    T1PrepareResponse,
    T1PrivacyReceipt,
    T1_PRIVACY_LIMITATION,
)
from .cues.deterministic import DeterministicCueEngine
from .cues.explanations import repair_for
from .cues.registry import DEFAULT_REGISTRY_PATH, load_registry
from .limits import InputBoundaryError, PrivacyBoundaryError
from .privacy.admission import PrivacyModelAdmission
from .privacy.redaction import LocalEntityDetector, PrivacyMinimizer
from .semantic.embeddings import SemanticAnalyzer
from .semantic.model_loader import DEFAULT_INVENTORY_PATH, load_model_inventory
from .t1_sessions import T1SessionStore


class T1Protocol:
    def __init__(
        self,
        *,
        environment: str,
        detector: LocalEntityDetector | None = None,
        admission: PrivacyModelAdmission | None = None,
        session_store: T1SessionStore | None = None,
        cue_registry_path: Path = DEFAULT_REGISTRY_PATH,
        model_inventory_path: Path = DEFAULT_INVENTORY_PATH,
    ) -> None:
        self.registry = load_registry(cue_registry_path)
        self.models = load_model_inventory(model_inventory_path)
        self.admission = admission or PrivacyModelAdmission.from_inventory(
            self.models.privacy_ner,
            environment=environment,
        )
        if self.admission.test_only and environment != "test":
            raise PrivacyBoundaryError("Synthetic privacy admission cannot run outside tests")
        if self.admission.test_only != (detector is not None):
            raise PrivacyBoundaryError("Synthetic admission and detector must be injected together")
        self.privacy = PrivacyMinimizer(
            detector=detector,
            model_entry=self.models.privacy_ner,
            allow_test_detector=self.admission.test_only,
        )
        self.rules = DeterministicCueEngine(self.registry)
        self.semantic = SemanticAnalyzer(self.models.semantic, enabled=False)
        self.sessions = session_store or T1SessionStore()

    @property
    def test_only(self) -> bool:
        return self.admission.test_only

    @property
    def admission_snapshot(self) -> str:
        value = {
            "privacy_admission_fingerprint": self.admission.fingerprint,
            "privacy_detector_status": self.admission.detector_status,
            "ruleset_version": self.registry.ruleset_version,
            "cue_registry_version": self.registry.schema_version,
            "semantic_model_id": self.models.semantic.model_id,
            "semantic_model_revision": self.models.semantic.revision,
            "semantic_runtime_status": self.models.semantic.runtime_status,
        }
        encoded = json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8")
        return f"pa_{hashlib.sha256(encoded).hexdigest()}"

    def prepare(self, request: T1PrepareRequest) -> T1PrepareResponse:
        self.admission.require()
        sanitized = self.privacy.minimize(
            request.text,
            request.language_tag,
            synthetic_fixture_attested=False,
        )
        try:
            preview = sanitized._read_attested()
            if len(preview) > 16_000 or len(preview.encode("utf-8")) > 32_000:
                raise InputBoundaryError("Minimised preview exceeds the bounded release contract")
            preview_hash = hashlib.sha256(preview.encode("utf-8")).hexdigest()
            session = self.sessions.create(
                sanitized=sanitized,
                task=request.task,
                profile_id=request.profile_id,
                language_tag=request.language_tag,
                preview_hash=preview_hash,
                admission_snapshot=self.admission_snapshot,
            )
            return T1PrepareResponse(
                schema_version="2.0.0",
                internal_nonce=session.internal_nonce,
                expires_at=session.expires_at,
                redacted_preview=preview,
                potential_identifier_counts=sanitized.receipt.redaction_counts,
                detector_version=self.admission.detector_version,
                sanitized_text_bytes=session.text_bytes,
                admission_snapshot=session.admission_snapshot,
                limitation=T1_PRIVACY_LIMITATION,
            )
        except Exception:
            del sanitized
            gc.collect()
            raise

    def continue_review(self, request: T1ContinueRequest) -> T1AnalysisResponse:
        self.admission.require()
        session = self.sessions.consume(
            request.internal_nonce,
            admission_snapshot=request.admission_snapshot,
            current_snapshot=self.admission_snapshot,
        )
        sanitized = session.sanitized
        try:
            self.sessions.require_not_revoked(session)
            preview_hash = hashlib.sha256(sanitized._read_attested().encode("utf-8")).hexdigest()
            if not secrets.compare_digest(preview_hash, session.preview_hash):
                raise PrivacyBoundaryError("Prepared preview integrity check failed")
            if session.task != "draft_review":
                raise InputBoundaryError("Prepared task is not approved")
            self.privacy.assert_residual_safe(sanitized)
            self.sessions.require_not_revoked(session)
            deterministic = self.rules.analyze(sanitized, session.profile_id)
            self.sessions.require_not_revoked(session)
            semantic = self.semantic.analyze(sanitized)
            cues = tuple(
                T1CueObservation(
                    canonical_id=cue.canonical_id,
                    rule_id=self.registry.definition(cue.canonical_id).deterministic_rule,
                    observation=cue.observation,
                    limitation=cue.limitation,
                    sanitized_range=cue.sanitized_range,
                    evidence_sufficiency="deterministic",
                )
                for cue in deterministic.cues
            )
            repair: RepairAction | None = None
            if deterministic.sufficient and deterministic.primary_definition is not None:
                repair = repair_for(deterministic.primary_definition)
            response = T1AnalysisResponse(
                schema_version="2.0.0",
                analysis_id=f"an_{secrets.token_hex(12)}",
                privacy_receipt=T1PrivacyReceipt(
                    potential_identifier_counts=sanitized.receipt.redaction_counts,
                    redaction_total=sanitized.receipt.redaction_total,
                    detector_status=self.admission.detector_status,
                    text_released=False,
                    text_persisted=False,
                    limitation=T1_PRIVACY_LIMITATION,
                ),
                cues=cues,
                repair_action=repair,
                limitations=FIXED_ANALYSIS_LIMITATIONS,
                low_signal=not deterministic.sufficient,
                provenance=T1EngineProvenance(
                    engine_version="0.1.0",
                    ruleset_version=self.registry.ruleset_version,
                    cue_registry_version=self.registry.schema_version,
                    privacy_detector_id=self.admission.detector_id,
                    privacy_detector_revision=self.admission.detector_revision,
                    privacy_detector_status=self.admission.detector_status,
                    privacy_admission_fingerprint=self.admission.fingerprint,
                    semantic_model_id=self.models.semantic.model_id,
                    semantic_model_revision=self.models.semantic.revision,
                    semantic_status=semantic.status,
                ),
            )
            self._validate_final_output(response)
            self.sessions.require_not_revoked(session)
            return response
        finally:
            self.sessions.finish(session)
            del sanitized
            del session
            gc.collect()

    def clear(self, internal_nonce: str) -> None:
        self.sessions.clear(internal_nonce)

    @staticmethod
    def _validate_final_output(response: T1AnalysisResponse) -> None:
        payload = response.model_dump(mode="json")
        forbidden = {
            "raw_text", "sanitized_text", "text", "transcript", "message", "snippet",
            "redacted_preview", "internal_nonce", "admission_snapshot", "detector_version",
        }

        def walk(value: object) -> None:
            if isinstance(value, dict):
                for key, item in value.items():
                    if key in forbidden:
                        raise InputBoundaryError("Forbidden final output field")
                    walk(item)
            elif isinstance(value, list):
                for item in value:
                    walk(item)

        walk(payload)
        json.dumps(payload, ensure_ascii=False, allow_nan=False, sort_keys=True)
