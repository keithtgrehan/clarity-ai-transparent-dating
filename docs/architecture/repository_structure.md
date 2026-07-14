# Repository structure policy

Current concrete paths:

```text
apps/web                 local React UI
apps/api                 local Fastify API and synthetic store
packages/shared          v1 Zod contracts
configs                  source-rights and claims registries
data/fixtures            synthetic deterministic fixtures
data/seeds               synthetic local seed bundle
docs/control_room        authoritative programme records
docs/architecture        system and reuse design
docs/legal               engineering privacy/legal drafts
docs/product             product and accessibility specifications
docs/research            research gates and model radar
docs/safety              threat and moderation policy
scripts/governance       provenance and restricted-content checks
```

Do not create empty future packages for appearance. Add `packages/matching`, `packages/privacy`, `packages/safety`, and `packages/evidence` only in Phase 2; `apps/research-admin`/`ops/n8n` only with an approved Phase 3 workflow; `packages/evaluation`/`evals` in Phase 6; and `python/nlp-research` in Phase 7. A root research-data workspace requires an approved concrete artifact, access policy, retention owner, and consent/source record.
