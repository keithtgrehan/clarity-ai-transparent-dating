# Agent status

Update this file when a role is assigned or produces material evidence.

| Role | Current assignment | Inputs | Status | Required output | Last verified |
|---|---|---|---|---|---|
| Clarity repo auditor | Final T1 current-diff and regression rereview | Complete T1 diff, quality output and remediations | Final PASS; no unresolved P0–P2; `httpx2` migration recorded as P3 | Path/command-backed P0–P3 findings | 2026-07-15 |
| Donor repo auditor | Exact commit/path/blob and behavior evidence | Three named local donors plus D018 snapshots | Complete; 91 pins verified and donor untouched | Reuse-map evidence; no edits | 2026-07-15 |
| Licence researcher | Final T1 model, dependency, fixture and research-source provenance | Complete T1 diff and governed registries | Final PASS; no unresolved P0–P2; human-owner fixture review remains a before-merge gate | Severity-ranked rights/provenance findings | 2026-07-15 |
| Privacy/safety reviewer | Final T1 data-boundary, consent, session, UI and claims review | Complete T1 diff and gate evidence | Final PASS; no unresolved P0–P2 after remediation | Severity-ranked read-only findings | 2026-07-15 |
| Product architect | V1-to-v2 decision completeness | Charter, decisions, migration map | Available | Interfaces, slices, rollback and acceptance | 2026-07-14 |
| Communication-engine worker | T1 private Python protocol, privacy harness and security tests | D020 local synthetic-only authorization | Complete; fresh locked Python 101/101 passed | Reviewable service diff and test evidence | 2026-07-15 |
| Clarity adapter/UI worker | Disabled v2 self-authored-draft adapter and calm synthetic UI | Closed Python wire contract and feature policy | Complete; API 38 pass plus 5 preserved TODO, rendered web 8/8, typecheck/build/audit passed | Reviewable TypeScript diff and validation evidence | 2026-07-15 |
| Research consolidator | Current literature, source rights and legacy-method extraction | Firecrawl discovery and registered donor paths | Complete; 45-paper index, training registry/extraction and archive validated | Canonical status, training extraction and archive | 2026-07-15 |
| Independent reviewer | Review final T1 implementation after all specialist dispositions | Final diff and command evidence | Final PASS; no unresolved P0–P2 after race, contract, clear and CI remediations | Full quality, privacy, provenance, scope and routing review | 2026-07-15 |

Project configuration permits six concurrent threads and one spawn level. Seven roles exist, but they must not all be run concurrently.
