# T1 retention and deletion boundary

Status: technical-readiness design; not a participant retention approval

- Raw draft text exists in the user's current React form state before submission and in transient request memory during prepare. A successful prepare clears that original form value; clear and expiry also clear it. Failed preparation leaves the caller's editable form value in the current tab. It is never written by this scaffold to disk, logs, traces, analytics, URLs, browser storage or backups.
- The Python readiness store may retain only minimized text under a random internal nonce for at most ten minutes. A monotonic nearest-expiry timer removes idle sessions and revokes/removes store references to in-flight leases without waiting for a later request. A worker already holding a local reference may retain managed-memory bytes until it reaches the next revocation check; this is covered by the physical-erasure limitation below.
- Fastify retains only a hashed public token, authenticated subject binding, exact consent policy/notice/effective-grant binding, internal nonce, minimized preview metadata and protocol state. It does not retain raw text. Its monotonic nearest-expiry timer removes idle mappings and later removes content-free replay tombstones. Wall time is used only for the displayed `expiresAt` value and cannot extend the lifecycle deadline.
- One active session is allowed per subject. Continue, terminal failure, clear, withdrawal, expiry or process restart invalidates the session.
- Clear is idempotent and attempts compensating cleanup across both services. An in-flight Python lease is marked revoked and checks that state between analysis stages. A synchronous stage already executing may run until its next check; Fastify aborts transport and rechecks consent/revocation before release, so a late result is suppressed. This is best-effort cancellation, not a claim that CPU work or memory disappears instantly.
- Operational events contain only outcome codes and version identifiers; no text, token, model path or identifier is allowed.
- Managed-runtime reference removal is not physical erasure and does not cover caller copies, crash dumps, swap, snapshots or infrastructure backups.

No participant retention period or lawful basis is established here. `retention_policy.md`, the DPIA and qualified legal/privacy review remain authoritative before any real processing.
