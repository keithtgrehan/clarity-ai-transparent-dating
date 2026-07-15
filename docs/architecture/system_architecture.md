# Detailed system architecture

## Current trust boundary

The current web and API run as one local developer-controlled system. Identity values are supplied by the client; the API does not authenticate them. Fastify reads and rewrites a single Zod-validated JSON document. This is transparent for synthetic demos but provides no production confidentiality, concurrency, authorization, audit, or lifecycle guarantees.

## Current data flow

1. React collects profile, waitlist, conversation, message, or report inputs.
2. Fastify validates the request with shared Zod schemas.
3. Route handlers read and rewrite the JSON store.
4. Deterministic services create profile checks, match ordering, explanations, and moderation metadata.
5. Responses are rendered by the web client; saved/dismissed candidates remain browser-local.

## Staged target

- Phase 2 introduces versioned TypeScript contracts and bounded matching/privacy/safety/evidence packages.
- Phase 3 separates moderation cases/evidence and research-safe operations.
- Phase 5 introduces real authentication, authorization, encrypted transactional persistence, audit, retention, export/deletion, incident controls, and privileged administration.
- Phase 6 adds a consent-bound evaluation boundary isolated from service data.
- Phase 7 permits offline Python research only; no production Python service is implied.

Every future boundary must document controller/processor roles, data categories, purpose, legal/consent basis, recipients, region/transfer, retention, access roles, logging, deletion, and incident owner before data moves across it.
