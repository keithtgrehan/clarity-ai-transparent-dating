from __future__ import annotations

from dataclasses import replace
import json
import builtins

import pytest
import yaml

from communication_signal_engine.cues.registry import (
    DEFAULT_REGISTRY_PATH,
    RULE_HANDLERS,
    load_registry,
    validate_registry,
)
from communication_signal_engine.limits import RegistryError
from communication_signal_engine.semantic.model_loader import (
    DEFAULT_INVENTORY_PATH,
    OfflineTransformerLoader,
    load_model_inventory,
    verified_local_artifact,
)


def test_canonical_registry_loads_and_deprecated_aliases_resolve() -> None:
    registry = load_registry()
    assert registry.definition("cognitive_load").canonical_id == "structure.multi_request_load"
    assert registry.definition("pressure_language").canonical_id == "communication.pressure"
    assert registry.definition("repair_attempt").canonical_id == "communication.repair"
    assert len(registry.cues) == 17


def test_registry_metadata_is_executable_and_referenced_by_governed_cases() -> None:
    registry = load_registry()
    path = DEFAULT_REGISTRY_PATH.parents[1] / "services" / "signal-engine" / "tests" / "fixtures" / "dating_signal_cases.json"
    fixture = json.loads(path.read_text(encoding="utf-8"))
    case_ids = {case["fixture_id"] for case in fixture["cases"]}
    expected_ids = {
        cue_id
        for case in fixture["cases"]
        for cue_id in case["expected_canonical_ids"]
    }
    referenced_tests = {
        test_id for definition in registry.cues.values() for test_id in definition.tests
    }
    assert referenced_tests.issubset(case_ids)
    assert set(registry.cues) == expected_ids
    assert {definition.deterministic_rule for definition in registry.cues.values()} == RULE_HANDLERS

    exact_rules = {
        "communication.directness": ("first_person_preference_or_explicit_request", ("minimum_signal",)),
        "communication.ambiguity": ("ambiguity_marker_count", ("minimum_signal",)),
        "communication.pressure": ("second_person_obligation_or_urgency", ("minimum_signal",)),
        "communication.reassurance_request": ("reassurance_question", ("minimum_signal",)),
        "communication.reassurance_repetition": ("repeated_reassurance_question", ("two_reassurance_requests",)),
        "communication.repair": ("explicit_repair_marker", ("minimum_signal",)),
        "structure.explicit_transition": ("transition_marker", ("minimum_signal",)),
        "structure.high_lexical_density": ("lexical_density_threshold", ("at_least_40_tokens",)),
        "structure.long_information_run": ("long_comma_separated_run", ("at_least_45_tokens",)),
        "structure.processing_request": ("processing_time_phrase", ("minimum_signal",)),
        "structure.response_window_present": ("processing_request_with_time_window", ("processing_request",)),
        "structure.response_window_missing": ("processing_request_without_time_window", ("processing_request", "no_time_window")),
        "structure.thinking_aloud": ("thinking_aloud_marker", ("minimum_signal",)),
        "structure.final_position": ("final_position_marker", ("minimum_signal",)),
        "structure.reciprocity_offer": ("short_version_offer", ("minimum_signal",)),
        "structure.channel_switch_offer": ("channel_choice_phrase", ("minimum_signal",)),
        "structure.multi_request_load": ("question_count_threshold", ("three_questions",)),
    }
    assert {
        cue_id: (definition.deterministic_rule, definition.preconditions)
        for cue_id, definition in registry.cues.items()
    } == exact_rules


@pytest.mark.parametrize("mutation", ["alias_collision", "unknown_rule", "bad_precondition", "banned_copy"])
def test_cue_registry_rejects_invalid_policy(mutation: str) -> None:
    payload = yaml.safe_load(DEFAULT_REGISTRY_PATH.read_text(encoding="utf-8"))
    if mutation == "alias_collision":
        payload["cues"][1]["aliases"] = payload["cues"][0]["aliases"]
    elif mutation == "unknown_rule":
        payload["cues"][0]["deterministic_rule"] = "guess_intent"
    elif mutation == "bad_precondition":
        payload["cues"][0]["preconditions"] = ["unknown"]
    else:
        payload["cues"][0]["safe_observation"] = "This diagnoses ADHD."
    with pytest.raises(RegistryError):
        validate_registry(payload)


