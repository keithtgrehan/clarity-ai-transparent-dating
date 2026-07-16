from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import pytest

from communication_signal_engine.privacy.redaction import PrivacyMinimizer
from communication_signal_engine.contracts import ProfileId
from communication_signal_engine.limits import PrivacyBoundaryError
from communication_signal_engine.semantic.model_loader import load_model_inventory
from communication_signal_engine.t1_sessions import (
    DEFAULT_MAX_SESSIONS,
    DEFAULT_MAX_TEXT_BYTES,
    DEFAULT_TTL_SECONDS,
    SessionCapacityError,
    SessionUnavailableError,
    T1SessionStore,
)


def _sanitized(detector, text: str):
    return PrivacyMinimizer(
        detector,
        model_entry=load_model_inventory().privacy_ner,
        allow_test_detector=True,
    ).minimize(text, "en-EU")


def _create(store: T1SessionStore, detector, text: str = "Five fictional words are here now."):
    return store.create(
        sanitized=_sanitized(detector, text),
        task="draft_review",
        profile_id=ProfileId.WORDING_SUPPORT,
        language_tag="en-EU",
        preview_hash="0" * 64,
        admission_snapshot="pa_" + "1" * 64,
    )


def test_reviewed_store_limits_cannot_be_exceeded() -> None:
    assert DEFAULT_TTL_SECONDS == 600
    assert DEFAULT_MAX_SESSIONS == 1_000
    assert DEFAULT_MAX_TEXT_BYTES == 16 * 1024 * 1024
    with pytest.raises(ValueError):
        T1SessionStore(ttl_seconds=601)
    with pytest.raises(ValueError):
        T1SessionStore(max_sessions=1_001)
    with pytest.raises(ValueError):
        T1SessionStore(max_text_bytes=DEFAULT_MAX_TEXT_BYTES + 1)


def test_default_store_accepts_exactly_one_thousand_active_sessions(detector) -> None:
    store = T1SessionStore()
    sanitized = _sanitized(detector, "Five fictional words are here now.")
    for index in range(DEFAULT_MAX_SESSIONS):
        store.create(
            sanitized=sanitized,
            task="draft_review",
            profile_id=ProfileId.WORDING_SUPPORT,
            language_tag="en-EU",
            preview_hash=f"{index:064x}",
            admission_snapshot="pa_" + "1" * 64,
        )
    assert store.active_count == DEFAULT_MAX_SESSIONS
    with pytest.raises(SessionCapacityError):
        store.create(
            sanitized=sanitized,
            task="draft_review",
            profile_id=ProfileId.WORDING_SUPPORT,
            language_tag="en-EU",
            preview_hash="f" * 64,
            admission_snapshot="pa_" + "1" * 64,
        )


def test_utf8_bytes_are_counted_aggregately_and_released(detector) -> None:
    text = "Élodie fictional words stay bounded."
    expected = len(text.encode("utf-8"))
    store = T1SessionStore(max_text_bytes=expected * 2 - 1)
    first = _create(store, detector, text)
    assert first.text_bytes == expected
    assert store.total_text_bytes == expected
    with pytest.raises(SessionCapacityError):
        _create(store, detector, text)
    store.clear(first.internal_nonce)
    assert store.total_text_bytes == 0


def test_concurrent_continue_has_exactly_one_winner(detector) -> None:
    store = T1SessionStore()
    session = _create(store, detector)

    def consume() -> bool:
        try:
            leased = store.consume(
                session.internal_nonce,
                admission_snapshot=session.admission_snapshot,
                current_snapshot=session.admission_snapshot,
            )
            store.finish(leased)
            return True
        except SessionUnavailableError:
            return False

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(lambda _index: consume(), range(16)))
    assert results.count(True) == 1
    assert results.count(False) == 15
    assert store.active_count == 0
    assert store.total_text_bytes == 0


def test_expiry_timer_removes_idle_session_without_a_later_store_call(detector) -> None:
    store = T1SessionStore(ttl_seconds=1)
    session = _create(store, detector)
    assert session.revocation.wait(timeout=2.0) is True
    assert store._sessions == {}
    assert store.total_text_bytes == 0
    store.close()


def test_clear_revokes_an_inflight_lease_before_release(detector) -> None:
    store = T1SessionStore()
    prepared = _create(store, detector)
    leased = store.consume(
        prepared.internal_nonce,
        admission_snapshot=prepared.admission_snapshot,
        current_snapshot=prepared.admission_snapshot,
    )
    store.clear(prepared.internal_nonce)
    with pytest.raises(PrivacyBoundaryError, match="revoked"):
        store.require_not_revoked(leased)
    store.finish(leased)
    assert store.total_text_bytes == 0
    store.close()


def test_expiry_and_clear_are_reference_removal_not_erasure_claims(detector) -> None:
    wall_now = [100.0]
    monotonic_now = [50.0]
    store = T1SessionStore(
        wall_clock=lambda: wall_now[0],
        monotonic_clock=lambda: monotonic_now[0],
    )
    session = _create(store, detector)
    wall_now[0] -= 3_600
    monotonic_now[0] += DEFAULT_TTL_SECONDS + 1
    assert store.active_count == 0
    with pytest.raises(SessionUnavailableError):
        store.consume(
            session.internal_nonce,
            admission_snapshot=session.admission_snapshot,
            current_snapshot=session.admission_snapshot,
        )
    store.clear(session.internal_nonce)
    store.clear(session.internal_nonce)
    assert store.total_text_bytes == 0
