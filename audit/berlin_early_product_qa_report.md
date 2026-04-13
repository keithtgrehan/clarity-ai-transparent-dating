# Berlin Early Product QA Report

Date: 2026-04-13

## Scope

This pass focused on the highest-value early product slice for initial Berlin testing:

- Safety reporting and blocking
- Overview and first-impression clarity
- Onboarding clarity and trust
- Profile readability
- Matches scanability and explainability
- Chat tone and hierarchy

## Issues Found

### Fixed

1. Safety report submission could fail with `Invalid report payload`.
   - Root cause: the Safety page only populated report targets from the matches endpoint. A fresh seeded viewer had no completed onboarding, which meant zero match candidates and an empty `targetUserId`. Submitting the form then hit backend schema validation and returned a 400.
   - Secondary issue: blank optional IDs like `conversationId: ""` were not normalized safely.

2. Safety validation errors were trust-breaking and too generic.
   - Root cause: frontend request handling collapsed backend field-level validation into a generic error string.

3. Several screens still sounded like an internal build instead of a product for real testers.
   - Examples: `pilot`, `local matching`, negative prototype framing, and technical phrasing that centered the system rather than the user.

4. Match and chat screens were usable but flatter than they should be for quick scanning.
   - Core sections were present, but visual grouping and reading order were not strong enough for a calmer, lower-effort pass.

5. Chat surfaced moderation state too literally.
   - Showing `Moderation: clear` on every message felt technical and unnecessary for users.

### Deferred

1. Browser-console verification on each page.
   - I verified compile/build/dev serving and live API flows, but I did not use a browser automation tool in this pass, so console cleanliness is inferred from successful compilation and dev-server behavior rather than directly observed in-browser.

2. Multi-user safety discovery beyond match and conversation context.
   - The repaired Safety page now supports recent conversations, current matches, and manual user ID entry. A fuller account-level directory or admin-assisted lookup flow is still future work.

3. Real moderation operations.
   - Reports and block effects are structured and working, but review tooling, staff workflows, and permanent enforcement policy are still intentionally lightweight.

## Changes Made

### Safety flow

- Added safer shared schema normalization for optional report IDs.
- Added structured frontend field validation before submit.
- Added backend error detail surfacing in the frontend API layer.
- Expanded Safety page target sourcing to include conversations as well as matches.
- Added better success and field-error messaging.

### UX and copy

- Removed remaining prototype-feeling wording from the main user flow.
- Tightened overview, onboarding, profile, matches, chat, and waitlist copy toward clearer emotional payoff.
- Reframed shell navigation and side notes to feel calmer and more product-like.

### Hierarchy and polish

- Reduced sidebar weight and gave the main content area more focus.
- Strengthened match-card reading order with explicit summary and action framing.
- Improved chat message distinction and removed unnecessary moderation jargon from clear messages.
- Sharpened helper callouts and page-header status presentation.

## Verification Run

### Automated / scripted

- `npm run typecheck`
- `npm run quality`
  - includes workspace build
  - includes `npm run verify:mvp`

### Live local checks

- Started `npm run dev:api`
- Started `npm run dev:web`
- Confirmed:
  - `GET /health`
  - `GET /api/profiles/user-you`
  - Vite served `/`
  - Vite served `/safety`

### Live API flow checks

- Onboarding save: passed
- Matches retrieval after onboarding: passed
- Conversation creation: passed
- Send message: passed
- Report submission with `conversationId: ""`: passed
- Invalid report with missing `targetUserId`: returned expected field-level validation error

## Repo / Runtime Notes

- Runtime store was reset to a clean seeded baseline after verification.
- No dev servers were left running after the pass.
- Untracked folder outside the app work remains untouched:
  - `Clarity screenshots 13.04 2pm/`

## Recommended Next Pass

1. Do a browser-based visual and console pass across the primary routes.
2. Add per-page empty-state screenshots for stakeholder review.
3. Improve match-profile depth without making the UI denser.
4. Replace local-only saved/dismissed match state with server-backed persistence when ready.
