# Clarity repository instructions

## Purpose and scope

Clarity is a Berlin-first, 18+, neuroinclusive local research MVP for dating, friendship, and events. The current runtime is not production-ready and must not be represented as invite-only, authenticated, legally compliant, or safe for real participant data.

## Required working practice

- Inspect `docs/control_room/MASTER_PLAN.md`, `DECISION_LOG.md`, `RELEASE_GATES.md`, and the nearest nested `AGENTS.md` before changing code.
- Preserve existing MVP behavior unless the approved issue explicitly changes it.
- Keep diffs bounded to the approved issue and update tests and evidence with behavior changes.
- Use Node 22, synthetic fixtures, isolated temporary stores, and the validation commands in `README.md`.
- Treat `docs/control_room` as the authoritative programme record. Update status, risks, evidence, and decisions in the same change that affects them.
- Do not deploy, push, merge, rename the repository, delete user work, or alter branches unless Keith Grehan explicitly authorizes it.

## Protected data and stop conditions

- Never add real participant data, private messages, raw transcripts, research exports, credentials, provider payloads, or production database copies.
- Stop and report if any tracked or untracked material appears to contain real participant data, credentials, unexplained restricted artifacts, or unresolved ownership.
- Do not send repository data to an external model or service without an approved resource-registry entry and purpose-specific consent.
- Target/red line: diagnosis is private optional research context only and must not be public, required for service access, used for matching, or inferred. Preserved v1 violates the first three conditions; quarantine that debt to synthetic local use, do not expand it, and remove it before participant use.

## Source provenance

- Do not copy or translate external or donor code before `configs/resource_registry.yml` and `docs/architecture/reuse_map.md` record repository, exact commit, path, blob hash, rights basis, transformation, target, reviewer, and date.
- `NOASSERTION` is not an open-source licence. Keith Grehan's recorded authorization covers only Keith-authored, domain-neutral donor material and not embedded third-party work.
- AGPL sources are architecture references only until a separate licence decision is recorded.

## Product and AI red lines

- No diagnosis authenticity, personality, motive, trauma, attachment, attractiveness, desirability, or hidden mental-state inference.
- No popularity, reply-delay, activity, or compulsion/engagement optimization.
- No scalar claim that predicts romance or relationship success.
- No autonomous moderation sanctions; preserve a human decision and appeal path.
- Describe deterministic heuristics as rules or checks, not as understanding or psychological truth.

## Verification

Run the narrowest relevant tests while working and the complete suite before handoff:

```bash
npm test
npm run typecheck
npm run build
npm run verify:mvp
npm run validate:resource-registry
npm run validate:claims
npm run check:restricted-artifacts -- --all-tracked
npm run check:no-raw-content
npm run check:public-copy
npm audit --audit-level=high
git diff --check
```

An implementation worker must not perform the independent review of its own changes.
