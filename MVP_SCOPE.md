# Local MVP scope

## Implemented

- React routes for landing, onboarding, profile, candidates, chat, and safety information.
- Fastify routes for health, waitlist, profiles, onboarding, matches, conversations, messages, reports, and destructive synthetic seed loading.
- Shared Zod schemas, deterministic matching rules, bounded profile checks, local JSON persistence, and synthetic fixtures.
- Report/block scaffolding and pattern-based moderation metadata.

## In the governed-foundation cut

- Repository and agent instructions.
- Control Room, source-rights registry, claims matrix, and governance checks.
- Node 22 reproducibility, automated synthetic tests, bounded verification, dependency remediation, and CI.
- Truthful current-state documentation.
- Draft privacy, safety, accessibility, research, and v1-to-v2 migration specifications.

## Not implemented or production-ready

- Authentication, invitations, authorization, rate limits, CSRF/security headers, encrypted database, audit logs, export/deletion, retention enforcement, production hosting, or operational monitoring.
- Policy-versioned adult eligibility, gender/orientation eligibility, consent, account lifecycle, research feedback, moderation decisions/appeals, or evidence provenance.
- First-class friendship or event modes.
- Transparent v2 multidimensional matching or exposure fairness.
- Dataset acquisition, annotation, model training, provider upload, or model serving.
- Participant recruitment or real-data processing.

## Safety rule

The current MVP is reviewable only with synthetic data. It must not be presented as a live invite-only service. The seed endpoint must be disabled before any non-disposable environment.

The migration sequence and deletion conditions are in `docs/control_room/MIGRATION_MAP.md`.
