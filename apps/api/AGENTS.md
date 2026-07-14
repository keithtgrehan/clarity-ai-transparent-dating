# API instructions

- The API and JSON store are synthetic local-development scaffolding, not production services.
- Route identity is currently client-supplied. Never describe it as authenticated or authorized; security gaps belong in tests, risks, and migration gates.
- Tests must set `API_STORAGE_FILE` to a fresh temporary path and remove it after completion.
- Never log message bodies, profile free text, diagnosis context, emails, report descriptions, credentials, or provider payloads.
- Treat `/api/admin/load-seeds` as destructive. It must be disabled before any non-local environment and may only load tracked synthetic fixtures.
- Add future breaking contracts under `/api/v2`; do not silently change v1 wire shapes.
- Do not add diagnosis fields to public or matching responses. Existing v1 diagnosis behavior is documented migration debt and must not be expanded.
- Do not implement automated moderation sanctions. Pattern matching may create review metadata only.
- Preserve bounded shutdown for Fastify instances and temporary stores in every test or verification command.
