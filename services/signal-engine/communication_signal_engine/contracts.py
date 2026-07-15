"""Closed contracts for the privacy-first communication engine.

The contracts intentionally expose fixed observations, counts, and sanitized
offsets only. They cannot serialize source/redacted text, snippets, entities,
diagnosis, emotion, attraction, compatibility, or a confidence score about a
person. These technical constraints support GDPR Article 9 minimisation work;
they do not establish a lawful basis or compliance. UrhG §60d decisions remain
outside runtime code and require purpose- and source-specific review.
"""

from __future__ import annotations

from enum import Enum
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from .limits import MAX_CUES, PrivacyBoundaryError


class ClosedModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, strict=True)


class ProfileId(str, Enum):
    STRUCTURE_SUPPORT = "structure_support"
    WORDING_SUPPORT = "wording_support"


class TaskId(str, Enum):
    DRAFT_REVIEW = "draft_review"
    MESSAGE_EXCERPT_REVIEW = "message_excerpt_review"


class AnalysisState(str, Enum):
    LOW_SIGNAL = "LOW_SIGNAL"
    CUES_FOUND = "CUES_FOUND"
    NO_TARGETED_CUES = "NO_TARGETED_CUES"


class SourceAuthority(ClosedModel):
    source_class: Literal["synthetic_fixture"]
    review_confirmed: Literal[True]


class SyntheticAnalysisRequest(ClosedModel):
    # JSON enum values necessarily arrive as strings; keep the schema closed
    # while allowing Pydantic to parse those declared enum literals.
    model_config = ConfigDict(extra="forbid", frozen=True, strict=False)

    fixture_id: str = Field(min_length=1, max_length=80, pattern=r"^[a-z0-9_]+$")
    task: TaskId
    profile_id: ProfileId
    language_tag: Literal["en-US", "en-GB", "en-EU", "mixed"]
    text: str = Field(min_length=1, max_length=4_000)
    authority: SourceAuthority


class SanitizedOffset(ClosedModel):
    start: int = Field(ge=0)
    end: int = Field(gt=0, le=4_000)

    @model_validator(mode="after")
    def end_follows_start(self) -> "SanitizedOffset":
        if self.end <= self.start:
            raise ValueError("Sanitized range end must follow its start")
        return self


BoundedCueCopy = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=400)]
BoundedRepairTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)]
BoundedRepairCopy = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=240)]
BoundedLimitation = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=400)]

CanonicalCueId = Literal[
    "communication.directness",
    "communication.ambiguity",
    "communication.pressure",
    "communication.reassurance_request",
    "communication.reassurance_repetition",
    "communication.repair",
    "structure.explicit_transition",
    "structure.high_lexical_density",
    "structure.long_information_run",
    "structure.processing_request",
    "structure.response_window_present",
    "structure.response_window_missing",
    "structure.thinking_aloud",
    "structure.final_position",
    "structure.reciprocity_offer",
    "structure.channel_switch_offer",
    "structure.multi_request_load",
]

FIXED_ANALYSIS_LIMITATIONS = (
    "Deterministic wording checks are not peer-reviewed inference models.",
    "Results do not infer diagnosis, emotion, attraction, intent, compatibility, or outcomes.",
    "Dialect and mixed-language behavior is not benchmarked for participant use.",
)

_PRIVACY_RECEIPT_POLICY = {
    "deterministic_patterns_synthetic_fixture_only": (
        "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
        "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation.",
    ),
    "deterministic_patterns_plus_local_spacy": (
        "LOCAL_SPACY_APPLIED",
        "Identifier minimisation reduces exposure but cannot guarantee anonymity or remove all sensitive context.",
    ),
    "deterministic_patterns_plus_synthetic_test_double": (
        "SYNTHETIC_TEST_DOUBLE_APPLIED",
        "A synthetic test double exercised this privacy boundary; it is not evidence that spaCy or a production detector ran.",
    ),
}


@lru_cache(maxsize=17)
def _reviewed_cue_copy(canonical_id: str) -> tuple[str, str, str, str, str]:
    # Import lazily to avoid a contracts/registry import cycle. The validated
    # cue registry is the Python release-copy authority.
    from .cues.registry import load_registry

    definition = load_registry().definition(canonical_id)
    suffix = definition.canonical_id.split(".", 1)[1]
    return (
        definition.observation,
        definition.limitation,
        f"Edit one {suffix.replace('_', ' ')} step",
        definition.repair_action,
        "This optional edit follows the displayed wording or structure cue.",
    )


class CueObservation(ClosedModel):
    canonical_id: CanonicalCueId
    observation: BoundedCueCopy
    limitation: BoundedCueCopy
    sanitized_range: SanitizedOffset | None
    evidence_sufficiency: Literal["deterministic"]

    @model_validator(mode="after")
    def copy_is_reviewed(self) -> "CueObservation":
        observation, limitation, *_ = _reviewed_cue_copy(self.canonical_id)
        if self.observation != observation or self.limitation != limitation:
            raise ValueError("Cue copy must match the reviewed canonical registry")
        return self


class RepairAction(ClosedModel):
    title: BoundedRepairTitle
    editable_text: BoundedRepairCopy
    rationale: BoundedRepairCopy


