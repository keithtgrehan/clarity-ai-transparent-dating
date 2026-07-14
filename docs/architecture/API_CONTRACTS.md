# V1 API contract notes

Status: current local-only v1 inventory. Breaking work belongs under `/api/v2` and `docs/control_room/MIGRATION_MAP.md`.

## Contract Strategy
All core request and response shapes live in `packages/shared` so the web app and API stay aligned by default.

## Primary endpoints

- `GET /health` and `GET /api/health`
- `GET /api`
- `POST /api/waitlist/leads`
- `GET /api/profiles/:userId`
- `PUT /api/profiles/:userId`
- `POST /api/onboarding` with legacy alias `POST /api/onboarding/submit`
- `GET /api/matches?userId=:id` with legacy alias `GET /api/matches/candidates?userId=:id`
- `GET /api/conversations?userId=:id`
- `GET /api/conversations/:conversationId/messages`
- `POST /api/conversations`
- `POST /api/messages`
- `POST /api/reports` with legacy alias `POST /api/safety/report-block`
- `POST /api/admin/load-seeds` (destructive; local synthetic data only)

## Contract Priorities
- deterministic validation with Zod
- explicit request payloads
- plain JSON responses
- no hidden enrichment that the frontend cannot explain

## Known Gaps
- auth and session context are missing
- conversation-message reads are not authorized against an authenticated member
- CORS is permissive when no origin is configured
- the destructive seed endpoint is enabled unless explicitly disabled
- admin moderation endpoints do not exist yet
- deletion/export endpoints do not exist yet
- rate limiting and anti-abuse controls are not implemented
