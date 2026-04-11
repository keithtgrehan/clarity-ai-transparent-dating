# Known Issues

## Current Limits
- No authentication. The MVP is intentionally centered on a seeded viewer account (`user-you`) plus seeded candidates.
- No browser automation coverage yet. The backend smoke test is real and repeatable, but frontend interaction is still manually verified.
- The local store is JSON-backed and single-instance. It is suitable for local review, not concurrent production usage.
- Match scoring is heuristic and explainable, but not yet calibrated against real pilot feedback.
- Reporting creates structured safety records and block effects, but there is no moderation queue, admin dashboard, or appeal flow.
- Chat is request/response only. There is no realtime syncing, typing indicator, or notification layer.

## Product Boundaries Still Enforced
- No diagnosis inference
- No personality typing
- No fake compatibility percentages in the UI
- No manipulative engagement loops
- No payments
- No mobile app

## Minor Technical Notes
- Running `npm run dev:web -- --host 0.0.0.0` is unnecessary now because Vite is configured to serve on host automatically through the config.
- `data/runtime/local-db.json` is a seeded local artifact for the review flow. Use `npm run seed` whenever you want to reset it to baseline.
