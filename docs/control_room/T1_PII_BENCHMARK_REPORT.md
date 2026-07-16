# T1 fictional PII minimisation benchmark

Status: local synthetic characterization; not model approval or anonymization accuracy

Run date: 2026-07-15

Fixture: `services/signal-engine/tests/fixtures/t1_pii_benchmark.json`

Fixture SHA-256: `bbdd95c8c3779827f72c5c1103b8a83423192d576fff761b4ba1449d6504abea`

Provenance manifest: `configs/t1_fictional_fixture_manifest.yml`

Detector: `synthetic-test-double` / `dv_1111111111111111111111111111111111111111111111111111111111111111`

Harness: `communication_signal_engine.privacy.benchmark.run_fictional_benchmark`

The eight wholly fictional cases cover names, email, phone, fictional street and urban-location patterns, usernames/handles, dates, fictional workplace/university references, URLs, quoted fictional text, en-US, en-GB, Euro-English, mixed English/German, indirect contextual descriptions and a hard negative. The detector is a fixture-specific test double combined with deterministic patterns. It is deliberately incapable of approving a local NER artifact or supporting a real-text claim.

## Results

| Measure | Result |
|---|---:|
| Cases | 8 |
| Expected direct spans | 16 |
| Detected direct spans | 16 |
| Predicted spans | 16 |
| Direct-identifier recall | 1.000 |
| Direct-identifier precision | 1.000 |
| Abstention/refusal rate | 0.000 |
| Category-level direct misses | 0 |
| Unresolved contextual identifiers | 2 |

| Declared language slice | Cases | Direct expected/detected | Direct precision | Refusals |
|---|---:|---:|---:|---:|
| en-US | 2 | 3 / 3 | 1.000 | 0 |
| en-GB | 2 | 4 / 4 | 1.000 | 0 |
| en-EU | 3 | 6 / 6 | 1.000 | 0 |
| mixed English/German | 1 | 3 / 3 | 1.000 | 0 |

## Interpretation limits

- The perfect direct-span result is expected from a small designed fixture and fixture-specific detector. It is regression evidence for the protocol, not evidence of generalization.
- Two indirect/contextual identifiers intentionally remain unresolved. Automated masking cannot guarantee anonymity or remove sensitive context.
- Language labels characterize fictional slices only. They do not establish dialect fairness, code-switch robustness, subgroup performance or participant safety.
- No approved local spaCy artifact ran. Current model candidates remain `candidate_not_approved` and blocked.
- No public post, comment, transcript, participant data, received excerpt, username, diagnosis or real quotation was collected or used.
- The D020 owner authorization, generation method, synthetic-only split, copied-source exclusion, independent review and before-merge human-owner review requirement are recorded in the governed provenance manifest.

The next benchmark decision requires an exact approved local artifact, independently reviewed labels and error analysis, a materially broader fictional/adversarial suite, qualified privacy review and a new owner gate. This report does not open T1.
