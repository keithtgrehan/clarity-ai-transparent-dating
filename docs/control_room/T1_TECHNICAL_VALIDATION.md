# T1 technical-readiness validation

Status: implementation, automated validation and four final read-only reviews pass; draft PR ready

Branch: `codex/signal-t1-readiness`

Base: `f0c1b293c6e89117d60d4ff163390bee4fdf03c7`

Validated: 2026-07-15

## Automated evidence

| Check | Result |
|---|---|
| `npm ci` | PASS; clean workspace install, one pre-existing low advisory |
| `npm test` | PASS; API 43 total: 38 passed and five pre-existing SEC TODOs; rendered web UI 8 passed; Python 101 passed |
| Fresh locked Python environment | PASS; Python 3.11 venv with `include-system-site-packages = false`, hash-required lock install, 101 passed against FastAPI 0.139.0 |
| Fresh `python -m pip check` | PASS; no broken requirements |
| Fresh `python -m pip_audit -r services/signal-engine/requirements-dev.lock` | PASS with pip-audit 2.10.1; no known vulnerabilities |
| `npm run typecheck` | PASS; shared, API and web |
| `npm run build` | PASS; shared, API and web |
| `npm run quality` | PASS; complete composed gate |
| `npm run check:t1-production-bundle` | PASS; no T1 page chunk, route, endpoint marker or UI copy in the production build |
| `npm run verify:static` / `verify:mvp` | PASS |
| Registry validation | PASS; resources, signals/models, training sources, research sources and Python lock |
| Governance/safety scans | PASS; claims, restricted artifacts, raw content, signal language/domain residue, secrets and public copy |
| No-network behavior | PASS; autouse socket denial plus offline Hugging Face/Transformers environment across Python tests |
| Exact T1 cross-language contract | PASS; a deterministic real Python T1 response equals the tracked fixture; a shared multi-field mutation corpus proves both Python and Zod reject fabricated cue copy, rule IDs, repair copy, limitations and detector provenance |
| Rendered UI/accessibility checks | PASS; keyboard order, focus transfer, polite status, focused error alert, expiry timer, stale-state cleanup, reduced motion and responsive CSS policies |
| Fictional PII harness | PASS; governed fixture SHA `bbdd95c8c3779827f72c5c1103b8a83423192d576fff761b4ba1449d6504abea`; 8 cases, 16/16 direct spans, 1.000 recall/precision, 0 refusals, 2 contextual limitations; exact report in `T1_PII_BENCHMARK_REPORT.md` |
| `npm audit --audit-level=high` | PASS threshold; one documented low development advisory remains |
| `git diff --check` | PASS |

The repository `.venv` is intentionally not used as dependency-consistency evidence because it includes unrelated workspace packages and reports pre-existing WhisperX/Pyannote/Torch/NumPy/OpenTelemetry conflicts. The clean isolated environment above is the authoritative T1 Python result; no dependency or model artifact was changed to hide the workspace conflict.

## Review disposition

Four requested read-only roles reviewed the complete diff: privacy/safety, Clarity regression, licence/model provenance and independent implementation. All four returned final PASS with no unresolved P0–P2. Independent-review remediation added prepare-withdrawal release barriers, rate-exhaustion-safe clear, exact Python/Zod provenance parity, coordinated cross-language mutation tests and CI parity for research provenance and production compile-out. Provenance remediation added working pinned model evidence, WikiNER/CC BY 4.0 attribution, complete direct-dependency registration and a cryptographically bound D020 fictional-fixture manifest. Human-owner fixture review remains explicitly required before merge. The only review P3s are a future migration from deprecated Starlette `TestClient`/`httpx` integration to `httpx2` (Backlog 31) and the low Windows-only esbuild development-server advisory. Automated review is not legal approval or production security certification.

## Remaining blockers

- No production authentication/authorization provider or durable consent authority is approved; SEC-001–SEC-005 remain open.
- No lawful-basis, Article 9, DPIA, retention/deletion, participant-harm or qualified legal/privacy decision authorizes real drafts.
- No local privacy NER artifact is admitted or independently benchmarked. The fictional test double is not production evidence.
- Dialect/code-switch behavior, contextual identifier risk, accessibility with target users and adverse-use handling are not participant-validated.
- No participant recruitment, received-content authority, audio/voice boundary, training source/label approval, payment, deployment or operational launch gate has passed.

## Decision

- **GO:** local synthetic T1 protocol and security review only.
- **NO GO:** real user-authored text, participant use, received excerpts, audio, model downloads, any model training, deployment, payment, public access or launch.
