# System Architecture

## Architecture Summary
Clarity.ai - transparent dating uses a local-first TypeScript monorepo:
- `apps/web`: React + Vite + TypeScript frontend
- `apps/api`: Fastify + TypeScript API
- `packages/shared`: shared Zod schemas, domain types, and API contracts

This stack was chosen to minimize language switching, keep contracts shared, and make solo-founder iteration faster than a split TypeScript/Python stack at this phase.

## Why Fastify Instead Of FastAPI
FastAPI is strong, but for this repo run the better tradeoff is a TypeScript backend because:
- shared contracts matter immediately
- frontend and backend can use the same types and validation language
- solo-founder velocity benefits from one language and one toolchain
- the early NLP features are bounded scaffolds, not GPU-heavy model serving

Python may still become useful later for heavier evaluation or ML pipelines, but it is not required for this first-pass foundation.

## High-Level Flow
1. web app renders calm route-based UI
2. web submits forms to local API
3. API validates input with shared Zod schemas
4. API persists to a local JSON store under `data/runtime`
5. matching and AI-support services compute bounded outputs
6. web renders profile, candidate, conversation, and safety states

## Package Responsibilities

### `apps/web`
- landing and waitlist
- onboarding flow
- profile editing UI
- candidate list UI
- conversations UI
- settings and safety flows

### `apps/api`
- route handlers
- local persistence
- seed loading
- matching orchestration
- AI-support skeleton functions
- moderation scaffolding

### `packages/shared`
- domain schemas
- API request and response contracts
- enums and constants
- derived types for frontend and backend reuse

## Persistence Strategy For This Stage
Use file-backed JSON persistence for speed and transparency:
- seed data lives in `data/seeds`
- deterministic fixtures live in `data/fixtures`
- mutable local runtime store lives in `data/runtime/local-db.json`

This is intentionally not production storage. It is a reviewable scaffold for local product iteration.

## Security And Privacy Notes
- authentication is not implemented in this pass
- secrets should stay in local environment variables only
- data minimization and retention rules need later legal review
- export/deletion flows are documented as TODOs, not implemented

## Key Technical Boundaries
- no deployment infrastructure
- no background jobs
- no payments
- no mobile app
- no real-time websocket layer yet

## Planned Evolution Path
Phase 1:
- local JSON store
- manual moderation review
- deterministic scoring

Phase 2:
- real auth
- proper database
- audit logs and admin tools

Phase 3:
- richer messaging and moderation tooling
- calibrated AI eval loop
- explicit consent and deletion workflows
