from __future__ import annotations

import pytest

from communication_signal_engine.contracts import PrivacyReceipt, SanitizedText
from communication_signal_engine.limits import PrivacyBoundaryError
from communication_signal_engine.privacy.redaction import PrivacyMinimizer
from communication_signal_engine.semantic.model_loader import load_model_inventory


def test_required_ner_unavailable_refuses_text_analysis() -> None:
    minimizer = PrivacyMinimizer(model_entry=load_model_inventory().privacy_ner)
    with pytest.raises(PrivacyBoundaryError, match="NER coverage is unavailable"):
        minimizer.minimize("This entirely fictional message has enough words.", "en-EU")


def test_patterns_minimize_coarse_pii_categories(detector) -> None:
    minimizer = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    )
    value = minimizer.minimize(
        "My name is Jordan. I am based in Berlin. Email jordan@example.test or use @fictional_handle.",
        "en-EU",
    )
    receipt = value.receipt
    assert receipt.redaction_counts.person_name == 1
    assert receipt.redaction_counts.location == 1
    assert receipt.redaction_counts.contact == 1
    assert receipt.redaction_counts.online_handle == 1
    assert receipt.redaction_total == 4
    assert "Jordan" not in value._read_attested()
    assert "example.test" not in value._read_attested()
    assert "fictional_handle" not in value._read_attested()


def test_receipt_shape_has_all_fixed_coarse_counts(detector) -> None:
    receipt = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    ).minimize("A fictional sentence has enough ordinary words for review.", "en-US").receipt
    assert set(receipt.redaction_counts.model_dump()) == {
        "person_name", "location", "contact", "online_handle", "identifier", "other"
    }
    assert receipt.method == "deterministic_patterns_plus_synthetic_test_double"
    assert receipt.local_ner_status == "SYNTHETIC_TEST_DOUBLE_APPLIED"
    assert receipt.text_released is False
    assert receipt.text_persisted is False


def test_sanitized_text_cannot_be_forged() -> None:
    receipt = PrivacyReceipt.model_validate(
        {
            "method": "deterministic_patterns_synthetic_fixture_only",
            "redaction_counts": {
                "person_name": 0, "location": 0, "contact": 0,
                "online_handle": 0, "identifier": 0, "other": 0,
            },
            "redaction_total": 0,
            "local_ner_status": "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY",
            "text_released": False,
            "text_persisted": False,
            "limitation": "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation.",
        }
    )
    with pytest.raises(PrivacyBoundaryError):
        SanitizedText("forged", language_tags=("en-US",), receipt=receipt, _attestation=object())


def test_detector_language_gap_refuses(detector) -> None:
    detector.supports = lambda _tag: False  # type: ignore[method-assign]
    minimizer = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    )
    with pytest.raises(PrivacyBoundaryError, match="language coverage"):
        minimizer.minimize("This fictional message has enough words to analyze.", "en-GB")


@pytest.mark.parametrize(
    ("surface", "receipt_field"),
    [
        ("Email fictional.person@example.test for the synthetic plan.", "contact"),
        ("Read https://example.test/private for the fictional plan.", "online_handle"),
        ("Use @fictional_handle for the synthetic plan.", "online_handle"),
        ("Call +49 30 1234 5678 for the fictional plan.", "contact"),
        ("The test address is 198.51.100.23 for this fictional plan.", "identifier"),
        ("The test IBAN is DE89 3704 0044 0532 0130 00 for this fictional plan.", "identifier"),
        ("The test card is 4111 1111 1111 1111 for this fictional plan.", "identifier"),
        ("Meet at 123 Example Street for this fictional plan.", "location"),
        ("The fictional postcode is 10115 for this plan.", "location"),
        ("My name is Élodie Example in this fictional plan.", "person_name"),
        ("I am based in Berlin for this fictional plan.", "location"),
    ],
)
def test_identifier_pattern_canary_matrix(surface, receipt_field, detector) -> None:
    value = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    ).minimize(surface, "en-EU")
    assert getattr(value.receipt.redaction_counts, receipt_field) >= 1
    assert "example.test" not in value._read_attested().casefold()
    assert "fictional_handle" not in value._read_attested().casefold()
    assert "198.51.100.23" not in value._read_attested()


def test_code_switch_canaries_are_minimized_with_truthful_test_status(detector) -> None:
    value = PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    ).minimize(
        "[en-GB] Call me Élodie Example. [de-DE] I am based in Berlin and use @fictional_handle.",
        "mixed",
    )
    assert value.receipt.local_ner_status == "SYNTHETIC_TEST_DOUBLE_APPLIED"
    assert value.receipt.redaction_counts.person_name >= 1
    assert value.receipt.redaction_counts.location >= 1
    assert value.receipt.redaction_counts.online_handle >= 1


def test_arbitrary_unattested_detector_injection_is_refused(detector) -> None:
    with pytest.raises(PrivacyBoundaryError, match="explicitly attested"):
        PrivacyMinimizer(detector, model_entry=load_model_inventory().privacy_ner)
