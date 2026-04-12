# Repo Decision

## True App Repo
The true Clarity.ai app repo is:

`/Users/keith/Documents/New project/Clarity.ai - transparent dating`

Evidence:
- it contains the runnable monorepo structure: `apps/api`, `apps/web`, `packages/shared`
- it contains the Day 2 audit artifacts and seeded data used by the local MVP
- it passed local verification on April 12, 2026:
  - `npm run typecheck`
  - `npm run quality`
  - clean cold starts for `npm run dev:api`, `npm run dev:web`, and `npm run dev`

## Wrong Folder
The wrong folder is:

`/Users/keith/Desktop/Project A-Z Clarity`

It is primarily a docs/assets folder containing PDFs, DOCX files, screenshots, and a screenshot zip. It is not the deployable app repo and must not be treated as the source of truth for GitHub or Replit work.

## GitHub History Assessment
The GitHub repo at `https://github.com/keithtgrehan/clarity-ai-transparent-dating` already had useful history for the real app repo.

Findings:
- the real repo already shared lineage with `origin/main`
- `origin/main` was at commit `c9a9741` before recovery work
- the wrong Desktop repo had an unrelated one-commit local history (`f05a783`)
- `git merge-base main origin/main` in the Desktop repo showed the Desktop repo was unrelated to the real remote history

## Reconciliation Strategy Chosen
I used the safest non-destructive route:

1. Verified the Documents repo was the real app repo.
2. Fetched and inspected remote state before changing `main`.
3. Created a recovery branch in the real repo:
   - `codex/repo-recovery-2026-04-12`
4. Committed the verified Day 2 fixes and repo-cleanup work there.
5. Pushed the recovery branch first.
6. Fast-forwarded `main` from the recovery branch and pushed `main`.
7. Disabled pushability in the wrong Desktop repo by renaming its remote and replacing the push URL with a disabled value.

No force-push was used.

## Branches Created Or Updated
- created and pushed `codex/repo-recovery-2026-04-12`
- updated and pushed `main`

At the end of reconciliation:
- `main` had been fast-forwarded from `codex/repo-recovery-2026-04-12`
- the recovery branch had been pushed successfully as a checkpoint branch
- GitHub contained the validated real app history rather than the unrelated Desktop repo history

## Is Main Safe Now?
Yes.

`main` is now safe to use as the source-of-truth branch for Replit import and future GitHub work.

Important caveat:
- the wrong Desktop folder is still a local git repo, but its remote is intentionally de-armed:
  - remote name: `disabled-origin`
  - push URL: `DISABLED_PUSH_REMOTE`

## Backup / Quarantine Locations
- wrong Desktop repo git config backup:
  - `/Users/keith/Documents/New project/recovery_backups/clarity-ai-2026-04-12/wrong-desktop-repo-git-config/config.before-disable`
- untracked duplicate source files moved out of the real repo:
  - `/Users/keith/Documents/New project/recovery_backups/clarity-ai-2026-04-12/real-repo-untracked-duplicates`
