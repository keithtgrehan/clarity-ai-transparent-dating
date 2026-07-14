# Threat model

## Protected interests

Participant identity and location, voluntary neurotype/diagnosis context, private communications, safety reports, block graph, consent/withdrawal, research data, moderator identity, and fair access to discovery.

## Principal threats

- Client identity spoofing and unauthorized profile, conversation, report or seed actions.
- Enumeration, scraping, stalking, doxxing and location inference.
- Harassment, sexual pressure, fetishisation, hate, threats, coercion, scams, impersonation, image abuse and repeated boundary violations.
- Underage access or adult targeting of minors.
- Report abuse, retaliation, moderator misuse and evidence overexposure.
- Raw-content leakage through logs, analytics, CI, providers or public artifacts.
- Sensitive-field inference or discriminatory filtering/ranking.
- JSON corruption/races, dependency compromise, secrets, permissive CORS and destructive administration.
- Dark patterns, exposure monopolies and safety penalties for pausing/blocking/reporting.

## Required controls before beta

Authenticated invitations, server-owned subject identity, object-level authorization, rate limits/abuse controls, security headers and CSRF decision, encrypted transactional storage, least privilege, audit, content-free logs, retention/export/deletion, underage procedure, block/report/case/decision/appeal separation, moderator access separation, incident response and tested rollback.

The current mitigations—synthetic-only operation, repository scans, bounded tests and explicit no-go gates—reduce development risk but do not make v1 safe for participants.
