# Clarity.ai - transparent dating

Clarity.ai - transparent dating is a Berlin-first dating product foundation for ADHD, Autism, and AuDHD users. This repository is a serious first-pass local monorepo intended for review and iteration, not a production-ready application.

## What This Repo Contains
- concrete product, launch, safety, and architecture docs
- a TypeScript monorepo with `apps/web`, `apps/api`, and `packages/shared`
- local JSON-backed persistence scaffolding
- first-pass domain models and API contracts
- calm frontend route stubs for landing, onboarding, profile, matches, chat, settings, and safety flows
- bounded matching, AI-support, and moderation scaffolds
- Berlin-first waitlist, growth, and seed-data foundations

## Stack Choice
- frontend: React + Vite + TypeScript
- backend: Fastify + TypeScript
- shared contracts: Zod + TypeScript

Fastify was chosen over FastAPI for this run because shared TypeScript contracts across web and API are more valuable than a second language/toolchain at this stage of solo founder execution.

## Quick Start
1. `cd "/Users/keith/Documents/New project/Clarity.ai - transparent dating"`
2. `npm run setup`
3. `npm run dev`

Web app:
- [apps/web](./apps/web)

API:
- [apps/api](./apps/api)

Shared contracts:
- [packages/shared](./packages/shared)

## Key Commands
- `npm run setup`: install workspace dependencies and prepare the local runtime store
- `npm run dev`: start shared build watch, API dev server, and Vite web server
- `npm run seed`: load Berlin-first seed data into the local runtime store
- `npm run quality`: run type checks and builds across the workspace

## Current Truth
- this repo is intentionally honest about incomplete product logic
- auth, deployment, legal review, deletion workflows, and production moderation operations are not done
- AI features are bounded skeletons only

## Core Docs
- [PRODUCT_BRIEF.md](./PRODUCT_BRIEF.md)
- [MVP_SCOPE.md](./MVP_SCOPE.md)
- [BERLIN_LAUNCH_PLAN.md](./BERLIN_LAUNCH_PLAN.md)
- [USER_PERSONAS.md](./USER_PERSONAS.md)
- [MATCHING_MODEL.md](./MATCHING_MODEL.md)
- [SAFETY_PRINCIPLES.md](./SAFETY_PRINCIPLES.md)
- [AI_BOUNDARIES.md](./AI_BOUNDARIES.md)
- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
- [DECISIONS.md](./DECISIONS.md)
