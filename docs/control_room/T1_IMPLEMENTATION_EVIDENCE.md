# T1 technical-readiness implementation evidence

Status: implemented for local synthetic protocol/security review; real-text gate closed

Branch: `codex/signal-t1-readiness`

Base: `f0c1b293c6e89117d60d4ff163390bee4fdf03c7`

Authorization: D020

## Boundaries implemented

- Separate public and private v2 prepare/continue/clear contracts; T0 v1 is unchanged.
- Environment settings cannot enable user-authored text, received excerpts, audio, training or production. Executable T1 tests require injected test-only dependencies and both test environment markers.
- Fastify owns authenticated subject context, purpose-consent lookup/withdrawal, a hashed 256-bit public review token, session-bound preview HMAC and the internal-nonce mapping. Body, path and query identity never establish authority. Prepare rechecks exact consent and admission before and after session creation; a withdrawal revision barrier prevents an in-flight private prepare from releasing a stale public session.
- FastAPI receives no subject, diagnosis, profile-matching or research context. It stores only minimized text under a random internal nonce.
- Both stores are process-local and bounded to ten minutes, 1,000 sessions and 16 MiB minimized UTF-8 text. Monotonic nearest-expiry timers remove idle material without requiring a later request and cannot be extended by wall-clock rollback. Same-subject replacement checks projected capacity before atomically displacing the prior mapping. Continue is atomic/single-use; new prepare, clear, expiry, terminal failure, withdrawal or restart invalidates state.
- Prepare releases only the minimized review artifact. Continue rechecks consent, subject binding, admission state and residual identifiers, then releases at most three canonical deterministic cues, rule IDs, permitted sanitized offsets and one editable action. No source or preview text enters the final result.
- Errors and operational behavior are content-free and no-store. Authenticated clear is idempotent, compensates across both services and remains available when the analysis rate bucket is exhausted; reference removal is not represented as physical erasure.
- The UI is development-only, dual-gated and compiled out of the production page bundle. It is absent from navigation/routes when closed and has no autosave, browser storage, URL text, urgency, score, received-message or audio path. A successful prepare clears the original draft from React state; edit, expiry, clear, ambiguous continue failure and unmount exercise the idempotent clear path, and stale responses are suppressed.

## Security and regression evidence

Executable tests cover missing/trusted auth, body-ID refusal, test-provider guards, exact consent policy/notice/effective-grant binding, unrelated/withdrawn states, cross-subject denial, token format/hash/replay, one-session replacement, same-subject replacement capacity failure, timer-driven idle expiry, wall-clock rollback, restart, 1,000/16 MiB capacity, multibyte limits, admission drift, semantic abstention, residual refusal, raw/error/log canaries, request/response bounds, no-store headers, rate-exhaustion-safe clear, blocked-prepare withdrawal, clear/continue and withdrawal/continue races, in-flight lease revocation, no-network enforcement, closed UI gates and rendered keyboard, focus, status, error, timer, reduced-motion and responsive behavior. A deterministic response produced by the real Python T1 engine is checked against its tracked fixture and the exact public TypeScript schema; one shared coordinated mutation corpus proves both validators reject fabricated cue, repair, limitation and detector-provenance combinations. The fresh locked environment also exercises the supported FastAPI lifespan shutdown path.

The canonical risks R24–R30 record the remaining token, race, capacity, cross-service, fingerprint, benchmark and development-exposure risks. SEC-001–SEC-005 remain open for legacy/product production security. The test authentication and consent providers do not close them.

## Model disposition

`configs/model_inventory.yml` schema 1.1 records exact remote candidate identity, revision, artifact hashes, working revision-specific licence evidence, WikiNER/CC BY 4.0 upstream attribution, language limitations and blocked uses. `docs/legal/THIRD_PARTY_MODEL_NOTICES.md` preserves the reviewed notices without approving distribution or runtime use. Both entries have no local path, no registry admission cross-link, no benchmark reference, no approved environment/language and no enforced memory/timeout claim. Runtime download, telemetry and remote code are disabled. Required privacy processing refuses; optional semantics abstains. No model was added to the repository, approved, loaded or trained.

## Data and rights disposition

All new fixtures are Clarity-authored and wholly fictional. `configs/t1_fictional_fixture_manifest.yml` binds D020 authorization, generation/source exclusions, independent review, synthetic split, bounded permission and exact SHA-256; human-owner review is required before merge. The research-source registry permits bibliographic/aggregate limitation work only and prohibits public-content collection, quotations, corpus rows, labels, benchmarks and training. No participant or public-source content entered the implementation. This is engineering evidence, not GDPR lawful-basis, Article 9, UrhG §60d, legal, clinical, privacy or security certification.

## Gate

- **GO:** local synthetic T1 protocol and security review only.
- **NO GO:** real user-authored text, participant use, received excerpts, audio, model downloads, any model training, deployment, payment, public access or launch.
