# Overnight Run Report

Historical artifact from the initial scaffold. It contains obsolete paths, counts, route claims, commands, and verification output and must not be used as current evidence. Use `README.md`, `docs/control_room/EVIDENCE_INDEX.md`, and the Phase 0/1 validation report instead.

## Exact Summary Of What Was Created

### Product and strategy docs
- root product docs for brief, scope, Berlin launch plan, personas, matching model, safety principles, AI boundaries, system architecture, roadmap, and decisions
- supporting docs for waitlist schema, API contracts, onboarding flow, safety policy drafts, outreach templates, analytics events, and prompt guidelines

### Monorepo and tooling
- npm workspace monorepo with `apps/web`, `apps/api`, and `packages/shared`
- root setup, dev, quality, and seed scripts
- `.env.example`, `.gitignore`, base TypeScript config, and README

### Shared domain layer
- Zod schemas and TypeScript types for:
  - `User`
  - `Profile`
  - `CommunicationPreferences`
  - `SensoryPreferences`
  - `RelationshipIntent`
  - `MatchCandidate`
  - `ProfileSummary`
  - `Conversation`
  - `Message`
  - `ModerationFlag`
  - `Report`
  - `WaitlistLead`
- shared request/response contracts for waitlist, onboarding, profiles, matching, conversations, messaging, and safety

### Web foundation
- React + Vite + TypeScript app scaffold
- calm route-based UI for landing, onboarding, profile, matches, chat, settings, and safety
- real local waitlist form posting to the API
- demo profile editing, candidate retrieval, conversation list/message view, and report/block form

### API foundation
- Fastify + TypeScript API scaffold
- file-backed local persistence under `data/runtime/local-db.json`
- implemented endpoints for:
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

### Matching, AI, and safety skeletons
- deterministic profile summary builder
- communication-style extraction
- low-signal detection
- intent clarity detection
- contradiction detection
- weighted compatibility calculation
- simple moderation pattern scanner with review-state support
- moderation categories, banned-pattern examples, review template, and content policy draft

### Berlin launch and seed assets
- Berlin-first seed bundle with four demo users, four profiles, one conversation, and waitlist data
- fixture files for test profiles and waitlist examples
- growth/outreach drafts and analytics event list

## Commands To Run Locally
1. `cd "/Users/keith/Documents/New project/Project A-Z"`
2. `npm run setup`
3. `npm run dev`
4. `npm run quality`
5. `npm run seed`

## Verification Completed
- `npm run setup`
- `npm run quality`
- `GET /health` returned `{"status":"ok","app":"project-a-z-api","stage":"foundation"}`
- `GET /matches/candidates?userId=user-lara` returned ranked seeded candidates
- `GET /conversations?userId=user-lara` returned seeded conversation data

## Known Gaps
- no auth, sessions, or access control
- no real database or migration layer
- no deletion, export, consent, retention, or legal policy implementation
- no moderator dashboard or appeals workflow
- no tests yet beyond build/typecheck and route smoke checks
- AI logic is heuristic scaffolding with explicit TODOs, not calibrated product logic
- no deployment, billing, push, mobile, or real-time messaging infra

## Highest-Priority Next Steps
1. Choose auth/session approach and thread it through profile, chat, and report flows.
2. Add route tests for waitlist, profiles, matches, conversations, messages, and report/block.
3. Design the founder moderation queue and manual review workflow before any real pilot.
4. Refine onboarding based on 5 to 10 Berlin user conversations.
5. Add privacy/deletion/export requirements with real legal review.
6. Decide whether relationship structure needs to be a first-class launch filter.
7. Replace JSON persistence with a proper database once the product model stabilizes.

## Key Design Decisions Made During The Run
- Berlin-first instead of broad geography
- neurodivergent-first without “mental health dating” framing
- no diagnosis proof wall
- TypeScript monorepo with Fastify API instead of a split Python backend
- file-backed local persistence for speed and inspectability
- candidate list instead of swipe deck
- bounded AI support only
- safety and moderation included in the first pass, not deferred
