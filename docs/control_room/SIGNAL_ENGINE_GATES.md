# Communication Signal Engine gates

Status: all real-data and production gates closed
Reviewed: 2026-07-15

Flags are necessary controls, not release evidence. A path is allowed only when its flag, the corresponding gate below and the applicable Control Room release gate all pass. Missing, inconsistent or unknown configuration fails closed.

## Current flag policy

| Flag | Default | Local synthetic review | Current decision |
|---|---:|---:|---|
| `SIGNAL_ENGINE_ENABLED` | `false` | explicitly `true` in test/local launcher only | Local synthetic route only |
| `SIGNAL_ENGINE_SYNTHETIC_ONLY` | `false` | must be `true` when engine is enabled | Required |
| `SIGNAL_ENGINE_USER_AUTHORED_TEXT` | `false` | `false` | Closed |
| `SIGNAL_ENGINE_RECEIVED_EXCERPTS` | `false` | `false` | Closed |
| `SIGNAL_ENGINE_AUDIO` | `false` | `false` | Closed |
| `SIGNAL_ENGINE_SYNTHETIC_TRAINING` | `false` | `false` | Closed |
| `SIGNAL_ENGINE_REAL_DATA_TRAINING` | `false` | `false` | Closed |
| `SIGNAL_ENGINE_PRODUCTION` | `false` | `false` | Closed |

`SIGNAL_ENGINE_ENABLED=true` is invalid unless `SIGNAL_ENGINE_SYNTHETIC_ONLY=true` and every unsafe flag is false. Synthetic-only mode is not a beta or participant-authentication boundary.

## Later gates

### SG1 — user-authored text

Requires G2/G3/G5 evidence, real authentication and authorization, Article 9/lawful-basis and DPIA review, purpose-specific consent/authority, retention/deletion/export controls, identifier-minimisation evaluation, incident drills, accessibility review, abuse controls and a recorded owner decision. Until then there is no free-text client control or API field.

### SG2 — received-message analysis

Requires SG1 plus a documented authority model for third-party message content, sender privacy/notice analysis, quotation and copyright review, minimisation of surrounding context, misuse/red-team evaluation and a separately recorded decision. Consent by the uploading user alone is not assumed to authorize every third party's data.

### SG3 — audio intake

Requires SG1 plus a standalone threat model, biometric/voiceprint and special-category assessment, private managed storage, sandboxed decoder, malware/resource controls, deletion/backup verification, acoustic validity across accents and devices, accessibility alternatives, and explicit prohibition of emotion/neurotype/attraction inference. Research modules and unlink tests do not satisfy this gate.

### SG4 — synthetic model training

Requires G6/G7 plus an approved source registry, generator/version manifest, rights review, fixture originality review, label protocol, hard-negative and subgroup plan, leakage tests, reproducible baseline, model/data card and rollback. No test fixture is silently promoted into a training corpus.

### SG5 — real-data model training

Requires SG4 plus an independently approved research protocol, explicit separate training consent or another qualified lawful basis, participant and third-party rights analysis, withdrawal/deletion propagation, access/retention controls, reviewed gold labels, subgroup/error evaluation, security review and owner go/no-go. Service use never implies training permission.

### SG6 — production Clarity integration

Requires SG1–SG5 as applicable and G2–G9, real auth, encrypted production storage where needed, operational ownership, rate/abuse limits, content-safe observability, rollback, legal/accessibility/model-risk reviews and a recorded launch decision. A draft PR, passing unit tests or local semantic model does not satisfy this gate.

## Current decision

**GO:** local synthetic review branch with fictional fixtures and the loopback service explicitly enabled for development/tests.

**NO GO:** private beta, public traffic, real user-authored or received messages, any audio route, synthetic or real-data training, shadow use, production deployment or launch.
