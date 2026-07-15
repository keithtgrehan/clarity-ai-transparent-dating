"""Closed internal v2 contracts for the self-authored-draft review protocol.

The Python adapter never receives a user identity or public review token.
Fastify owns authentication, consent, and public token binding; this service
owns only a short-lived internal nonce and minimised text. These controls
support data minimisation but do not prove anonymity or establish a GDPR
lawful basis. No UrhG §60d training or corpus use is implemented here.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal

from pydantic import ConfigDict, Field, StringConstraints, model_validator

from .contracts import (
    BoundedCueCopy,
    BoundedLimitation,
    BoundedRepairCopy,
    BoundedRepairTitle,
    CanonicalCueId,
    ClosedModel,
    FIXED_ANALYSIS_LIMITATIONS,
    ProfileId,
    RedactionCounts,
    RepairAction,
    SanitizedOffset,
)
from .limits import MAX_CUES

T1_SCHEMA_VERSION = "2.0.0"
T1_PRIVACY_LIMITATION = (
    "Potential identifiers detected by this tool were masked. Indirect or contextual identifiers may remain."
)


class SelfAuthoredAuthority(ClosedModel):
    source_class: Literal["self_authored_draft"]


class T1PrepareRequest(ClosedModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=False)

    schema_version: Literal["2.0.0"]
    task: Literal["draft_review"]
    profile_id: ProfileId
    language_tag: Literal["en-US", "en-GB", "en-EU", "mixed"]
    text: str = Field(min_length=1, max_length=4_000)
    authority: SelfAuthoredAuthority


class T1PrepareResponse(ClosedModel):
    schema_version: Literal["2.0.0"]
    internal_nonce: str = Field(pattern=r"^sn_[0-9a-f]{64}$")
    expires_at: datetime
    redacted_preview: str = Field(min_length=1, max_length=16_000)
    potential_identifier_counts: RedactionCounts
    detector_version: str = Field(pattern=r"^dv_[0-9a-f]{64}$")
    sanitized_text_bytes: int = Field(ge=1, le=32_000)
    admission_snapshot: str = Field(pattern=r"^pa_[0-9a-f]{64}$")
    limitation: Literal[
        "Potential identifiers detected by this tool were masked. Indirect or contextual identifiers may remain."
    ]


class T1ContinueRequest(ClosedModel):
    schema_version: Literal["2.0.0"]
    internal_nonce: str = Field(pattern=r"^sn_[0-9a-f]{64}$")
    confirmation: Literal[True]
    admission_snapshot: str = Field(pattern=r"^pa_[0-9a-f]{64}$")


class T1ClearRequest(ClosedModel):
    schema_version: Literal["2.0.0"]
    internal_nonce: str = Field(pattern=r"^sn_[0-9a-f]{64}$")


RuleId = Annotated[str, StringConstraints(pattern=r"^[a-z][a-z0-9_]{2,79}$")]


class T1CueObservation(ClosedModel):
    canonical_id: CanonicalCueId
    rule_id: RuleId
    observation: BoundedCueCopy
    limitation: BoundedCueCopy
    sanitized_range: SanitizedOffset | None
    evidence_sufficiency: Literal["deterministic"]

    @model_validator(mode="after")
    def copy_and_rule_are_reviewed(self) -> "T1CueObservation":
        from .cues.registry import load_registry

        definition = load_registry().definition(self.canonical_id)
        if (
            self.observation != definition.observation
            or self.limitation != definition.limitation
            or self.rule_id != definition.deterministic_rule
        ):
            raise ValueError("Cue copy and rule ID must match the reviewed canonical registry")
        return self


class T1PrivacyReceipt(ClosedModel):
    potential_identifier_counts: RedactionCounts
    redaction_total: int = Field(ge=0, le=10_000)
    detector_status: Literal["LOCAL_SPACY_APPLIED", "SYNTHETIC_TEST_DOUBLE_APPLIED"]
    text_released: Literal[False]
    text_persisted: Literal[False]
    limitation: Literal[
        "Potential identifiers detected by this tool were masked. Indirect or contextual identifiers may remain."
    ]

    @model_validator(mode="after")
    def total_matches_counts(self) -> "T1PrivacyReceipt":
        if sum(self.potential_identifier_counts.model_dump().values()) != self.redaction_total:
            raise ValueError("Privacy receipt total must match category counts")
        return self


class T1EngineProvenance(ClosedModel):
    engine_version: Literal["0.1.0"]
    ruleset_version: Literal["2026-07-15.1"]
    cue_registry_version: Literal["1.0.0"]
    privacy_detector_id: Literal[
        "explosion/spacy-models:xx_ent_wiki_sm-3.8.0",
        "synthetic-test-double",
    ]
    privacy_detector_revision: str = Field(min_length=1, max_length=80)
    privacy_detector_status: Literal["LOCAL_SPACY_APPLIED", "SYNTHETIC_TEST_DOUBLE_APPLIED"]
    privacy_admission_fingerprint: str = Field(pattern=r"^pa_[0-9a-f]{64}$")
    semantic_model_id: Literal["sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]
    semantic_model_revision: Literal["e8f8c211226b894fcb81acc59f3b34ba3efd5f42"]
    semantic_status: Literal["abstain_model_not_local", "abstain_disabled_by_policy"]

    @model_validator(mode="after")
    def privacy_detector_policy_is_consistent(self) -> "T1EngineProvenance":
        expected = (
            ("fixture-only", "SYNTHETIC_TEST_DOUBLE_APPLIED")
            if self.privacy_detector_id == "synthetic-test-double"
            else ("374ece89b2099818244f5a65ef466b89c0c392ae", "LOCAL_SPACY_APPLIED")
        )
        if (self.privacy_detector_revision, self.privacy_detector_status) != expected:
            raise ValueError("Privacy detector identity, revision and status are inconsistent")
        return self


class T1AnalysisResponse(ClosedModel):
    schema_version: Literal["2.0.0"]
    analysis_id: str = Field(pattern=r"^an_[0-9a-f]{24}$")
    privacy_receipt: T1PrivacyReceipt
    cues: tuple[T1CueObservation, ...] = Field(max_length=MAX_CUES)
    repair_action: RepairAction | None
    limitations: tuple[BoundedLimitation, ...] = Field(min_length=1, max_length=6)
    low_signal: bool
    provenance: T1EngineProvenance

    @model_validator(mode="after")
    def result_is_consistent(self) -> "T1AnalysisResponse":
        cue_ids = [cue.canonical_id for cue in self.cues]
        if len(cue_ids) != len(set(cue_ids)):
            raise ValueError("Cue identifiers must be unique")
        if self.low_signal and (self.cues or self.repair_action is not None):
            raise ValueError("Low-signal result cannot contain cues or a repair action")
        if bool(self.cues) != (self.repair_action is not None):
            raise ValueError("Cue-bearing result requires one repair action")
        if self.limitations != FIXED_ANALYSIS_LIMITATIONS:
            raise ValueError("Analysis limitations must use the reviewed fixed copy")
        if self.cues:
            from .cues.explanations import repair_for
            from .cues.registry import load_registry

            expected_repair = repair_for(load_registry().definition(self.cues[0].canonical_id))
            if self.repair_action != expected_repair:
                raise ValueError("Repair copy must match the first reviewed cue")
        if self.privacy_receipt.detector_status != self.provenance.privacy_detector_status:
            raise ValueError("Privacy receipt and provenance detector status must match")
        return self
