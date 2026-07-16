# Communication Signal Engine modularization

Status: canonical import and composition boundary

`contracts` and registry types import no HTTP, storage or model infrastructure. `privacy` is the sole raw-text boundary. Cue and semantic modules accept only attested minimized text. Audio remains optional and unrouted. `orchestrator` is the only composition layer. FastAPI routes authenticate the Fastify service and delegate; they do not own product identity or consent.

T0 remains `/internal/v1/communication-analysis/text` with exact fictional fixture attestation. T1 uses separate `/internal/v2/communication-analysis/text/{prepare,continue,clear}` contracts. Fastify owns user authentication, exact purpose/policy/notice/effective-consent binding and the public-token mapping. Python stores only minimized text under an unrelated internal nonce during the ten-minute review window; no subject identity, diagnosis, matching profile or research context enters the engine. Both stores schedule monotonic nearest-expiry cleanup rather than waiting for another request; wall time is presentation metadata only.

Prepare performs privacy minimization only. Continue leases the prepared session atomically, verifies consent, model/ruleset state and residual privacy policy, then runs deterministic analysis. Semantic processing abstains unless separately admitted. Clear revokes an in-flight Python lease, aborts Fastify transport and suppresses late release; synchronous CPU work may continue until the next revocation check. No code claims instant cancellation or physical memory erasure.
