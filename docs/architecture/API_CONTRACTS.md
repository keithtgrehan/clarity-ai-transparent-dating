# API Contract Notes

## Contract Strategy
All core request and response shapes live in `packages/shared` so the web app and API stay aligned by default.

## Primary Endpoints
- `POST /waitlist/leads`
- `GET /profiles/:userId`
- `PUT /profiles/:userId`
- `POST /onboarding/submit`
- `GET /matches/candidates`
- `GET /conversations`
- `GET /conversations/:conversationId/messages`
- `POST /conversations`
- `POST /messages`
- `POST /safety/report-block`
- `POST /admin/load-seeds`

## Contract Priorities
- deterministic validation with Zod
- explicit request payloads
- plain JSON responses
- no hidden enrichment that the frontend cannot explain

## Known Gaps
- auth and session context are missing
- admin moderation endpoints do not exist yet
- deletion/export endpoints do not exist yet
- rate limiting and anti-abuse controls are not implemented
