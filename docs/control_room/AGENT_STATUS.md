# Agent status

Update this file when a role is assigned or produces material evidence.

| Role | Current assignment | Inputs | Status | Required output | Last verified |
|---|---|---|---|---|---|
| Clarity repo auditor | Current-state and regression evidence | Repository, tests, claims matrix | Complete: no remaining P0–P2 | Path/command-backed findings | 2026-07-14 |
| Donor repo auditor | Exact commit/path/blob and behavior evidence | Three named local donors plus D018 snapshots | Complete; 91 pins verified and donor untouched | Reuse-map evidence; no edits | 2026-07-15 |
| Licence researcher | Project/dependency/donor/external rights | Registry, exact snapshots and upstream evidence | Complete; D018 adaptation GO and D019 disclosure distinction recorded | Rights matrix and blockers | 2026-07-15 |
| Privacy/safety reviewer | Diagnose data, adapter, audio, model, accessibility and claims risk | Berlin branch plan, donor behavior and gates | Final PASS; no unresolved P0–P2 | Severity-ranked read-only findings | 2026-07-15 |
| Product architect | V1-to-v2 decision completeness | Charter, decisions, migration map | Available | Interfaces, slices, rollback and acceptance | 2026-07-14 |
| Communication-engine worker | D018 modular Python service and security tests | Approved Berlin synthetic-only goal | Complete; 66/66 Python tests passed in a clean locked environment | Reviewable service diff and test evidence | 2026-07-15 |
| Clarity adapter/UI worker | Disabled v2 fixture adapter and calm synthetic UI | Closed Python wire contract and feature policy | Complete; 20 pass plus 5 preserved TODO, typecheck/build/audit passed | Reviewable TypeScript diff and validation evidence | 2026-07-15 |
| Research consolidator | Current literature, source rights and legacy-method extraction | Firecrawl discovery and registered donor paths | Complete; 45-paper index, training registry/extraction and archive validated | Canonical status, training extraction and archive | 2026-07-15 |
| Independent reviewer | Review final Berlin implementation | Final diff and command evidence | Final PASS; no unresolved P0–P2 | Full quality, privacy, provenance, scope and routing review | 2026-07-15 |

Project configuration permits six concurrent threads and one spawn level. Seven roles exist, but they must not all be run concurrently.
