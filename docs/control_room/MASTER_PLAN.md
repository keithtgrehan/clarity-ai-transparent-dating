# Master plan

Owner: Keith Grehan

Canonical repository: `keithtgrehan/clarity-ai-transparent-dating`

Last reviewed: 2026-07-15

This file is the authoritative delivery sequence. A phase may start only when its prerequisite and release gate have recorded evidence. “Complete” never means legally compliant or participant-ready unless the corresponding gate explicitly says so.

| Phase | Status | Prerequisite | Required output and verification | Privacy/safety review | Stop condition | Accountable owner | Release gate |
|---|---|---|---|---|---|---|---|
| 0 Governance | Complete 2026-07-14 | Clean audited repository | AGENTS, Control Room, registries, claims checks, restricted-content checks | Provenance and real-data scan passed | Secret, participant data, restricted artifact, or ownership conflict | Keith Grehan | G0 passed for repository foundation |
| 1 Stabilise MVP | Complete 2026-07-14 | G0 | Node 22 install, synthetic tests, corrected docs, zero high dependency advisories, CI | No participant/production claim | Unbounded validation or unresolved high advisory | Engineering owner | G1 passed for isolated local MVP only |
| 2 Contracts and matching | Not started | G1 plus vocabulary approval | Versioned schemas/API, finite discovery, provenance, accessible UI | Diagnosis excluded; hard-filter unknowns fail closed | Any hidden scalar or unconsented sensitive matching use | Product and privacy owners | G2 |
| 3 Cues and moderation | Local synthetic communication-engine slice in review; gate not passed | G2 plus output policy | Bounded cues, safe renderer, moderator cases, human decisions and appeal | Synthetic fixture path only; no raw logs or autonomous sanctions | Motive inference, raw-content leakage, or absent appeal | Safety owner | G3 not passed |
| 4 Berlin research | Not started | Approved DPIA/ethics/recruitment/compensation | Advisory work, interviews, accessibility tests, event prototypes | Withdrawal, deletion, minimisation and safeguarding | Coercion or unclear withdrawal/deletion | Research owner | G4 |
| 5 Invite beta | Not started | Auth, production store, incident operations, export/deletion | Small Berlin beta and operational drills | Named moderators and legal/accessibility sign-off | Unstaffed escalation or failed deletion/incident drill | Keith Grehan | G5 |
| 6 Evaluation corpus | Not started | Separate research/NLP consent and reviewed protocol | Review packets, gold promotion, agreement and subgroup evaluation | No service-to-training reuse by default | Unreviewed labels or missing consent reference | Research owner | G6 |
| 7 Offline models | Not started | Approved sources and adequate reviewed gold | Reproducible baselines, model card, error/subgroup analysis | Offline only | No clear improvement over bounded rules or unacceptable subgroup error | Model-risk owner | G7 |
| 8 Shadow experiments | Not started | Independent privacy/model review | Non-user-visible comparison and rollback evidence | No participant-facing output | Output reaches users or influences sanctions | Model-risk owner | G8 |
| 9 Go/no-go | Not started | All gate evidence complete | Independent product, safety, privacy, accessibility and operations review | Recorded launch decision | Any unresolved material release risk | Keith Grehan | G9 |

The governed-foundation implementation completed after Backlog Issue 13. The Berlin communication-engine milestone adds a disabled-by-default, loopback, fictional-fixture review slice under D004/D018/D019. This work does not satisfy participant/research/beta Gates G2–G9 or the later signal-engine gates; Issues 14–25 require separate owner-approved goals.
