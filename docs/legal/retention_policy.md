# Retention policy draft

Status: proposed controls requiring qualified legal/privacy and operational approval before participant processing.

- Synthetic local runtime stores are disposable and may be reset at any time; tests delete temporary stores immediately.
- Real participant data is prohibited until automated retention and deletion exist.
- Collect no field without a named purpose, owner, access role, retention trigger, maximum period, deletion method, backup behavior, and legal-hold rule.
- Optional research/NLP/diagnosis context is deleted or irreversibly de-identified after withdrawal or purpose completion unless an approved legal obligation says otherwise.
- Messages and profile free text must not be copied into analytics or ordinary logs.
- Blocks may remain effective after account deletion using the least identifying representation needed; report evidence and moderation decisions require separate, justified schedules.
- Backups must inherit deletion deadlines and documented restore-time deletion replay.
- Account deletion must cover service, search indexes, caches, exports, research links, processors and backups, while preserving only explicitly justified safety/legal records.

Exact participant retention periods remain an owner/legal decision and must not be invented in code.
