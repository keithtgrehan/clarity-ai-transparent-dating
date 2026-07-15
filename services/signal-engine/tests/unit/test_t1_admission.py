from __future__ import annotations

import re

import pytest
from pydantic import ValidationError

from communication_signal_engine.contracts_v2 import T1EngineProvenance
from communication_signal_engine.limits import ModelUnavailableError, PrivacyBoundaryError
from communication_signal_engine.privacy.admission import PrivacyModelAdmission
from communication_signal_engine.semantic.model_loader import load_model_inventory


def test_current_privacy_candidate_is_explicitly_not_admitted() -> None:
    admission = PrivacyModelAdmission.from_inventory(
        load_model_inventory().privacy_ner,
        environment="test",
    )
    assert admission.admitted is False
    assert admission.test_only is False
    assert admission.detector_status == "BLOCKED_UNAPPROVED"
    assert re.fullmatch(r"pa_[0-9a-f]{64}", admission.fingerprint)
    assert re.fullmatch(r"dv_[0-9a-f]{64}", admission.detector_version)
    with pytest.raises(ModelUnavailableError, match="approved local privacy model"):
        admission.require()


def test_synthetic_admission_is_labelled_and_test_environment_only() -> None:
    admission = PrivacyModelAdmission.synthetic_test(environment="test")
    assert admission.admitted is True
    assert admission.test_only is True
    assert admission.detector_id == "synthetic-test-double"
    assert admission.detector_revision == "fixture-only"
    assert admission.detector_status == "SYNTHETIC_TEST_DOUBLE_APPLIED"
    with pytest.raises(PrivacyBoundaryError, match="test environment"):
        PrivacyModelAdmission.synthetic_test(environment="local")


def test_detector_provenance_rejects_mixed_identity_revision_and_status() -> None:
    with pytest.raises(ValidationError, match="inconsistent"):
        T1EngineProvenance(
            engine_version="0.1.0",
            ruleset_version="2026-07-15.1",
            cue_registry_version="1.0.0",
            privacy_detector_id="synthetic-test-double",
            privacy_detector_revision="374ece89b2099818244f5a65ef466b89c0c392ae",
            privacy_detector_status="SYNTHETIC_TEST_DOUBLE_APPLIED",
            privacy_admission_fingerprint="pa_" + "0" * 64,
            semantic_model_id="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
            semantic_model_revision="e8f8c211226b894fcb81acc59f3b34ba3efd5f42",
            semantic_status="abstain_model_not_local",
        )
