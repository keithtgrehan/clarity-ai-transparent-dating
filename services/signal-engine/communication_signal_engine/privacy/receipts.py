"""Privacy receipt construction without source content or entity values."""

from __future__ import annotations

from collections.abc import Mapping

from ..contracts import PrivacyReceipt, RedactionCounts


_COARSE_CATEGORY = {
    "PERSON": "person_name",
    "PERSON_CONTEXT": "person_name",
    "LOCATION": "location",
    "LOCATION_CONTEXT": "location",
    "ADDRESS": "location",
    "POSTCODE": "location",
    "EMAIL": "contact",
    "PHONE": "contact",
    "HANDLE": "online_handle",
    "URL": "online_handle",
    "IP_ADDRESS": "identifier",
    "IBAN": "identifier",
    "PAYMENT_CARD": "identifier",
    "DATE_TIME": "other",
    "ORGANIZATION": "other",
    "SENSITIVE_GROUP": "other",
}


def build_receipt(counts: Mapping[str, int], *, detector_status: str) -> PrivacyReceipt:
    policy = {
        "SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY": (
            "deterministic_patterns_synthetic_fixture_only",
            "This tracked fictional fixture received deterministic identifier-pattern checks only; this is not evidence of real-text anonymisation.",
        ),
        "LOCAL_SPACY_APPLIED": (
            "deterministic_patterns_plus_local_spacy",
            "Identifier minimisation reduces exposure but cannot guarantee anonymity or remove all sensitive context.",
        ),
        "SYNTHETIC_TEST_DOUBLE_APPLIED": (
            "deterministic_patterns_plus_synthetic_test_double",
            "A synthetic test double exercised this privacy boundary; it is not evidence that spaCy or a production detector ran.",
        ),
    }
    if detector_status not in policy:
        raise ValueError("Privacy detector status is not approved")
    method, limitation = policy[detector_status]
    coarse = {
        "person_name": 0,
        "location": 0,
        "contact": 0,
        "online_handle": 0,
        "identifier": 0,
        "other": 0,
    }
    for key, value in counts.items():
        if value <= 0:
            continue
        category = _COARSE_CATEGORY.get(key, "other")
        coarse[category] += int(value)
    return PrivacyReceipt(
        method=method,
        redaction_counts=RedactionCounts(**coarse),
        redaction_total=sum(coarse.values()),
        local_ner_status=detector_status,
        text_released=False,
        text_persisted=False,
        limitation=limitation,
    )
