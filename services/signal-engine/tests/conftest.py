"""Synthetic-only test helpers; no participant or copied public content."""

from __future__ import annotations

import socket
from collections.abc import Sequence

import pytest

from communication_signal_engine.contracts import (
    ProfileId,
    SourceAuthority,
    SyntheticAnalysisRequest,
    TaskId,
)
from communication_signal_engine.privacy.redaction import EntitySpan


@pytest.fixture(autouse=True)
def block_outbound_network(monkeypatch):
    """All signal-engine tests are local and fail if code opens a socket."""

    def refused(*_args, **_kwargs):
        raise AssertionError("Outbound network access is prohibited in signal-engine tests")

    monkeypatch.setenv("HF_HUB_OFFLINE", "1")
    monkeypatch.setenv("TRANSFORMERS_OFFLINE", "1")
    monkeypatch.setenv("HF_HUB_DISABLE_TELEMETRY", "1")
    monkeypatch.setattr(socket, "create_connection", refused)
    monkeypatch.setattr(socket.socket, "connect", refused)


FIXTURES = {
    "wording_us_direct": "I would like to meet on Saturday afternoon. If that does not work, another day is fine.",
    "wording_gb_repair": "I think my earlier note was unclear. What I meant was: maybe we could meet on Saturday afternoon, if that is okay.",
    "structure_eu_transition": "By the way, the museum sounds good. Looping back, I prefer a quiet cafe first, and then I can decide after I check the time.",
    "low_signal_greeting": "Hello there.",
}


class SyntheticMultilingualDetector:
    """Explicit test double, never a production NER substitute."""

    receipt_status = "SYNTHETIC_TEST_DOUBLE_APPLIED"

    def supports(self, _language_tag: str) -> bool:
        return True

    def detect(self, _text: str, _language_tag: str) -> Sequence[EntitySpan]:
        return ()


@pytest.fixture
def detector() -> SyntheticMultilingualDetector:
    return SyntheticMultilingualDetector()


def request_for(fixture_id: str, profile: ProfileId) -> SyntheticAnalysisRequest:
    metadata = {
        "wording_us_direct": (TaskId.DRAFT_REVIEW, "en-US"),
        "wording_gb_repair": (TaskId.MESSAGE_EXCERPT_REVIEW, "en-GB"),
        "structure_eu_transition": (TaskId.DRAFT_REVIEW, "en-EU"),
        "low_signal_greeting": (TaskId.DRAFT_REVIEW, "en-EU"),
    }
    task, language = metadata[fixture_id]
    return SyntheticAnalysisRequest(
        fixture_id=fixture_id,
        task=task,
        profile_id=profile,
        language_tag=language,
        text=FIXTURES[fixture_id],
        authority=SourceAuthority(source_class="synthetic_fixture", review_confirmed=True),
    )
