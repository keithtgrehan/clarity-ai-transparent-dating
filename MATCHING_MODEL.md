# Matching model: current behavior and approved direction

## Current v1 behavior

The API filters completed profiles by exact case-insensitive city, compatible dating intent, mutual `openTo` neurotype values, and report-based blocks. It computes a hidden scalar from communication, social energy, sensory preferences, and routine, then returns reasons, possible friction, shared signals, and a completeness-derived confidence label.

Known defects are intentionally not hidden:

- missing values receive a positive internal default;
- shared neurotype can be presented as positive evidence;
- diagnosis is present in the match payload;
- confidence reflects completeness rather than evidence quality;
- adult status, gender/orientation eligibility, account/moderation state, unknown states, provenance, finite windows, and exposure fairness are absent;
- labels such as “could work” and “friction” can overstate the evidence.

These behaviors are preserved only for v1 characterisation during the governed-foundation cut.

## Approved v2 principles

- Hard filters precede ordering and fail closed when mandatory eligibility data is unknown.
- Neurotype matching use is explicit and off by default; sameness is never inherently better.
- Diagnosis is excluded from service profiles, eligibility, ranking, and public responses.
- Dimensions distinguish `aligned`, `different`, `unknown`, and `not_applicable`.
- Evidence IDs and ruleset provenance support every bounded explanation.
- No total compatibility percentage or romance prediction is returned.
- Ordering is deterministic and lexicographic: viewer-priority alignment, known priority coverage, total alignment, fewer explicit differences, exposure need/rotation, then stable window hash.
- Unknown values never contribute positive alignment.
- Popularity, response delay, activity, and engagement are excluded.
- Discovery is finite, initially capped at 12 eligible candidates per window.

The exact v2 response direction and migration slices are in `docs/control_room/MIGRATION_MAP.md`. Runtime implementation begins only after a separate Issue 14–20 approval.
