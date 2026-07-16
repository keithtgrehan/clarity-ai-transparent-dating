# Berlin AuDHD communication-engine integration validation

Status: historical T0 validation; merged as PR #3 at `f0c1b293c6e89117d60d4ff163390bee4fdf03c7`
Branch: `codex/berlin-audhd-dating-app`
Reviewed: 2026-07-15
Current launch decision: **GO for the local synthetic review branch only**

The separately authorized T1 readiness evidence is maintained in `T1_TECHNICAL_VALIDATION.md`, `T1_PII_BENCHMARK_REPORT.md` and `T1_IMPLEMENTATION_EVIDENCE.md`. That work does not broaden this T0 decision or open real-text, participant, received-content, audio, training or production gates.

## Scope and base

- Target repository: `keithtgrehan/clarity-ai-transparent-dating`.
- Base: current `origin/main` at `fd29954d954041969d8a6874890a77214a25fb00`.
- Clarity remains the client. The internal component is named Communication Signal Engine. Vibe Signal remains a separate donor/product with no shared profile selector, identity, message history or data store.
- This branch adds one disabled-by-default, development-only synthetic review flow. It does not add a participant service, public route, real text, received-message analysis, audio route, training job or production deployment.

## Donor state and imported evidence

The donor was read only throughout review:

- path: `/Users/keith/Documents/New project/vibe-signal`;
- branch/HEAD: `main` / `000ba0685f961e253b0d34c0b02539ac897356e9`;
- dirty state: modified `pyproject.toml`; untracked standalone engine, tests, synthetic fixture and research document;
- no reset, clean, stash, checkout, edit, stage or commit was performed in the donor.

Owner decisions D018 and D019 authorize this exact snapshot adaptation and its public draft-PR disclosure. The donor has no tracked project licence; those decisions do not create a general outbound or redistribution licence.

| Approved donor source | Git blob | SHA-256 | Clarity disposition |
|---|---|---|---|
| `src/vibesignal_ai/pipeline_engine.py` | `c192e82497b94a005492e595560e68ad46ab4938` | `8688a7640b369f4ca456b29d8baad045d4690606bb5804390622c92060ec744b` | Modularly adapted into `services/signal-engine/app` and `communication_signal_engine` |
| `tests/test_pipeline_engine.py` | `1a4a3999e64c9d0ca6242b1f0e263b51a8a512af` | `65d5cfeed45d4bc12db560accf25ea2c1a42f716f7b7e01e08dba258f20f4437` | Characterization split across unit, integration and security suites |
| `tests/fixtures/pipeline_engine/dating_signal_cases.json` | `3249e6633afb93390dfe1d17274f831e40b21c8f` | `c7af85f4cce2b2fa9d11da894f7e93021c074caf9ce7e752847bb0ded791a5e0` | All 18 fictional cases retained in a neutral-profile/canonical-cue matrix; unapproved semantic inference becomes explicit abstention |

The transformed target characterization fixture SHA-256 is `d97d8926f8d58fb2040d6b7b78dc03d897e2fa6a179d85a4bf3aa039e562fc72`. `DONOR_IMPORT_MANIFEST.md` is the authoritative path/transformation record. `npm run validate:donor-provenance` resolved all 91 exact pins and rechecked the three D018 bytes.

## Resulting architecture

1. The browser sends only a governed fixture ID, task, neutral presentation profile and explicit fictional-preview confirmation.
2. Fastify resolves the exact hashed fictional text server-side, enforces development/test-only flags, request/rate/response limits, loopback URL policy, an internal secret, no-store responses and silent route logging.
3. FastAPI rechecks the exact fixture hash/task/language authority, applies an 8 KiB body guard and releases content-free errors.
4. Identifier patterns run before downstream rules. A real local spaCy model is not approved, so the fictional-only route accurately reports `SYNTHETIC_FIXTURE_PATTERN_CHECK_ONLY`; an unallowlisted or future real-text path refuses without required NER. Test doubles are explicitly labelled and can be injected only through the test-only constructor gate.
5. The opaque attested text value is the only input to the canonical deterministic engine. The orchestrator is the sole composition point.
6. Schema v1 prohibits every semantic-model call. Offline flags are set before optional imports and semantics abstains. Inventory memory/time values are future admission ceilings, not runtime-sandbox claims.
7. Python and Zod responses use exact canonical cue, repair, limitation, privacy-receipt and provenance copy. Fabricated cue IDs, arbitrary bounded strings and PII canaries fail closed at both contracts. No input, redacted text, quotation, evidence snippet, vector or person inference can be returned.
8. Acoustic code is isolated, unrouted and unable to decode a raw file. It can characterize only caller-created synthetic numeric distributions. Managed-path status requires an opaque receipt created only after verified unlink; clearing and path-status claims are appended only after transient arrays are checked as cleared.

