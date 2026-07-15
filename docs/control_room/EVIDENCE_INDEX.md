# Evidence index

| Claim or decision | Evidence | Verification |
|---|---|---|
| Canonical repository and baseline | Git remote and baseline commit `aa6282f`; D015 | `git remote -v`; `git log -1` on 2026-07-14 |
| Local TypeScript architecture | `package.json`, `apps/web/package.json`, `apps/api/package.json`, `packages/shared/package.json` | Workspace and manifest inspection |
| Current matching behavior and gaps | `apps/api/src/services/matching.ts`, `apps/api/src/routes/matches.ts` | Code inspection and synthetic characterization tests |
| Diagnosis required/exposed in v1 | `packages/shared/src/schemas/contracts.ts`, `packages/shared/src/schemas/domain.ts`, matching service | Code inspection |
| Client-supplied identity/no authorization | Web API calls and API routes under `apps/api/src/routes` | Code inspection; security test TODOs |
| Synthetic local persistence | `apps/api/src/lib/store.ts`, `data/fixtures`, `data/seeds` | Schema and fixture inspection |
| Destructive seed endpoint | `apps/api/src/routes/admin.ts`, `.env.example` | Code/config inspection |
| Owner donor authorization | D014 and `docs/architecture/reuse_map.md` | Keith Grehan statement dated 2026-07-14 |
| Project licence absent | Repository root and D013 | `git ls-files '*LICENSE*'` |
| Privacy/DPIA basis requiring review | GDPR Articles 9 and 35; EDPB consent guidance; Berlin DPA DPIA list | Links in `docs/legal/dpia_draft.md` checked 2026-07-14 |
| Accessibility target | W3C WCAG 2.2 | Link in `docs/product/accessibility.md` checked 2026-07-14 |
| Codex agent file shape | OpenAI Codex manual, custom agents section | Manual refreshed 2026-07-14 |
| Build/test state | `.github/workflows/quality.yml`, API tests, bounded scripts, `PHASE_0_1_VALIDATION_REPORT.md` | Clean install, 8 tests + 5 tracked TODOs, typecheck, build, static/SPA/API/CORS and MVP smoke passed 2026-07-14 |
| Dependency advisory state | `package-lock.json`, `DEPENDENCY_UPGRADE_REVIEW.md`, R08/R16 | High audit threshold passed; one documented low transitive `esbuild` advisory remains |
| Donor provenance | `configs/resource_registry.yml`, reuse map, and local donor validator | All 77 exact pins independently and executably resolved on 2026-07-14 |
| Independent review | Final uncommitted diff on `codex/clarity-governance-foundation` | Final PASS 2026-07-14: no unresolved P0–P3; scope, security, claims, routing, dependency, rights and migration boundaries checked |

External evidence is time-sensitive. Refresh it before a legal, participant, dependency, or release decision.