def test_model_inventory_selects_exact_required_and_optional_entries() -> None:
    inventory = load_model_inventory()
    assert inventory.privacy_ner.fail_behavior == "refuse_text_analysis"
    assert inventory.semantic.fail_behavior == "abstain_without_semantic_cues"
    assert inventory.privacy_ner.local_path is None
    assert inventory.semantic.local_path is None


@pytest.mark.parametrize("field", ["memory_limit_mb", "timeout_seconds", "fail_behavior"])
def test_model_inventory_rejects_missing_controls(tmp_path, field: str) -> None:
    payload = yaml.safe_load(DEFAULT_INVENTORY_PATH.read_text(encoding="utf-8"))
    del payload["models"][1][field]
    path = tmp_path / "inventory.yml"
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")
    with pytest.raises(RegistryError):
        load_model_inventory(path)


def test_offline_environment_is_forced() -> None:
    import os

    assert os.environ["HF_HUB_OFFLINE"] == "1"
    assert os.environ["TRANSFORMERS_OFFLINE"] == "1"
    assert os.environ["HF_HUB_DISABLE_TELEMETRY"] == "1"


@pytest.mark.parametrize("field", ["model_id", "revision"])
def test_unpinned_model_identity_is_rejected(tmp_path, field: str) -> None:
    payload = yaml.safe_load(DEFAULT_INVENTORY_PATH.read_text(encoding="utf-8"))
    payload["models"][1][field] = "unreviewed"
    path = tmp_path / "inventory.yml"
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")
    with pytest.raises(RegistryError, match="identity changed"):
        load_model_inventory(path)


@pytest.mark.parametrize(
    ("field", "value"),
    [("memory_limit_mb", 4097), ("timeout_seconds", 31)],
)
def test_future_model_admission_limits_fail_closed(tmp_path, field: str, value: int) -> None:
    payload = yaml.safe_load(DEFAULT_INVENTORY_PATH.read_text(encoding="utf-8"))
    payload["models"][1][field] = value
    path = tmp_path / "inventory.yml"
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")
    with pytest.raises(RegistryError):
        load_model_inventory(path)


def test_checksum_mismatch_never_becomes_a_local_artifact(tmp_path, monkeypatch) -> None:
    artifact = tmp_path / "model.safetensors"
    artifact.write_bytes(b"synthetic wrong bytes")
    monkeypatch.setenv("SIGNAL_ENGINE_MODEL_ROOT", str(tmp_path))
    entry = replace(
        load_model_inventory().semantic,
        availability="local_verified",
        runtime_status="approved_local",
        local_path=str(artifact),
        local_sha256="0" * 64,
    )
    assert verified_local_artifact(entry) is None


def test_schema_v1_model_loader_refuses_before_optional_import_or_network(monkeypatch) -> None:
    imported: list[str] = []
    original_import = builtins.__import__

    def guarded_import(name, *args, **kwargs):
        if name.startswith(("transformers", "huggingface_hub", "sentence_transformers")):
            imported.append(name)
            raise AssertionError("Optional model library import was attempted")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", guarded_import)
    loader = OfflineTransformerLoader(load_model_inventory().semantic)
    assert loader.available is False
    from communication_signal_engine.limits import ModelUnavailableError

    with pytest.raises(ModelUnavailableError, match="execution is prohibited"):
        loader.load()
    assert imported == []


def test_local_verified_inventory_state_is_rejected_until_a_later_schema(tmp_path) -> None:
    payload = yaml.safe_load(DEFAULT_INVENTORY_PATH.read_text(encoding="utf-8"))
    payload["models"][1].update(
        availability="local_verified",
        runtime_status="approved_local",
        local_path="/tmp/unapproved-model",
        local_sha256="0" * 64,
    )
    path = tmp_path / "inventory.yml"
    path.write_text(yaml.safe_dump(payload), encoding="utf-8")
    with pytest.raises(RegistryError, match="schema v1 prohibits"):
        load_model_inventory(path)
