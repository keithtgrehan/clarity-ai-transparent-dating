# System architecture

## Current local architecture

Clarity is a TypeScript npm workspace:

- `apps/web`: React 18 and Vite UI.
- `apps/api`: Fastify API, deterministic services, seed tooling, and JSON persistence.
- `packages/shared`: Zod contracts and inferred types.

The web calls the API, the API validates shared contracts, the store reads/writes one JSON document, and deterministic services create profile and candidate outputs. This design is for synthetic local review only. It has no authenticated trust boundary, transactional persistence, encryption, audit trail, or background worker.

## Approved evolution

- Keep TypeScript for product runtime.
- Introduce breaking contracts under `/api/v2` while v1 remains local-only.
- Add matching, privacy, safety, and evidence packages only when Phase 2 implementation starts.
- Replace JSON with an authenticated, encrypted, auditable production data layer only after the production architecture decision package.
- Permit Python only in a later offline research workspace after source-rights, consent, label-quality, and evaluation gates.
- Do not introduce a production Python service without a separate recorded decision.

Detailed component responsibilities and staged paths are in `docs/architecture/system_architecture.md` and `docs/architecture/repository_structure.md`.