The supported Python launcher validates and binds loopback. Direct use of another ASGI launcher can bypass bind metadata, so documentation does not claim an absolute network boundary and the internal secret remains mandatory.

## Cue registry

`configs/cue_registry_v1.yml` contains 17 active canonical cues across `wording_support` and `structure_support`: directness, ambiguity, pressure wording, reassurance request/repetition, explicit repair, explicit transition, lexical-density and long-detail heuristics, processing request/window state, thinking-aloud and current-position markers, context reciprocity, channel offer and multi-question load.

The loader retains and executes each cue's rule, preconditions, profile, language support, test IDs, safe copy, limits and priority. The validator and Python suite enforce the exact v1 cue-to-handler/precondition policy, ensure every active cue has a governed positive case, reject unknown handlers/preconditions, and verify that all fixture expectations use canonical IDs. Deprecated migration aliases include `cognitive_load`, `cognitive_load_proxy`, `request_stacking`, `pressure_language`, `repair_attempt`, `repair_opportunity`, `linear_narrative_break` and `topic_shift`.

No cue infers diagnosis, neurotype, emotion, attraction, motive, compatibility, sincerity or relationship outcome. Long or dense turns are descriptive heuristics only and may coexist with rapport.

## Model inventory

`configs/model_inventory.yml` contains exactly two reviewed, unavailable candidates:

- required privacy NER: `explosion/spacy-models:xx_ent_wiki_sm-3.8.0`, revision `374ece89b2099818244f5a65ef466b89c0c392ae`, wheel SHA-256 `6f3c4b853852ea9e9d2dc76cc950dddb10a7e4c42d813308caefe6c5e8be2f0a`, MIT, `blocked_refuse` for non-fictional text;
- optional semantics: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, revision `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`, six reviewed upstream file hashes, Apache-2.0, `blocked_abstain`.

Both are remote metadata only: no weight/model artifact is in the repository or approved local root. Schema v1 enforces `model_execution=false`, `network_downloads=false`, `local_files_only=true`, `trust_remote_code=false` and telemetry-off environment variables. Tests cover identity mutation, checksum mismatch, local-verified-state rejection, no optional import/download attempt, missing model abstention and admission-bound memory/timeout rejection.

## Research and training disposition

- `RESEARCH_INDEX.md` consolidates 45 peer-reviewed publications, 10 official/legal/policy sources, four community-resource classes and 11 exact donor research references.
- `CANONICAL_RESEARCH_STATUS.md` records evidence limits: partner responsiveness and mutual repair are stronger product foundations than trait correction; pause/pitch behavior is context-, task-, device- and dialect-dependent; no direct AuDHD dating inference model is established.
- `TRAINING_ASSET_EXTRACTION.md` retains only abstract generation, hard-negative, balance, reviewer-process, fairness/unknown and calm-UI methods.
- Superseded taxonomy and dataset-radar documents moved to `docs/research/archive/2026-07-pre-consolidation/`.
- No Reddit post, YouTube comment, forum/support-group contribution, username, quotation, diagnosis, comment, thread, transcript, raw page, corpus or private-derived example was collected or retained.
- `configs/training_source_registry.yml` allows Clarity-authored fictional test fixtures only. Synthetic and real-data training remain disabled.

This is broad discovery, not an exhaustive literature claim, legal conclusion, participant validation or UrhG §60d authorization. GDPR Article 9 lawful-basis, purpose, DPIA, retention, security and data-subject work remain separate gates.

## Exact validation results

| Gate | Result |
|---|---|
| `npm test` | PASS: 25 TypeScript tests total — 20 passed and five pre-existing security TODOs; Python suite passed |
| Clean locked Python suite | PASS: 66 passed in a fresh Python 3.11 venv |
| Clean Python dependency consistency | PASS: hash-required lock install; Hatchling and Editables included; editable service installed with index/build isolation/dependency resolution disabled; `pip check` — no broken requirements |
| Python vulnerability audit | PASS: `pip-audit 2.10.1 -r requirements-dev.lock` — no known vulnerabilities found |
| `npm run typecheck` | PASS: shared, API and web |
| `npm run build` | PASS: shared, API and production web; production UI gate remains closed |
| Development UI gate | PASS: unit policy plus a real Vite development server transformed `App.tsx` with `DEV=true`, the explicit flag, and the synthetic review route; production build remains closed |
| Built adapter runtime | PASS: built Fastify bound `127.0.0.1`, called the supported loopback FastAPI launcher, returned 200 with exact canonical no-store JSON, and emitted no request-route log |
| `npm run verify:static` | PASS: assets, SPA fallback, API 404 and CORS allowlist |
| `npm run verify:mvp` | PASS with isolated synthetic store |
| Registry validation | PASS: resources, 91 donor pins, cues/models, training sources, hash-pinned Python lock and claims |
| Safety scans | PASS: restricted artifacts, no-raw-content, signal-language, domain residue, secrets and public copy |
| `npm audit --audit-level=high` | PASS threshold; one documented low-severity development `esbuild` advisory remains |
| `git diff --check` | PASS |

