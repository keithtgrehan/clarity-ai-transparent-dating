# Donor import manifest

Status: authorized snapshot verified before adaptation
Clarity branch: `codex/berlin-audhd-dating-app`
Clarity base: `fd29954d954041969d8a6874890a77214a25fb00`
Decision: D018
Public review disclosure: D019
Review date: 2026-07-15
Snapshot verified: `2026-07-15T14:10:42+02:00`

## Donor state

- Repository: `https://github.com/keithtgrehan/vibe-signal.git`
- Local path: `/Users/keith/Documents/New project/vibe-signal`
- Branch/HEAD: `main` / `000ba0685f961e253b0d34c0b02539ac897356e9`
- Dirty state at verification: modified `pyproject.toml`; untracked engine, tests, fixture and research document.
- Donor operations performed: read-only status, hashing and inspection. No reset, clean, stash, switch, edit, stage or commit.
- Licence: no tracked project licence. Keith Grehan's D018 authorization is inbound and snapshot-specific. D019 separately authorizes public review disclosure in the public Clarity repository because the attached instruction explicitly requires a pushed draft PR. Neither decision grants an outbound or redistribution licence. The Git blob IDs below identify exact working-tree bytes but are not reachable from the contextual base commit.

## Approved imported snapshots

| Source path | Git blob | SHA-256 | Target | Transformation | Dependency/licence note | Verification |
|---|---|---|---|---|---|---|
| `src/vibesignal_ai/pipeline_engine.py` | `c192e82497b94a005492e595560e68ad46ab4938` | `8688a7640b369f4ca456b29d8baad045d4690606bb5804390622c92060ec744b` | `services/signal-engine/communication_signal_engine`, `services/signal-engine/app` | Split monolith; remove embedded tests; canonicalize cues; correct privacy/deletion claims; make semantic optional/offline; isolate audio | Owner-authorized snapshot; third-party Python dependencies separately inventoried; no model files imported | Snapshot validator plus ported unit/integration/security tests |
| `tests/test_pipeline_engine.py` | `1a4a3999e64c9d0ca6242b1f0e263b51a8a512af` | `65d5cfeed45d4bc12db560accf25ea2c1a42f716f7b7e01e08dba258f20f4437` | `services/signal-engine/tests` | Port behavior into unit/integration/security suites; no tests remain in runtime modules | Test logic only; no participant data | Pytest collection and complete suite |
| `tests/fixtures/pipeline_engine/dating_signal_cases.json` | `3249e6633afb93390dfe1d17274f831e40b21c8f` | `c7af85f4cce2b2fa9d11da894f7e93021c074caf9ce7e752847bb0ded791a5e0` | `services/signal-engine/tests/fixtures/dating_signal_cases.json` | Retain all 18 fictional cases; map donor modes to neutral profiles and aliases to canonical IDs; characterize the unapproved semantic-transition category as rules-only abstention | Synthetic-only owner-authored fixture; no external quotations or participant records | Table-driven behavior test plus registry/fixture consistency tests |

## Explicitly not imported

- Donor `pyproject.toml`: inspected but not copied. Its uncommitted `zero_pii` extra is replaced by the accurate target name `pii_minimization`.
- Donor research launch document: used as orientation only; canonical research in Clarity cites source-level literature and registered donor research paths.
- Raw chats, transcripts, audio, model weights, cached embeddings, datasets, provider outputs and local runtime artifacts.

Any byte change in an approved source invalidates this manifest until the owner approves a new snapshot. The final validation report must record the exact target files, tests, independent-review outcome and whether the snapshot remained unchanged.
