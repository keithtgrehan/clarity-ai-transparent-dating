# Berlin AuDHD integration risk view

Status: scoped index; `RISK_REGISTER.md` is the canonical risk authority

The integration-specific critical risks are R01/R02/R10/R15/R19/R20/R23 and T1-specific R24–R30. Those additions track token theft or replay, cross-subject access, consent-withdrawal races, transient-store exhaustion, divergent Fastify/FastAPI cleanup, stale detector/ruleset admission, preview fingerprinting, benchmark overclaim and development-gate exposure.

Mitigations required in the readiness scaffold are 256-bit public tokens stored only as hashes, a separate internal nonce, subject and consent binding, ten-minute expiry, single-use consumption, one active session per subject, 1,000-session and 16 MiB limits, no-store/silent routes, generic errors, consent-triggered invalidation, compensating clear, residual privacy refusal and non-linkable session-bound preview hashes.

These mitigations reduce technical risk in synthetic tests. They do not close SEC-001–SEC-005, establish a lawful basis, approve an NER artifact, or authorize real text.