class RedactionCounts(ClosedModel):
    person_name: int = Field(ge=0, le=10_000)
    location: int = Field(ge=0, le=10_000)
    contact: int = Field(ge=0, le=10_000)
    online_handle: int = Field(ge=0, le=10_000)
    identifier: int = Field(ge=0, le=10_000)
    other: int = Field(ge=0, le=10_000)


class PrivacyReceipt(ClosedModel):
    method: Literal[
        "deterministic_patterns_synthetic_fixture_only",
        "deterministic_patterns_plus_local_spacy",
        "deterministic_patterns_plus_synthetic_test_double",
    ]
    redaction_counts: RedactionCounts
    redaction_total: int = Field(ge=0, le=10_000)
    local_ner_status: Literal[
        "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
        "LOCAL_SPACY_APPLIED",
        "SYNTHETIC_TEST_DOUBLE_APPLIED",
    ]
    text_released: Literal[False]
    text_persisted: Literal[False]
    limitation: BoundedLimitation

    @model_validator(mode="after")
    def receipt_is_consistent(self) -> "PrivacyReceipt":
        expected = {
            "deterministic_patterns_synthetic_fixture_only": "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
            "deterministic_patterns_plus_local_spacy": "LOCAL_SPACY_APPLIED",
            "deterministic_patterns_plus_synthetic_test_double": "SYNTHETIC_TEST_DOUBLE_APPLIED",
        }
        if expected[self.method] != self.local_ner_status:
            raise ValueError("Privacy receipt method and detector status disagree")
        _, reviewed_limitation = _PRIVACY_RECEIPT_POLICY[self.method]
        if self.limitation != reviewed_limitation:
            raise ValueError("Privacy receipt copy must match the reviewed policy")
        if sum(self.redaction_counts.model_dump().values()) != self.redaction_total:
            raise ValueError("Privacy receipt total must equal its category counts")
        return self


class EngineProvenance(ClosedModel):
    engine_version: Literal["0.1.0"]
    ruleset_version: Literal["2026-07-15.1"]
    cue_registry_version: Literal["1.0.0"]
    semantic_model_id: Literal["sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"]
    semantic_model_revision: Literal["e8f8c211226b894fcb81acc59f3b34ba3efd5f42"]
    semantic_status: Literal[
        "abstain_model_not_local",
        "abstain_disabled_by_policy",
    ]


class AnalysisResponse(ClosedModel):
    schema_version: Literal["1.0.0"]
    analysis_id: str = Field(pattern=r"^an_[0-9a-f]{24}$")
    privacy_receipt: PrivacyReceipt
    cues: tuple[CueObservation, ...] = Field(max_length=MAX_CUES)
    repair_action: RepairAction | None
    limitations: tuple[BoundedLimitation, ...] = Field(min_length=1, max_length=6)
    low_signal: bool
    provenance: EngineProvenance

    @model_validator(mode="after")
    def bounded_result_is_consistent(self) -> "AnalysisResponse":
        cue_ids = [cue.canonical_id for cue in self.cues]
        if len(set(cue_ids)) != len(cue_ids):
            raise ValueError("Cue identifiers must be unique")
        if self.low_signal and self.cues:
            raise ValueError("Low-signal results cannot contain cues")
        if self.low_signal and self.repair_action is not None:
            raise ValueError("Low-signal results cannot contain a repair action")
        if bool(self.cues) != (self.repair_action is not None):
            raise ValueError("A cue-bearing result requires exactly one repair action")
        if self.limitations != FIXED_ANALYSIS_LIMITATIONS:
            raise ValueError("Analysis limitations must use the reviewed fixed copy")
        if self.cues:
            _, _, title, editable_text, rationale = _reviewed_cue_copy(self.cues[0].canonical_id)
            if self.repair_action != RepairAction(
                title=title,
                editable_text=editable_text,
                rationale=rationale,
            ):
                raise ValueError("Repair copy must match the first reviewed cue")
        return self


_SANITIZED_ATTESTATION = object()


class SanitizedText:
    """Opaque transient text that only the privacy minimizer can attest."""

    __slots__ = ("__content", "language_tags", "receipt", "__attestation")

    def __init__(
        self,
        content: str,
        *,
        language_tags: tuple[str, ...],
        receipt: PrivacyReceipt,
        _attestation: object,
    ) -> None:
        if _attestation is not _SANITIZED_ATTESTATION:
            raise PrivacyBoundaryError("Downstream text lacks privacy attestation")
        self.__content = content
        self.language_tags = language_tags
        self.receipt = receipt
        self.__attestation = _attestation

    @classmethod
    def _from_privacy_boundary(
        cls, content: str, language_tags: tuple[str, ...], receipt: PrivacyReceipt
    ) -> "SanitizedText":
        return cls(
            content,
            language_tags=language_tags,
            receipt=receipt,
            _attestation=_SANITIZED_ATTESTATION,
        )

    def _read_attested(self) -> str:
        if self.__attestation is not _SANITIZED_ATTESTATION:
            raise PrivacyBoundaryError("Downstream text lacks privacy attestation")
        return self.__content

    def __repr__(self) -> str:
        return "SanitizedText(content=<withheld>, attested=True)"
