# Clarity

Clarity is a Berlin-first, communication-oriented local MVP for exploring calmer dating, friendship, and event experiences for neuroinclusive communities. It is a TypeScript monorepo with a React/Vite web app, Fastify API, shared Zod contracts, deterministic rules, and synthetic fixtures.

## Current status

This repository is a governed local research and product-development foundation. It is **not ready for participants or production**.

Implemented locally:

- waitlist capture;
- guided dating-profile onboarding and editing;
- deterministic candidate retrieval and explanations;
- conversations and messages;
- elementary report/block and moderation-pattern scaffolding;
- synthetic Berlin fixtures;
- a disabled-by-default, fictional-fixture-only communication wording/structure review behind `/api/v2`, with a separate loopback Python service.

Important limitations:

- there is no authentication, invitation system, route authorization, production database, encryption, retention enforcement, account export/deletion, or operational moderator queue;
- the viewer identity is hard-coded in the web MVP and client-supplied to the API;
- JSON persistence is only for synthetic local development;
- current “AI” services are deterministic, bounded heuristics, not model inference or psychological understanding;
- the v1 schema requires and exposes fields that are explicitly scheduled for replacement, including diagnosis handling;
- friendship and events are product direction, not implemented first-class modes.
- the communication service has no locally approved NER artifact: its exact fictional route runs identifier-pattern checks only, while every real or unattested text path refuses; its embedding layer abstains; audio decoding and every real-data/training/production gate are disabled.

Do not enter real profiles, messages, reports, diagnosis information, research data, or contact details.

## Product boundaries

Clarity does not diagnose, verify neurotype, infer motives or mental state, predict relationship success, rank attractiveness or popularity, optimize compulsion, or autonomously sanction users. The future direction is voluntary self-description, purpose-specific consent, finite discovery, transparent multidimensional explanations, and human moderation decisions with appeal.

See [the charter](docs/charter.md), [red lines](docs/red_lines.md), [master plan](docs/control_room/MASTER_PLAN.md), [release gates](docs/control_room/RELEASE_GATES.md), and [risk register](docs/control_room/RISK_REGISTER.md).

## Local setup

Requirements: Node.js 22.12 or newer within Node 22, npm 10 or newer, and Python 3.11 or newer for the optional local communication-service tests.

```bash
nvm use
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r services/signal-engine/requirements-dev.lock
PIP_NO_INDEX=1 .venv/bin/python -m pip install --no-build-isolation --no-deps -e services/signal-engine
.venv/bin/python -m pip check
npm run seed
npm run dev
```

The seed command is destructive to the configured local JSON store. `.env.example` is for local development only. Keep `ALLOW_SEED_ENDPOINT=false` outside a disposable local environment. The preserved server binds `0.0.0.0`; run it only on an explicitly isolated host/container/firewall and set an explicit `API_ALLOWED_ORIGIN`. The default launcher is not safe on an untrusted LAN.

## Validation

```bash
npm test
npm run typecheck
npm run build
npm run verify:static
npm run verify:mvp
npm run validate:resource-registry
npm run validate:donor-provenance
npm run validate:signal-registries
npm run validate:training-source-registry
npm run validate:python-lock
npm run validate:claims
npm run check:restricted-artifacts -- --all-tracked
npm run check:no-raw-content
npm run check:signal-safety-language
npm run check:signal-domain-residue
npm run check:secrets
npm run check:public-copy
npm audit --audit-level=high
git diff --check
```

`verify:mvp` has a 30-second outer timeout and uses an isolated temporary store. Automated tests use synthetic fixtures only.

## Repository map

- `apps/web`: React/Vite local UI.
- `apps/api`: Fastify routes, rules, and local persistence.
- `packages/shared`: Zod schemas and shared types.
- `services/signal-engine`: private synthetic-only FastAPI adapter, bounded communication engine, isolated acoustic research primitives, and Python tests.
- `data/fixtures` and `data/seeds`: synthetic local review data.
- `configs`: source-rights and public-claims registries.
- `docs/control_room`: authoritative programme status, decisions, risks, evidence, backlog, gates, and migration map.
- `scripts/governance`: repository safety and provenance checks.

## Licence and reuse

No project licence has been selected. No `LICENSE` file is present. Do not assume permission to copy, redistribute, or accept outside contributions. Donor reuse requires exact provenance and the authorization rules in [the reuse map](docs/architecture/reuse_map.md) and [licence matrix](docs/legal/license_matrix.md).
