"""Bounded process-local storage for minimised T1 review sessions."""

from __future__ import annotations

import secrets
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable

from .contracts import ProfileId, SanitizedText
from .limits import InputBoundaryError, PrivacyBoundaryError

DEFAULT_TTL_SECONDS = 600
DEFAULT_MAX_SESSIONS = 1_000
DEFAULT_MAX_TEXT_BYTES = 16 * 1024 * 1024


class SessionUnavailableError(InputBoundaryError):
    """An internal nonce is absent, expired, cleared, or already consumed."""


class SessionCapacityError(InputBoundaryError):
    """The bounded transient store cannot accept another session."""


class SessionAdmissionChangedError(InputBoundaryError):
    """The admission snapshot no longer matches the prepared session."""


@dataclass(frozen=True, slots=True)
class T1Session:
    internal_nonce: str
    sanitized: SanitizedText
    text_bytes: int
    task: str
    profile_id: ProfileId
    language_tag: str
    preview_hash: str
    admission_snapshot: str
    expires_at_epoch: float
    expires_at_monotonic: float
    revocation: threading.Event

    @property
    def expires_at(self) -> datetime:
        return datetime.fromtimestamp(self.expires_at_epoch, tz=timezone.utc)


class T1SessionStore:
    """Thread-safe, bounded and non-persistent minimised-text store.

    Deleting a Python reference is not physical memory erasure. The store does
    not write sessions to disk, analytics, backups, or caches; process restart
    invalidates every nonce.
    """

    def __init__(
        self,
        *,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
        max_sessions: int = DEFAULT_MAX_SESSIONS,
        max_text_bytes: int = DEFAULT_MAX_TEXT_BYTES,
        wall_clock: Callable[[], float] = time.time,
        monotonic_clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if not 1 <= ttl_seconds <= DEFAULT_TTL_SECONDS:
            raise ValueError("T1 session TTL exceeds the reviewed maximum")
        if not 1 <= max_sessions <= DEFAULT_MAX_SESSIONS:
            raise ValueError("T1 session capacity exceeds the reviewed maximum")
        if not 1 <= max_text_bytes <= DEFAULT_MAX_TEXT_BYTES:
            raise ValueError("T1 text capacity exceeds the reviewed maximum")
        self._ttl_seconds = ttl_seconds
        self._max_sessions = max_sessions
        self._max_text_bytes = max_text_bytes
        self._wall_clock = wall_clock
        self._monotonic_clock = monotonic_clock
        self._sessions: dict[str, T1Session] = {}
        self._inflight: dict[str, T1Session] = {}
        self._total_text_bytes = 0
        self._lock = threading.RLock()
        self._expiry_timer: threading.Timer | None = None

    @property
    def active_count(self) -> int:
        with self._lock:
            self._purge_expired()
            self._schedule_expiry_locked()
            return len(self._sessions) + len(self._inflight)

    @property
    def total_text_bytes(self) -> int:
        with self._lock:
            self._purge_expired()
            self._schedule_expiry_locked()
            return self._total_text_bytes

    def create(
        self,
        *,
        sanitized: SanitizedText,
        task: str,
        profile_id: ProfileId,
        language_tag: str,
        preview_hash: str,
        admission_snapshot: str,
    ) -> T1Session:
        text_bytes = len(sanitized._read_attested().encode("utf-8"))
        with self._lock:
            self._purge_expired()
            self._schedule_expiry_locked()
            if (
                len(self._sessions) + len(self._inflight) >= self._max_sessions
                or self._total_text_bytes + text_bytes > self._max_text_bytes
            ):
                raise SessionCapacityError("Transient T1 session capacity is exhausted")
            nonce = self._new_nonce()
            expires = self._wall_clock() + self._ttl_seconds
            expires_monotonic = self._monotonic_clock() + self._ttl_seconds
            session = T1Session(
                internal_nonce=nonce,
                sanitized=sanitized,
                text_bytes=text_bytes,
                task=task,
                profile_id=profile_id,
                language_tag=language_tag,
                preview_hash=preview_hash,
                admission_snapshot=admission_snapshot,
                expires_at_epoch=expires,
                expires_at_monotonic=expires_monotonic,
                revocation=threading.Event(),
            )
            self._sessions[nonce] = session
            self._total_text_bytes += text_bytes
            self._schedule_expiry_locked()
            return session

    def consume(self, nonce: str, *, admission_snapshot: str, current_snapshot: str) -> T1Session:
        """Atomically consume a nonce before downstream analysis.

        Snapshot mismatch is terminal: the session is removed before the
        content-free error is raised, so retries cannot analyze stale state.
        """

        with self._lock:
            self._purge_expired()
            self._schedule_expiry_locked()
            session = self._sessions.pop(nonce, None)
            if session is None:
                raise SessionUnavailableError("T1 session is unavailable")
            if (
                not secrets.compare_digest(admission_snapshot, session.admission_snapshot)
                or not secrets.compare_digest(current_snapshot, session.admission_snapshot)
            ):
                session.revocation.set()
                self._total_text_bytes -= session.text_bytes
                self._schedule_expiry_locked()
                raise SessionAdmissionChangedError("T1 admission state changed")
            self._inflight[nonce] = session
            self._schedule_expiry_locked()
            return session

    def finish(self, session: T1Session) -> None:
        """Release accounting after a leased analysis reaches a terminal state."""

        with self._lock:
            current = self._inflight.pop(session.internal_nonce, None)
            if current is not None:
                self._total_text_bytes -= current.text_bytes

    @staticmethod
    def require_not_revoked(session: T1Session) -> None:
        if session.revocation.is_set():
            raise PrivacyBoundaryError("T1 session was revoked during analysis")

    def clear(self, nonce: str) -> None:
        """Idempotently remove a session reference."""

        with self._lock:
            self._purge_expired()
            session = self._sessions.pop(nonce, None)
            if session is not None:
                session.revocation.set()
                self._total_text_bytes -= session.text_bytes
            inflight = self._inflight.pop(nonce, None)
            if inflight is not None:
                inflight.revocation.set()
                self._total_text_bytes -= inflight.text_bytes
            self._schedule_expiry_locked()

    def close(self) -> None:
        """Cancel expiry work and revoke every process-local reference."""

        with self._lock:
            if self._expiry_timer is not None:
                self._expiry_timer.cancel()
                self._expiry_timer = None
            for session in (*self._sessions.values(), *self._inflight.values()):
                session.revocation.set()
            self._sessions.clear()
            self._inflight.clear()
            self._total_text_bytes = 0

    def _new_nonce(self) -> str:
        for _ in range(8):
            nonce = f"sn_{secrets.token_hex(32)}"
            if nonce not in self._sessions and nonce not in self._inflight:
                return nonce
        raise SessionCapacityError("Could not allocate a unique transient nonce")

    def _purge_expired(self) -> None:
        now = self._monotonic_clock()
        for nonce, session in tuple(self._sessions.items()):
            if session.expires_at_monotonic <= now:
                self._sessions.pop(nonce, None)
                session.revocation.set()
                self._total_text_bytes -= session.text_bytes
        for nonce, session in tuple(self._inflight.items()):
            if session.expires_at_monotonic <= now:
                self._inflight.pop(nonce, None)
                session.revocation.set()
                self._total_text_bytes -= session.text_bytes

    def _schedule_expiry_locked(self) -> None:
        if self._expiry_timer is not None:
            self._expiry_timer.cancel()
            self._expiry_timer = None
        all_sessions = (*self._sessions.values(), *self._inflight.values())
        if not all_sessions:
            return
        next_expiry = min(session.expires_at_monotonic for session in all_sessions)
        delay = max(0.0, next_expiry - self._monotonic_clock())
        timer = threading.Timer(delay, self._expire_due)
        timer.daemon = True
        self._expiry_timer = timer
        timer.start()

    def _expire_due(self) -> None:
        with self._lock:
            self._expiry_timer = None
            self._purge_expired()
            self._schedule_expiry_locked()
