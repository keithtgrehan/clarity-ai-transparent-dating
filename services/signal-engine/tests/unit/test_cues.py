from __future__ import annotations

import json
from pathlib import Path

from communication_signal_engine.contracts import ProfileId
from communication_signal_engine.cues.deterministic import DeterministicCueEngine
from communication_signal_engine.cues.registry import load_registry
from communication_signal_engine.privacy.redaction import PrivacyMinimizer
from communication_signal_engine.semantic.model_loader import load_model_inventory


def analyze(text: str, profile: ProfileId, detector):
    sanitized = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    ).minimize(text, "en-EU")
    return DeterministicCueEngine(load_registry()).analyze(sanitized, profile)


def ids(result) -> set[str]:
    return {cue.canonical_id for cue in result.cues}


def test_wording_cues_are_bounded_and_canonical(detector) -> None:
    result = analyze(
        "Maybe we can clarify this. I apologise for the unclear wording; what I meant was that I prefer Saturday afternoon.",
        ProfileId.WORDING_SUPPORT,
        detector,
    )
    assert ids(result) == {
        "communication.ambiguity", "communication.directness", "communication.repair"
    }
    assert len(result.cues) <= 3
    assert all(cue.evidence_sufficiency == "deterministic" for cue in result.cues)


def test_structure_cues_and_processing_window(detector) -> None:
    result = analyze(
        "By the way, I need time to process this plan and I will come back to this by tomorrow evening with one answer.",
        ProfileId.STRUCTURE_SUPPORT,
        detector,
    )
    assert {
        "structure.explicit_transition",
        "structure.processing_request",
        "structure.response_window_present",
    } == ids(result)


def test_low_signal_has_no_cues(detector) -> None:
    result = analyze("Hello there.", ProfileId.WORDING_SUPPORT, detector)
    assert result.sufficient is False
    assert result.cues == ()


def test_first_person_obligation_is_not_pressure(detector) -> None:
    result = analyze(
        "I have to finish my fictional work before dinner, so I will send an update tomorrow.",
        ProfileId.WORDING_SUPPORT,
        detector,
    )
    assert "communication.pressure" not in ids(result)


def test_quoted_and_reported_demands_do_not_trigger(detector) -> None:
    for text in (
        'They wrote, "you have to reply right now," and I do not agree with that wording.',
        "They said you have to reply right now, but I reject that demand.",
        'She wrote, "I would like to meet," while summarizing a fictional example.',
    ):
        result = analyze(text, ProfileId.WORDING_SUPPORT, detector)
        assert "communication.pressure" not in ids(result)
        assert "communication.directness" not in ids(result)


def test_rejected_obligation_is_not_pressure(detector) -> None:
    result = analyze(
        "I reject the suggestion that you have to reply right now; please take the time you need.",
        ProfileId.WORDING_SUPPORT,
        detector,
    )
    assert "communication.pressure" not in ids(result)


def test_owner_authorized_donor_matrix_is_canonicalized_and_characterized(detector) -> None:
    path = Path(__file__).parents[1] / "fixtures" / "dating_signal_cases.json"
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["provenance"]["donor_source_sha256"] == (
        "c7af85f4cce2b2fa9d11da894f7e93021c074caf9ce7e752847bb0ded791a5e0"
    )
    assert len(payload["cases"]) == 18

    for case in payload["cases"]:
        sanitized = PrivacyMinimizer(
            detector,
            model_entry=load_model_inventory().privacy_ner,
            allow_test_detector=True,
        ).minimize(case["text"], case["language_tag"])
        result = DeterministicCueEngine(load_registry()).analyze(
            sanitized, ProfileId(case["profile_id"])
        )
        observed = ids(result)
        assert result.state.value == case["expected_state"], case["fixture_id"]
        assert set(case["expected_canonical_ids"]).issubset(observed), case["fixture_id"]
        assert set(case["forbidden_canonical_ids"]).isdisjoint(observed), case["fixture_id"]
