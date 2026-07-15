# Phase 0/1 validation report

Branch: `codex/clarity-governance-foundation`

Reviewed HEAD/baseline: `aa6282f67a24a990d4835649765cce9f9f35dae1`

Validation snapshot: `2026-07-14T03:39:35+02:00` (Europe/Berlin)

Cutline: Issues 1–13 only

Reviewed working-tree state: uncommitted and unstaged on the named branch, with 92 intended changed paths: 34 tracked modifications and 58 new/untracked files. The new paths are the planned governance/configuration, Control Room/legal/product/research/safety documents, tests, static/provenance validators, CI, and repository/agent instructions. The modified paths are dependency/tooling files, bounded verifier/app construction, truthful existing documentation, and synthetic-only UI copy. No unrelated user change or out-of-cutline runtime package was identified.

## Outcome

The Phase 0/1 foundation is locally reproducible and preserves the characterized v1 schemas, API routes, and deterministic match ordering. It is approved only as a synthetic local development artifact. It is not participant-, research-, beta-, production-, accessibility-, privacy-, safety-, or legal-readiness evidence.

No Phase 2 package, v2 schema/route, matching redesign, diagnosis migration, production authentication/store, moderator application, research collection, dataset/model work, deployment, or merge was introduced.

Decision: **GO for staging, committing, pushing this branch, and opening the requested draft PR only**, after the final independent spot re-review records no unresolved P0–P2. **NO-GO for merge, participant/research use, closed beta, launch, production/deployment, or Phase 2 implementation.**

## Validation environment and exact results

- Node `v22.23.1`; npm `10.9.8`.
- `npm ci`: passed; 159 packages installed; one low advisory reported.
- `npm run build`: passed for shared, API, and web; Vite `8.1.4` produced the SPA and two static assets.
- `npm run typecheck`: passed for all three workspaces.
- `npm run quality`: passed. It ran tests, typecheck, build, static verification, bounded MVP smoke, both registry validators, and restricted/raw/public-copy checks.
- `npm run verify:mvp`: passed within the 30-second outer timeout and removed its temporary store.
- `npm test --workspaces --if-present`: passed with 8 implemented tests and 5 intentional security TODOs.
- `npm audit --audit-level=high`: exited 0 with zero high/moderate findings and one low transitive `esbuild` finding.
- `npm run validate:donor-provenance`: passed 77/77 exact commit/path/blob pins across the three local donors.
- `git diff --check`: passed.

Additional repository checks passed:

- 13 JSON files in `git ls-files --cached --others --exclude-standard` parsed; shared-schema tests accepted the tracked synthetic seed and rejected malformed onboarding.
- 3 YAML files in the same reviewed inventory parsed (`quality.yml` plus both registries), and both registry validators passed.
- 8 TOML files parsed, including `.codex/config.toml` and all seven agent definitions.
- Bounded secret-pattern scan found no private keys, GitHub tokens, Google API keys, or AWS access-key patterns.
- Restricted artifact, raw-content, and public-copy scanners passed.
- Runtime finance/ticker residue scan over `apps`, `packages`, and `scripts` found no earnings-call, ticker, trading-signal, stock-price, or financial-sentiment semantics.
- Data contact-domain scan found no common personal email domain; fixtures are documented synthetic records using reserved example/test domains.
- `npm ls --depth=0` resolved cleanly with no missing or extraneous package.

The claims validator checks matrix structure and evidence-path existence; it does not prove every prose claim. A manual claim review therefore also covered the README and every web route. Outcome/compatibility language was changed to product-hypothesis, synthetic, deterministic-rule, or possible-difference wording; waitlist and safety copy no longer imply recruitment, outreach, or an operational review queue. A persistent AppShell notice prohibits real profiles, diagnosis/identity data, messages, reports, research data, and contact details.

## Behavior and compatibility evidence

Characterization tests cover valid/malformed shared contracts, health, waitlist, onboarding, profile update, stable complete-profile candidate order/explanations, conversation/message flows, report/block, destructive-seed denial, and verifier cleanup using isolated temporary stores.

