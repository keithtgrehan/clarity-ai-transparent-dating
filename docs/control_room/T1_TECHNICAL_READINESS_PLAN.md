# T1 self-authored-draft technical readiness plan

Status: implementation authorized by D020; real-text gate closed

The slice adds separate v2 prepare/review/continue/clear contracts, default-deny flags, trusted authentication and purpose-consent interfaces, bounded transient stores, local-model admission refusal, a fictional PII benchmark, disabled UI scaffolding and security tests. T0 v1 behavior remains unchanged.

Acceptance requires exact contract parity, generic no-store errors, no raw-content leakage, cross-subject denial, consent withdrawal invalidation, token replay refusal, expiry/capacity/restart/race tests, model/no-network refusal, fictional dialect fixtures, accessible disabled UI evidence, complete regression validation and independent P0–P2 clearance.

The protocol is executable only with explicitly injected test-only identity, consent and privacy dependencies. Environment configuration cannot enable real user-authored text in this goal.

Gate wording:

- **GO:** local synthetic T1 protocol and security review only.
- **NO GO:** real user-authored text, participant use, received excerpts, audio, model downloads, any model training, deployment, payment, public access or launch.
