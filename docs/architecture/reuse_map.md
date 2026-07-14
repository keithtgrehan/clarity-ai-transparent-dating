# Donor reuse map

Status: provenance audit complete; all donor assets remain `planned_reference_only`. Issues 1–13 copy no donor code. The governance scripts in this repository are original Clarity implementations informed by audited control patterns.

Keith Grehan authorized inbound use of Keith-authored domain-neutral material on 2026-07-14. Authorization does not license third-party content or grant outbound redistribution rights. Exact commit and blob pins for every candidate are in `configs/resource_registry.yml`.

| Donor/pin | Candidate family | Intended Clarity target | Required transformation and gate |
|---|---|---|---|
| Vibe Signal `000ba0685f961e253b0d34c0b02539ac897356e9` | Cue taxonomy and evidence objects | Future `packages/evidence` and shared Zod | TypeScript clean-room translation; remove raw evidence text and inference; G2/G3 review |
| Same | Safety validator/red-line blocker | Future `packages/safety/src/output-policy.ts` | Preserve bounded output controls; no sanctions; G3 |
| Same | Matching explanation/neuro-support | Future user-owned draft/explanation assistance | Do not copy scalar score/band or raw evidence behavior; G2/G3 |
| Same | Public-copy/raw/restricted checks | `scripts/governance` | Current scripts are original, not copied; donor remains design evidence |
| Same | Synthetic generator | Future `research/synthetic` | Remove relationship-verdict labels; owner attestation/content review; G4/G6 |
| Same | Feedback/monitoring | Future consent-bound feedback and safe telemetry | Metadata-only; no raw content; G3/G6 |
| Same | n8n assets | Possible future `ops/n8n` | Reference only pending n8n terms, processor, hosting and data-flow decisions |
| Signal Engine `74256cd93d68828c04ee553141f95aa8b0abe6f4` | Resource/claims registries and restricted checks | `configs` and `scripts/governance` | Current implementation is original; future copying must use `git show` at commit because donor worktree was dirty |
| Same | Evidence/retrieval schemas | Future evidence contract | Remove finance semantics; no raw spans in match responses; G2/G3 |
| Same | Review packets, Argilla and gold tools | Future `evals`, `packages/evaluation`, research-admin | Select individual committed files, not wildcards; third-party terms and G6 required |
| Same | Report helper | Future safe evaluation artifacts | Pattern-only review; no raw report content |
| NLP Engine `c09944a4061011044b461be2512b955e3b1af981` | Rights/training gates | Clarity resource registry and research docs | One unified rights system; no duplicate registry |
| Same | Synthetic/label-governance assets | Future synthetic/evaluation workspace | Duplicate Vibe lineage where identical; content review and G6 |
| Same | Model-plan docs and dry-run trainer | `docs/research` and later offline Python | Trainer currently refuses training; use only as a gating pattern until G7 |
| Same | Provider flags/monitoring/model card | Future privacy/evaluation controls | Provider SDK/terms/DPA/transfer review; no provider upload |

Before any status becomes `approved_adaptation` or `in_use`, add target path, transformation summary, embedded-dependency review, reviewer, date, and applicable notices to both the registry and this map.
