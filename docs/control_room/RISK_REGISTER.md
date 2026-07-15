# Risk register

Scale: severity and likelihood are `low`, `medium`, `high`, or `critical`.

| ID | Risk | Severity | Likelihood | Owner | Mitigation/evidence | Next review |
|---|---|---|---|---|---|---|
| R01 | Client-supplied identity permits unauthorized access/actions. | critical | high | API owner | No participant use; auth/authorization required by G5; security tests remain TODO until implemented. | Before Issue 25 |
| R02 | Sensitive data is co-mingled in unencrypted JSON without lifecycle controls. | critical | high | Privacy owner | Synthetic-only rule, data scan, data inventory; replace before beta. | G2 and G5 |
| R03 | Diagnosis is required/exposed by v1. | critical | high | Product/privacy owners | Truthful warning; v2 isolation plan; v1 prohibited for participants. | Issue 15 |
| R04 | Destructive seed endpoint is enabled unless explicitly disabled. | high | high | API owner | Local-only warning; G5 requires disable/removal and authorization. | G1, then G5 |
| R05 | Matching overstates evidence and uses hidden defaults/score. | high | high | Matching owner | Characterize v1; no production claim; v2 migration removes scalar/default positives. | G2 |
| R06 | Moderation lacks operations, access separation, decision and appeal. | critical | high | Safety owner | No participant launch; policy draft; G3/G5 operational evidence. | G3 |
| R07 | Unsupported privacy/safety/accessibility claims create false trust. | high | medium | Product owner | Claims matrix and validator; current-state README. | Every release |
| R08 | Dependency advisories expose known vulnerabilities or major upgrades regress runtime compatibility. | high | low | Engineering owner | Exact old/new versions, breaking review, affected areas, and executable regression evidence are recorded in `DEPENDENCY_UPGRADE_REVIEW.md`; high audit gate required. | Every dependency change |
| R09 | Donor or external reuse lacks licence/provenance. | high | medium | Keith Grehan | Registry, blob pins, owner authorization, NOASSERTION and AGPL blocks. | Before every reuse |
| R10 | Real data is accidentally committed or logged. | critical | medium | Repository owner | AGENTS stop rule, synthetic-only fixtures, restricted/raw scans, logging prohibition. | Every change |
| R11 | Adult-only positioning lacks a reliable eligibility and escalation process. | critical | medium | Safety/legal owners | No beta; policy-versioned confirmation and underage flow required by G2/G5. | Before G2 approval |
| R12 | Accessibility or neurotype language excludes intended participants. | high | medium | Product/research owners | WCAG 2.2 target and participatory vocabulary review before G2/G4. | G2/G4 |
| R13 | Solo-founder moderation capacity is insufficient. | critical | medium | Keith Grehan | Staffing, SLA, escalation coverage and drills required by G5. | Before beta |
| R14 | Project has no licence or contribution terms. | medium | high | Keith Grehan | No outside copying/contribution assumption; decide before accepting contributions. | Before outside contribution |
| R15 | GDPR/DSA conclusions are incomplete or wrong. | critical | medium | Qualified legal reviewer | Drafts are engineering analysis only; controller, lawful basis, Article 9, DPIA and DSA review are G4/G5 gates. | Before research/beta |
| R16 | Transitive `esbuild@0.27.7` through Vite/`tsx`/`tsup` permits Windows development-server file reads (`GHSA-g7r4-m6w7-qqqr`). | low | low | Engineering owner | Current work is macOS/Linux local/CI; never expose the dev server. Upgrade or replace constraining toolchain and re-run clean build/static/smoke/audit before Phase 5. | Before Phase 5 or any Windows/network-exposed dev server |
| R17 | CORS is permissive when no origin is configured and the default server is LAN-bound. | high | high | API owner | SEC-005; README requires explicit host/container/firewall isolation and configured allowlist. Default-deny/loopback policy required before any app-mediated research or beta. | Phase 5 / Issue 25 |
| R18 | Preserved waitlist API can store real contact data without approved recruitment/consent controls. | critical | medium | Research/API owners | UI refuses non-`.test` addresses; direct API use is prohibited; no real-data/recruitment claim. Consent-bound collection or route removal required before G4/G5. | Before Phase 4 research or Phase 5 beta |
