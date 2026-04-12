# Clarity.ai - transparent dating

Clarity.ai is a Berlin-first, neurodivergent-first dating MVP slice focused on structured onboarding, readable profiles, explainable matching, calm local messaging, and basic safety tooling. The repo is intentionally local-first and intentionally bounded: no auth, no deployment infra, no payments, no mobile app, and no fake AI certainty.

## Working MVP Slice
- multi-step onboarding for ADHD, Autism, AuDHD, and optional neurotypical ally identity support
- persisted profile view/edit loop with completeness and profile summary output
- explainable matches with identity and intent filters, compatibility reasons, and friction notes
- simple conversation list and message flow
- first-message helper based on shared structured traits
- report and block flow with local moderation flag records
- Berlin seed bundle with realistic local candidate profiles
- local JSON persistence plus repeatable setup, seed, typecheck, build, and smoke verification scripts

## Install
1. `cd "/Users/keith/Documents/New project/Clarity.ai - transparent dating"`
2. `npm run setup`

`npm run setup` will:
- install workspace dependencies
- create `.env` from `.env.example` if needed
- create `data/runtime/local-db.json` if needed
- build shared contracts
- seed the local runtime store

## Run The Backend
1. Open a terminal in `/Users/keith/Documents/New project/Clarity.ai - transparent dating`
2. Run `npm run dev:api`
3. Confirm the backend at [http://localhost:4000/health](http://localhost:4000/health)
4. Use the app API at [http://localhost:4000/api](http://localhost:4000/api)

## Run The Frontend
1. Open a second terminal in `/Users/keith/Documents/New project/Clarity.ai - transparent dating`
2. Run `npm run dev:web`
3. Open [http://localhost:5173](http://localhost:5173)

## Run Both Together
- `npm run dev`

This starts:
- shared package watch
- Fastify API on `4000`
- Vite web app on `5173`

If either port is already in use, stop the older process first and restart. The current known caveat is that `tsx watch` can briefly hold onto `4000` after shared-package edits; a clean API restart resolves it.

## Production Build And Start
1. Run `npm run build`
2. Start the single-port production server with `APP_ENV=production SERVE_WEB=true PORT=4100 npm run start`
3. Open [http://localhost:4100](http://localhost:4100)

In production mode:
- the built React app is served from the Fastify process
- browser routes such as `/matches` resolve to the SPA
- JSON API routes live under `/api`
- health checks are available at both `/health` and `/api/health`

## Review Flow
1. Run `npm run seed` for a clean baseline
2. Open `/onboarding`
3. Complete the seven-step onboarding flow for `Riley`
4. Open `/profile` to review the persisted profile, completeness, and summary
5. Open `/matches` to see seeded Berlin candidates
6. Open a conversation from a match card in `/chat`
7. Send a message
8. Use the report button in chat or `/safety` to submit a basic report and block

## Commands
- `npm run setup` installs dependencies, prepares `.env`, and seeds runtime data
- `npm run dev` starts shared watch, backend, and frontend together
- `npm run dev:api` starts only the backend
- `npm run dev:web` starts only the frontend
- `npm run start` starts the built API server; pair it with `APP_ENV=production SERVE_WEB=true PORT=<port>`
- `npm run seed` resets `data/runtime/local-db.json` from the seed bundle
- `npm run typecheck` runs strict TypeScript checks across all workspaces
- `npm run build` builds shared, API, and web packages
- `npm run quality` runs typecheck, build, and the backend MVP verification script
- `npm run verify:mvp` runs the backend smoke verification directly

## Local Environment
The root `.env.example` currently defines:
- `APP_ENV`
- `PORT`
- `WEB_PORT`
- `API_PORT`
- `VITE_API_BASE_URL`
- `API_ALLOWED_ORIGIN`
- `API_STORAGE_FILE`
- `ALLOW_SEED_ENDPOINT`
- `SERVE_WEB`

For local development, `VITE_API_BASE_URL` should point at `http://localhost:4000/api`.

## Current Boundaries
- no auth or real account/session model yet
- no realtime chat infrastructure
- no production moderation queue or reviewer dashboard
- no diagnosis inference, severity inference, or personality typing
- no legal/compliance implementation beyond explicit TODO boundaries
- matching is heuristic and explainable, not predictive

## Audit Docs
- [day2_audit_fix_report.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/audit/day2_audit_fix_report.md)
- [day2_build_report.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/audit/day2_build_report.md)
- [known_issues.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/audit/known_issues.md)
- [next_steps.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/audit/next_steps.md)
- [DESIGN_NOTES.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/DESIGN_NOTES.md)
- [DEPLOY.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/DEPLOY.md)
- [CHANGELOG.md](/Users/keith/Documents/New project/Clarity.ai - transparent dating/CHANGELOG.md)
