# Next Steps

## Highest Priority
1. Add browser E2E coverage for onboarding, profile save, matches, chat, and report/block so the Day 2 MVP slice stays stable.
2. Replace the seeded viewer assumption with a minimal auth/current-user abstraction that still keeps the product local-first.
3. Harden dev orchestration so shared-package edits do not leave the API watcher in an `EADDRINUSE` state.

## Product Follow-On Work
1. Calibrate match reasoning and friction language with real Berlin pilot feedback.
2. Add finer filtering around identity openness, intent, and neighborhood-level proximity.
3. Expand profile guidance so low-signal suggestions feel more concrete and less generic.

## Safety Follow-On Work
1. Add a founder moderation review screen for submitted reports and flags.
2. Define first-pass retention, deletion, and evidence-handling rules before any live pilot.
3. Add clearer blocked-user states in the UI for conversations and matches.
