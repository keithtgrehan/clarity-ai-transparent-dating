# Security TODO register

Status: accepted risk only for a disposable, synthetic, single-developer local demonstration. This register does not authorize real participant data, research recruitment, a closed beta, or public launch.

The five executable TODO markers below are canonical. Stable IDs must remain attached to the tests until the corresponding control is implemented and verified.

| ID | Exact code/test area | Risk and severity | Current mitigation | Why deferred | Blocks | Owner | Target / backlog |
|---|---|---|---|---|---|---|---|
| SEC-001 | `apps/api/test/mvp.test.ts` marker; `apps/api/src/routes/profiles.ts`, `matches.ts`, and conversation-list route | Client-owned identity permits cross-user reads/actions. **Critical.** | Synthetic temporary stores; no participant use; v1 local-only warning. | Authentication architecture and server-owned session identity are Phase 5 production-security work. | Local synthetic demo: no. App-mediated research/recruitment: yes. Closed beta: yes. Public launch: yes. | API owner | Phase 5 / Issue 25 |
| SEC-002 | `apps/api/test/mvp.test.ts` marker; `apps/api/src/routes/conversations.ts` message-read handler | A caller can read messages without authenticated membership. **Critical.** | Synthetic messages only; use is permitted solely in an explicitly isolated host/container/firewall environment. | Requires authenticated principals, membership authorization, and negative access tests. | Local synthetic demo: no when explicitly isolated. App-mediated research/recruitment: yes. Closed beta: yes. Public launch: yes. | API owner | Phase 5 / Issue 25 |
| SEC-003 | `apps/api/test/mvp.test.ts` marker; `apps/api/src/routes/safety.ts` | Spoofed reporter/target/evidence references can create false reports, flags, or blocks. **High.** | Synthetic fixtures; current report output has no operational sanction authority. | Separate case/evidence contracts belong to Phase 3; authenticated ownership belongs to Phase 5. | Local synthetic demo: no. App-mediated research/recruitment: yes. Closed beta: yes. Public launch: yes. | Safety and API owners | Phases 3 and 5 / Issues 22 and 25 |
| SEC-004 | `apps/api/test/mvp.test.ts` marker; `apps/api/src/routes/admin.ts`; `.env.example` | Destructive seed replacement can erase or replace store contents. **High.** | CI/tests set it false when verifying denial; only disposable local stores are permitted. | Removing or privileging the route would change preserved v1 operations and requires the production auth boundary. | Local synthetic demo: no, only with a disposable store. App-mediated research/recruitment: yes. Closed beta: yes. Public launch: yes. | API owner | Phase 5 / Issue 25 |
| SEC-005 | `apps/api/test/mvp.test.ts` marker; `apps/api/src/app.ts` CORS registration and `apps/api/src/server.ts` LAN binding | Missing origin configuration becomes permissive while the default server binds `0.0.0.0`, permitting browser/LAN access from arbitrary origins. **High.** | README warns that the launcher is LAN-bound; static verification exercises an explicit allowlist. | Default-deny origin and loopback-by-default/explicit-host policy are production-security changes that could disrupt the preserved local launcher. | Local synthetic demo: yes under the default launcher; accepted only in an explicitly isolated host/container/firewall environment. App-mediated research/recruitment: yes. Closed beta: yes. Public launch: yes. | API owner | Phase 5 / Issue 25 |

## Additional mandatory beta blockers

These controls are already represented in release gates and the backlog even though they are not the five route-level `test.todo` markers:

- Authenticated production persistence, encryption, content-free audit logging, backup policy, and processor/hosting review: R02, G5, Issue 25.
- Tested retention, deletion, export, withdrawal, and account-lifecycle controls: R02, G4/G5, Issues 14 and 25.
- Least-privilege moderator evidence access, separate case/decision/appeal records, named staffing, escalation, and drills: R06/R13, G3/G5, Issues 22 and 25.
- Purpose-separated service, research, NLP-feedback, marketing, event, and diagnosis-context consent: D010/D011, G4/G5, Issues 14–15.
- Diagnosis isolation and removal from service/public matching contracts: R03, G2, Issue 15.
- Policy-versioned adult eligibility and underage escalation: R11, G2/G5, Issues 16 and 25.
- Consent-bound contact collection or complete waitlist removal: the preserved API still accepts a syntactically valid email, while the local UI refuses non-`.test` addresses. Direct API use with real contact data is prohibited and blocks recruitment/beta until D010/G4/G5 controls exist.
- The communication route accepts fictional fixture IDs only. Real self-authored text remains blocked until SG1; received content, audio, training and production each have separate closed gates in `SIGNAL_ENGINE_GATES.md`.
- D020 may add a separate T1 authentication interface, test-only provider, purpose-consent interface and transient token protocol. Those controls apply only to synthetic protocol tests and do not close SEC-001 for legacy routes or prove a production identity/consent provider.
- The required NER artifact is inventoried but not locally approved or installed. The exact fictional route runs pattern checks only; any real or unattested text path refuses. Installing a package by name is not approval; a managed, hash-verified provisioning design and evaluation are still required.
- Acoustic code is isolated research code with no HTTP/UI route. Its descriptive measurements and intake-path unlink operation are not emotion/neurotype inference, biometric clearance or storage-erasure evidence.

No item in this register is a claim of implemented security. Closing an item requires code, negative tests, migration/rollback evidence where relevant, and independent review.
