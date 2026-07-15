# Release gates

No gate is satisfied by documentation alone when executable or operational evidence is required.

Before merging this foundation, configure `main` branch protection to require the `quality / validate` check, at least one independent approval, resolved review conversations, and no force pushes or branch deletion. Repository-host settings are not changed by this implementation.

Current status: G0 and G1 passed on 2026-07-14 for the governed repository and isolated synthetic local MVP only. The Berlin branch adds a local synthetic communication-engine review path and three D018 snapshot pins; it does not advance G2 or G3. G2–G9 remain unpassed; no research, participant beta, production, model-validity or legal-compliance readiness is implied.

| Gate | Pass evidence | No-go conditions |
|---|---|---|
| G0 Governance | AGENTS and Control Room reviewed; registries validate; tracked restricted/raw/public-copy scans pass; donor authorization recorded | Real data, credential, unknown restricted artifact, ownership conflict, unsupported public claim |
| G1 Stable local MVP | Node 22 `npm ci`, tests, typecheck, build and bounded smoke pass; CI mirrors commands; zero high audit findings | Hanging checks, high advisory, behavior regression, production/participant claim |
| G2 V2 contracts/matching | Approved vocabulary; versioned schemas/API; diagnosis absent from service/matches; hard filters and unknown states tested; WCAG review | Hidden scalar, default-positive unknown, unconsented sensitive-field use, inaccessible critical flow |
| G3 Cues/moderation | Versioned evidence/output policy; no-raw-log tests; separate cases/decisions/appeals; trained human procedure | Motive/diagnosis inference, autonomous sanction, raw evidence exposure, absent appeal |
| G4 Research | Qualified privacy/legal review; approved DPIA, protocol, notices, consent, compensation, withdrawal/deletion and safeguarding | Recruitment before approval, bundled consent, unclear deletion, coercion, unstaffed safeguarding |
| G5 Invite beta | Real auth/authorization, encrypted store, audit/retention/export/deletion, disabled seed route, incident and moderation drills, accessibility and legal approval | Client-controlled identity, synthetic store, no on-call escalation, failed incident/deletion drill |
| G6 Evaluation corpus | Consent references, minimised corpus, reviewed-gold promotion, agreement/subgroup metrics, access/retention controls | Service data silently reused, unreviewed labels, unknown source rights |
| G7 Offline model | Reproducible baseline, model/data cards, error/subgroup evaluation, rollback, clear improvement over rules | Production serving, unacceptable subgroup error, weak evidence, rights ambiguity |
| G8 Shadow | Independent privacy/model approval, content-safe telemetry and rollback | User-facing influence, sanction influence, raw-content telemetry |
| G9 Launch | Independent product/safety/privacy/accessibility/operations sign-off and recorded Keith Grehan decision | Any critical open risk or missing gate evidence |