The Python lock was generated with Python 3.11 from `dev` plus `audio_research` using `pip-compile --generate-hashes`; its SHA-256 is `68964ad54059c9c2dae4bf4be30e2cc4283a7359aa44b340c400e52c002b85f4`. The build backend and editable helper are part of the hashed development closure. Optional NER and semantic-model extras are deliberately excluded because no model execution is approved.

## Independent review and remediation

Four read-only roles were used: donor auditor, licence researcher, privacy/safety reviewer and independent reviewer. Donor and licence reviews verified the snapshot and D018/D019 scope. The first privacy and independent passes correctly returned NO PASS and blocked publication. Their P1/P2 findings were remediated as follows:

- false spaCy receipts/default refusal → truthful fictional-pattern status and working allowlisted route;
- decorative registry/missing fixture references → executable registry, exact rule policy and all 18 donor cases;
- arbitrary response strings/PII leakage and asymmetric contracts → exact canonical cross-language IDs/copy/provenance at both Pydantic and Zod boundaries plus field-wide canaries;
- declarative model controls → schema-v1 no-execution policy plus mutation/checksum/no-import/admission-bound tests;
- Clear/configuration/confirmation stale-result races and missing preview → disabled in-flight controls, revision invalidation, abort on clear, delayed-result tests and visible fictional/redaction simulation;
- inaccurate audio unlink status → typed path status;
- loopback, double-scan and clearing overclaims → corrected architecture/launcher language;
- polluted Python environment and unpinned editable-build isolation → hash-pinned runtime/build/editable closure, offline no-build-isolation install, clean venv, `pip check` and `pip-audit`;
- production-build UI exposure → development-environment guard in addition to the flag.

The final privacy/safety and independent rereviews both report PASS with no unresolved P0–P2. Their dispositions are recorded in `AGENT_STATUS.md` and the draft PR.

## Unsupported donor claims

The branch does not carry forward these donor claims/capabilities:

- identifier-removal, anonymity, deletion or secure-erasure guarantees;
- branded or diagnosis-adjacent analysis modes;
- emotion, confidence, flat-affect, cognitive-state, neurotype, attraction or compatibility inference;
- acoustic syllable ground truth or cross-accent psychological interpretation;
- runtime model download, arbitrary installed-model discovery or unpinned embeddings;
- a raw-audio decoder/route;
- semantic transition cues without an approved model and validation;
- model quality, benchmark, peer-review or production-readiness claims.

## Open risks and gates

- Five existing v1 security TODOs remain: server-owned authentication, conversation authorization, report relationship validation, privileged destructive seeding and production-default-deny CORS. They predate this slice and block participant use.
- The repository and donor have no general project licence. D018/D019 are narrow owner decisions, not an outbound licence.
- No NER or semantic model is approved locally; real text cannot advance on this architecture state.
- US/UK/Euro-English and mixed-language behavior is synthetic characterization only, not fairness or robustness validation.
- No Berlin participant, accessibility-user, privacy-owner, legal, clinical, moderation or production review has approved launch.
- No real-data retention/deletion/export, authentication/authorization, DPIA, incident response, appeals, payment or deployment gate is complete.

## Launch status

**GO**

- local review branch;
- tracked fictional fixture selection;
- development/test-only Fastify-to-FastAPI analysis;
- deterministic wording/structure observations, low-signal abstention and one editable fictional repair;
- isolated synthetic acoustic feature tests with no decoder or route.

**NO GO**

- private beta or public traffic;
- real user-authored text or pasted/uploaded transcript;
- received-message or third-party excerpt analysis;
- any audio upload, decoding or public/private audio route;
- synthetic model training or real-data training;
- participant recruitment/acquisition, payment conversion or production deployment/launch.

## Exact next gated goal

Close SG1 before any real text: replace legacy client-supplied identity with server-owned authentication/authorization; complete purpose-specific consent and DPIA/data-lifecycle design; provision and independently benchmark an exact local NER artifact across the declared language contexts; run accessibility, privacy, security and participant-harm review; and record an owner GO decision. Until all SG1 evidence exists, the real-text flags and production UI/server gates remain hard false.
