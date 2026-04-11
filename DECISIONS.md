# Decisions Log

## D-001: Berlin-first instead of broad geography
Date: 2026-04-11

Decision:
- focus the first product learning loop on Berlin

Why:
- density and trust matter more than total signups
- founder research loops are easier locally
- pilot moderation and community learning stay bounded

## D-002: Neurodivergent-first, not “mental health dating”
Date: 2026-04-11

Decision:
- center ADHD, Autism, and AuDHD
- treat anxiety and depression as optional secondary context only

Why:
- launch users need explicit communication and sensory-fit support
- “mental health dating” framing muddies the product promise

## D-003: No diagnosis proof wall
Date: 2026-04-11

Decision:
- do not require diagnosis proof or clinical validation

Why:
- exclusionary, privacy-invasive, and not aligned with product scope

## D-004: TypeScript monorepo with Fastify API
Date: 2026-04-11

Decision:
- use React + Vite + TypeScript for web
- use Fastify + TypeScript for API
- use shared Zod contracts in a workspace package

Why:
- shared contracts are immediately valuable
- one language reduces founder overhead
- local-first scaffolding is fast to review and extend

## D-005: File-backed persistence first
Date: 2026-04-11

Decision:
- use JSON persistence under `data/runtime` for local development

Why:
- transparent, easy to inspect, easy to reseed
- enough for a serious first-pass repo run

Tradeoff:
- not production-safe for concurrency or security

## D-006: No infinite swipe
Date: 2026-04-11

Decision:
- use a candidate list, not a swipe deck

Why:
- reduces compulsion loops
- supports calmer review and more explicit explanations

## D-007: AI only for bounded support
Date: 2026-04-11

Decision:
- AI may summarize, extract bounded signals, and support moderation review
- AI may not infer diagnosis authenticity or clinical truth

Why:
- product trust depends on legibility and restraint

## D-008: Safety and moderation are foundational, not post-launch garnish
Date: 2026-04-11

Decision:
- include report/block structures and policy drafts in the first pass

Why:
- dating products without safety foundations create avoidable harm

## D-009: Explicit TODOs over fake polish
Date: 2026-04-11

Decision:
- mark incomplete logic honestly
- avoid pretending unfinished flows are ready

Why:
- tomorrow’s iteration speed depends on clear boundaries today
