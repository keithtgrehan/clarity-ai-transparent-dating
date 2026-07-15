"""Canonical cue-registry loader and fail-closed validation."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from ..contracts import ProfileId
from ..limits import RegistryError

ROOT = Path(__file__).resolve().parents[4]
DEFAULT_REGISTRY_PATH = ROOT / "configs" / "cue_registry_v1.yml"
_CANONICAL_ID = re.compile(r"^(communication|structure)\.[a-z0-9_]+$")
_ALIAS = re.compile(r"^[a-z0-9_]+$")
_BANNED_OBSERVATION = re.compile(
    r"\b(?:diagnos(?:is|e)|autis(?:m|tic)|adhd|emotion|attraction|compatibility|"
    r"personality|motive|deception|trauma|attachment style|relationship success|confidence score)\b",
    re.I,
)
RULE_HANDLERS = frozenset(
    {
        "first_person_preference_or_explicit_request",
        "ambiguity_marker_count",
        "second_person_obligation_or_urgency",
        "reassurance_question",
        "repeated_reassurance_question",
        "explicit_repair_marker",
        "transition_marker",
        "lexical_density_threshold",
        "long_comma_separated_run",
        "processing_time_phrase",
        "processing_request_with_time_window",
        "processing_request_without_time_window",
        "thinking_aloud_marker",
        "final_position_marker",
        "short_version_offer",
        "channel_choice_phrase",
        "question_count_threshold",
    }
)
_PRECONDITIONS = frozenset(
    {
        "minimum_signal", "two_reassurance_requests", "at_least_40_tokens",
        "at_least_45_tokens", "processing_request", "no_time_window", "three_questions",
    }
)
_LANGUAGE_SUPPORT = frozenset({"en-US", "en-GB", "en-EU", "mixed"})


@dataclass(frozen=True, slots=True)
class CueDefinition:
    canonical_id: str
    aliases: tuple[str, ...]
    profiles: tuple[ProfileId, ...]
    priority: int
    preconditions: tuple[str, ...]
    deterministic_rule: str
    observation: str
    limitation: str
    repair_action: str
    language_support: tuple[str, ...]
    tests: tuple[str, ...]
    status: str


@dataclass(frozen=True, slots=True)
class CueRegistry:
    schema_version: str
    ruleset_version: str
    cues: dict[str, CueDefinition]
    aliases: dict[str, str]
    deprecated_aliases: dict[str, str]

    def definition(self, canonical_or_alias: str) -> CueDefinition:
        resolved = self.aliases.get(canonical_or_alias, canonical_or_alias)
        resolved = self.deprecated_aliases.get(resolved, resolved)
        if resolved not in self.cues:
            raise RegistryError("Unknown canonical cue ID")
        return self.cues[resolved]


def load_registry(path: Path = DEFAULT_REGISTRY_PATH) -> CueRegistry:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    return validate_registry(payload)


def validate_registry(payload: Any) -> CueRegistry:
    if not isinstance(payload, dict) or payload.get("schema_version") != "1.0.0":
        raise RegistryError("Unsupported cue registry schema")
    raw_cues = payload.get("cues")
    if not isinstance(raw_cues, list) or not raw_cues:
        raise RegistryError("Cue registry must contain definitions")
    declared_profiles = set(payload.get("profiles", []))
    if declared_profiles != {member.value for member in ProfileId}:
        raise RegistryError("Cue registry profile vocabulary is incomplete")

    cues: dict[str, CueDefinition] = {}
    aliases: dict[str, str] = {}
    for raw in raw_cues:
        if not isinstance(raw, dict):
            raise RegistryError("Cue definitions must be mappings")
        required = {
            "canonical_id", "aliases", "profiles", "priority", "preconditions",
            "deterministic_rule", "safe_observation", "limits", "repair_action",
            "language_support", "tests", "status",
        }
        if set(raw) != required:
            raise RegistryError("Cue definition fields are not closed")
        canonical_id = raw["canonical_id"]
        if not isinstance(canonical_id, str) or not _CANONICAL_ID.fullmatch(canonical_id):
            raise RegistryError("Invalid canonical cue ID")
        if canonical_id in cues or canonical_id in aliases:
            raise RegistryError("Duplicate canonical cue ID")
        observation = raw["safe_observation"]
        repair = raw["repair_action"]
        if not isinstance(observation, str) or not isinstance(repair, str):
            raise RegistryError("Cue copy must be text")
        if _BANNED_OBSERVATION.search(observation) or _BANNED_OBSERVATION.search(repair):
            raise RegistryError("Cue copy contains a prohibited inference claim")
        status = raw["status"]
        if status not in {"active", "experimental", "deprecated"}:
            raise RegistryError("Unsupported cue status")
        if raw["deterministic_rule"] not in RULE_HANDLERS:
            raise RegistryError("Cue references an unknown deterministic handler")
        preconditions = raw["preconditions"]
        if (
            not isinstance(preconditions, list)
            or not preconditions
            or not set(preconditions).issubset(_PRECONDITIONS)
        ):
            raise RegistryError("Cue preconditions are unknown or empty")
        languages = raw["language_support"]
        if (
            not isinstance(languages, list)
            or not languages
            or not set(languages).issubset(_LANGUAGE_SUPPORT)
        ):
            raise RegistryError("Cue language support is unknown or empty")
        tests = raw["tests"]
        if not isinstance(tests, list) or not tests or not all(isinstance(item, str) and item for item in tests):
            raise RegistryError("Cue tests must name synthetic cases")
        try:
            profiles = tuple(ProfileId(value) for value in raw["profiles"])
        except (TypeError, ValueError) as exc:
            raise RegistryError("Unknown cue profile") from exc
        if not profiles:
            raise RegistryError("Cue must belong to a profile")
        priority = raw["priority"]
        if not isinstance(priority, int) or not 0 <= priority <= 100:
            raise RegistryError("Cue priority is outside bounds")
        raw_aliases = raw["aliases"]
        if not isinstance(raw_aliases, list):
            raise RegistryError("Cue aliases must be a list")
        for alias in raw_aliases:
            if not isinstance(alias, str) or not _ALIAS.fullmatch(alias):
                raise RegistryError("Invalid cue alias")
            if alias in aliases or alias in cues or _CANONICAL_ID.fullmatch(alias):
                raise RegistryError("Cue alias collision")
            aliases[alias] = canonical_id
        cues[canonical_id] = CueDefinition(
            canonical_id=canonical_id,
            aliases=tuple(raw_aliases),
            profiles=profiles,
            priority=priority,
            preconditions=tuple(preconditions),
            deterministic_rule=raw["deterministic_rule"],
            observation=observation,
            limitation=str(raw["limits"]),
            repair_action=repair,
            language_support=tuple(languages),
            tests=tuple(tests),
            status=status,
        )

    raw_deprecated = payload.get("deprecated_aliases", {})
    if not isinstance(raw_deprecated, dict):
        raise RegistryError("Deprecated aliases must be a mapping")
    deprecated: dict[str, str] = {}
    for alias, target in raw_deprecated.items():
        if not isinstance(alias, str) or not _ALIAS.fullmatch(alias):
            raise RegistryError("Invalid deprecated alias")
        if alias in aliases or alias in cues or alias == target:
            raise RegistryError("Deprecated alias collision or cycle")
        if target not in cues:
            raise RegistryError("Deprecated alias target is unknown")
        deprecated[alias] = target
    return CueRegistry(
        schema_version=payload["schema_version"],
        ruleset_version=str(payload["ruleset_version"]),
        cues=cues,
        aliases=aliases,
        deprecated_aliases=deprecated,
    )
