# Day 2 Audit Fix Report

## What Was Broken
- The live dev servers were not trustworthy at first. Older Node listeners were still bound to `4000` and `5173`, which meant the running apps could diverge from the current code.
- The product model had drifted on the most important axis: `identity` was still acting like a gender-style field in parts of the stack instead of the requested neurotype identity model.
- `SafetyPage` still depended on a removed local `candidateUsers` stub, which broke frontend typechecking.
- The API contract for onboarding/profile writes was brittle because nested profile payloads still required `userId`.
- Seed and fixture stories had diverged. The main Berlin seed bundle, lightweight fixtures, and audit docs were describing different candidate sets and counts.
- Empty or junk directories were left behind from the overnight scaffold pass, and Vite recreated a workspace-local `.vite` cache under `apps/web/node_modules` during dev.

## What Was Fixed
- Audited the repo structure and removed empty scaffold leftovers:
  - `apps/api/src/storage`
  - `apps/web/src/features`
- Cleaned stale listeners off `4000` and `5173`, then restarted the backend and frontend from a known-clean state.
- Normalized the shared neurotype model across contracts, seeds, matching, summaries, and frontend labels:
  - `adhd`
  - `autism`
  - `audhd`
  - `neurotypical_ally`
  - `prefer_not_to_say`
- Added structured `profileSummary` output with:
  - short summary
  - communication style note
  - clarity level
  - bounded suggestion when signal is weak
- Fixed the onboarding/profile input contract so `userId` is no longer required inside nested profile payloads.
- Reworked `SafetyPage` to use live match candidates instead of a dead stub list.
- Rewrote the Berlin seed bundle and lightweight profile fixtures so the review data matches the product model.
- Re-ran:
  - `npm run seed`
  - `npm run typecheck`
  - `npm run quality`
- Re-verified the live local API slice on the running dev servers:
  - onboarding save
  - profile fetch
  - match retrieval
  - conversation create
  - message send
  - report/block create

## What Remains Uncertain
- Frontend behavior is manually verified through build health and live API-backed flows, but there is still no browser E2E test runner protecting the slice.
- `tsx watch` can still briefly hit `EADDRINUSE` on `4000` when shared files change while the API dev server is already running. A clean restart resolves it, but the dev orchestration should be hardened.
- Matching weights and summary phrasing are still heuristic first-pass logic. They are bounded and explainable, but not yet calibrated with pilot feedback.
- There is still no auth, deletion flow, export flow, or moderator review UI.