`npm run verify:static` exercises the dependency-upgrade paths that ordinary API injection tests do not: `/` and `/matches` SPA responses, built JS/CSS assets, JSON API 404 separation, missing-asset 404 behavior, and an explicitly configured CORS allow/deny pair. Exact old/new dependency versions, breaking-change review, affected areas, and evidence are in `DEPENDENCY_UPGRADE_REVIEW.md`.

The waitlist API wire contract remains unchanged. The visible local form refuses non-`.test` input and makes no recruitment/outreach claim; direct API collection remains prohibited and is a G4/G5 blocker.

## Security TODO disposition

All five route-level requirements remain intentional `test.todo` items and have canonical entries in `SECURITY_TODO_REGISTER.md`:

- SEC-001 server-owned authenticated identity: critical; blocks app-mediated research, beta, and launch.
- SEC-002 conversation membership authorization: critical; blocks app-mediated research, beta, and launch.
- SEC-003 report ownership/reference integrity: high; blocks app-mediated research, beta, and launch.
- SEC-004 default-deny privileged seed operation: high; blocks any non-disposable use, research, beta, and launch.
- SEC-005 default-deny CORS and explicit host policy: high; the default LAN-bound launcher also blocks even a local demo unless explicitly isolated; blocks research, beta, and launch.

Production persistence/encryption, retention/deletion/export, moderator access/decision/appeal, purpose-separated consent, diagnosis isolation, and adult eligibility are separately registered mandatory beta blockers.

## Dependency and licence status

High-severity advisories were remediated with Fastify `5.10.0`, `@fastify/static` `10.1.0`, React Router `6.30.4`, Vite `8.1.4`, and React plugin `6.0.3`; React 18 and TypeScript 5 remain. The remaining low `esbuild@0.27.7` advisory is reached through the Vite/`tsx`/`tsup` toolchain and affects Windows development-server file reads. It must be cleared before Phase 5/closed beta or any Windows/network-exposed development server; no zero-vulnerability claim is made.

The project still has no `LICENSE`. The registry distinguishes donor candidates, external prior art, current external licence dependencies, and copied implementation code (empty). Direct `yaml@2.9.0` is recorded as ISC. Keith Grehan's authorization permits bounded inbound consideration of Keith-authored domain-neutral donor material only after exact provenance and third-party review; it grants no outbound rights and changes no donor licence status.

## Independent review findings and resolution

Four read-only roles reviewed the evolving diff:

- Clarity repository auditor: found missing static-serving coverage, stale audit/capability copy, and direct-route sensitive-input warnings. Resolved with executable static checks, historical banners, bounded copy, and a persistent synthetic-only notice. Final result: no remaining P0–P2, conditional on this report and final re-review.
- Privacy/safety reviewer: found the missing canonical security register, misleading waitlist/moderation/matching copy, future controls written as current, and premature gate claims. Resolved with SEC-001–SEC-005, additional beta blockers, synthetic-only UI handling, policy qualifiers, and removal of premature PASS claims.
- Licence researcher: verified all 77 donor pins and zero copied donor blobs; found missing YAML/ISC classification, incomplete resource classes, non-resolving validator behavior, and a legacy Presidio URL. Resolved with the dependency inventory, copied-code empty class, reproducible local provenance validator, licence correction, and canonical URL.
- Independent reviewer: initial review correctly withheld PASS for type errors, premature status, incomplete dependency/static evidence, LAN/CORS wording, and missing report. Each P1/P2 was remediated. Final re-review result: **PASS with no unresolved P0–P3**.

No reviewer found a P0, real participant data, credential, unexplained restricted artifact, donor ownership conflict, donor code copy, model artifact, or Phase 2 implementation.

## Remaining accepted risks

- The five security TODOs and all additional G2–G5 controls remain open.
- The default server is LAN-bound and missing-origin CORS is permissive; local use requires explicit isolation and origin configuration.
- The API can accept contact data directly; use with real data or recruitment is prohibited.
- Legacy diagnosis and scalar matching behavior remain characterized v1 debt and block participants.
- One low transitive `esbuild` advisory remains.
- Branch protection, CI execution on GitHub, legal review, accessibility measurement, operational moderation, and production controls require external/later evidence.

Phase 2 remains explicitly not implemented. The next goal must be owner-approved and must not begin until this foundation is reviewed and the relevant release prerequisites are recorded.
