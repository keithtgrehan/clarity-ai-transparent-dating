# Clarity.ai - transparent dating

Clarity.ai is a clarity-first dating MVP for people who want structured onboarding, structured profiles, explainable matching, and lower-ambiguity early conversations. This repo is intentionally local-first: no payments, no mobile app, no fake AI claims, and no pretend backend.

## What Works Now
- backend starts locally with Fastify
- frontend starts locally with Vite
- onboarding saves a persisted profile for the seeded viewer user
- profile page shows structured traits, completeness, summary, and edit flow
- matches return seeded candidates with plain-English reasons, friction notes, and confidence labels
- chat creates conversations, loads threads, and sends messages
- safety flow submits reports and blocks users
- local setup, build, and backend MVP verification are scripted

## Quick Start
1. `cd "/Users/keith/Documents/New project/Clarity.ai - transparent dating"`
2. `npm run setup`
3. `npm run dev`

Local URLs:
- web: [http://localhost:5173](http://localhost:5173)
- api: [http://localhost:4000](http://localhost:4000)

## Demo Flow
After a fresh `npm run seed`, the repo starts with one seeded viewer user and three seeded candidate profiles.

1. Open `/onboarding`
2. Complete the seven-step onboarding flow for `Riley`
3. Open `/profile` to see the persisted structured profile
4. Open `/matches` to view seeded match candidates and explanations
5. Open a conversation from a match card
6. Send a message in `/chat`
7. Use `/safety` or the chat report button to report and block a user

Reset the local runtime store at any time with:
- `npm run seed`

## Commands
- `npm run setup`: install dependencies, copy `.env` from `.env.example` if missing, build shared types, and seed the runtime store
- `npm run dev`: start shared watch, API dev server, and Vite frontend
- `npm run dev:api`: start only the backend
- `npm run dev:web`: start only the frontend
- `npm run seed`: reset the local JSON store from the seed bundle
- `npm run typecheck`: strict workspace typecheck
- `npm run build`: build shared, API, and web
- `npm run quality`: run typecheck, build, and the backend MVP verification script
- `npm run verify:mvp`: run the backend inject-based smoke verification directly

## Local Environment
The repo uses a root `.env` file. `npm run setup` will create it automatically from `.env.example` if needed.

Current local env keys:
- `WEB_PORT`
- `API_PORT`
- `VITE_API_BASE_URL`
- `API_ALLOWED_ORIGIN`
- `API_STORAGE_FILE`
- `ALLOW_SEED_ENDPOINT`

## Architecture
- frontend: React + Vite + TypeScript
- backend: Fastify + TypeScript
- shared contracts: Zod + TypeScript
- persistence: local JSON store at `data/runtime/local-db.json`

## Boundaries
- matching is heuristic and explainable, not predictive
- diagnosis status is user-declared only
- no personality typing
- no diagnosis inference
- no realtime infra
- no auth or multi-device session model yet
- moderation is structured and minimal, not production-ops complete

## Audit Docs
- [audit/day2_audit_fix_report.md](./audit/day2_audit_fix_report.md)
- [audit/day2_build_report.md](./audit/day2_build_report.md)
- [audit/known_issues.md](./audit/known_issues.md)
- [audit/next_steps.md](./audit/next_steps.md)
