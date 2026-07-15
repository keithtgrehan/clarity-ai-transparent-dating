# V1-to-v2 migration map

Status: specification only. Issues 1–13 must not change runtime v1 schemas or matching behavior.

## Versioning and sequence

1. Add shared v2 schemas with `schemaVersion: 2` and contract tests; keep v1 unchanged.
2. Add `/api/v2` readers/writers backed by synthetic v2 fixtures.
3. Implement dry-run migration output containing record ID, action, unresolved fields and no raw sensitive values.
4. Migrate one vertical slice at a time: consent/lifecycle, profile/private research, eligibility, match response, moderation, research feedback, then UI.
5. Run v1 and v2 synthetic regression suites while the local web migrates.
6. Make v2 the only web path, rehearse rollback, then disable v1 before any participant beta.
7. Delete legacy fields/endpoints only after v2 evidence and a recorded deletion decision.

## Field and interface map

| V1 source | V2 target/action | API/UI and fixtures | Test and rollback |
|---|---|---|---|
| `Profile.identity` | `neurotypeSelfDescription { terms, selfDescribe?, visibility, useForMatching }`; voluntary, matching use false by default | Explicit visibility/use controls; synthetic terms only | Verify no implicit use; rollback reads v1 without writing v2 |
| `Profile.openTo` | Explicit neurotype preference filter, disabled by default | No preselected groups | Unknown/off never filters or scores |
| `Profile.diagnosisStatus` | Remove from service profile; optional `PrivateResearchContext.diagnosisSelfDescription` only with active research plus diagnosis-context consent | Never returned by profile/match APIs; no UI outside private research surface | Real legacy values are `reconfirmation_required`, never auto-copied; synthetic records may map in fixtures |
| `Profile.age` | Display age plus `AgeEligibility { adultConfirmed, policyVersion, confirmedAt }` | Separate adult confirmation; no document upload by default | Missing/false confirmation fails closed; rollback retains display value only |
| Missing gender/orientation | Separate public self-description from explicit genders sought/mutual eligibility; orientation display optional and never scored | Vocabulary requires participatory approval | Mutual eligibility matrix tests; unknown mandatory data fails closed |
| `relationshipIntent` | `connectionModes: dating | friendship | event` plus dating intention subtype | Mode-specific onboarding/discovery | `friendship_first` maps to review-required, not automatic eligibility |
| Communication/social/sensory/routine fields | Field-level visibility/use preferences plus richer explicit service preferences | User can keep fields private or exclude from matching | Private/off fields create `unknown`, never positive alignment |
| Implicit service state | Versioned consent records for service, research, NLP feedback, marketing waitlist and event participation | Separate controls; optional purposes default declined/not granted | Withdrawal blocks future use; service is not conditioned on optional research |
| `User.accountStatus` | `active | paused | deletion_requested | deleted | moderation_hold` with timestamps | Settings and moderator surfaces later | Every state has eligibility/storage tests and rollback event |
| V1 match candidate | `MatchCandidateV2` with dimensions, evidence IDs, unknowns, confidence basis and ruleset provenance | `/api/v2/matches`; finite window of 12 | No diagnosis, scalar or default-positive unknown; snapshot fixtures |
| Hidden `sortScore` | Deterministic lexicographic tuple: viewer-priority alignment, known coverage, total alignment, fewer differences, exposure need, stable window hash | Order explanation never exposes sensitive fields | Determinism, tie, cold-start, unknown and rotation tests |
| Report used as block | Separate `Report`, `Block`, `ModerationCase`, access-controlled evidence, human `Decision`, and `Appeal` | Reporter, member and moderator authorization | Block immediate; sanction never automatic; appeal lifecycle tested |
| No research feedback model | Consent-referenced, minimized feedback with purpose, retention and review status; training eligible false by default | Private research/admin APIs only | No consent/no collection; withdrawal and deletion tests |
| One JSON store | Synthetic v2 fixture store first; production datastore is a later approved migration | Dry-run only until G5 architecture | Backup/restore rehearsal, checksums and rollback required before real migration |

## V2 match response direction

Dimensions are intent, communication, planning, sensory, social energy, logistics, values/interests and accessibility. Each returns `aligned | different | unknown | not_applicable`, evidence IDs and a bounded reason. The response also provides top overlap, potential differences, unknown areas, confidence basis/missing fields, explanation engine/ruleset/version/time, and a conversation starter. It never returns a total compatibility percentage.

## Decision-complete v2 contract shapes

These are the minimum public interface decisions for implementation. Names may change only through a new recorded decision; defaults and separation rules may not change silently.

```ts
type FieldUsePreference = {
  visibility: "private" | "matches" | "event_participants";
  useForMatching: boolean; // always defaults to false for sensitive/new fields
};

type ConsentRecordV2 = {
  id: string;
  subjectUserId: string;
  purpose: "service" | "research" | "diagnosis_context" | "nlp_feedback" | "marketing_waitlist" | "event_participation";
  status: "granted" | "declined" | "withdrawn";
  policyVersion: string;
  noticeVersion: string;
  decidedAt: string;
  effectiveAt: string;
  sourceSurface: string;
  withdrawnAt?: string;
};

type EvidenceObjectV2 = {
  id: string;
  sourceType: "declared_profile_field" | "declared_preference" | "consented_text_cue" | "system_rule";
  sourceId: string;
  fieldPath?: string;
  span?: { start: number; end: number }; // private evaluation only; never in match response
  ruleOrCueId: string;
  observation: string; // safe, bounded and non-diagnostic
  confidence: "supported" | "low" | "insufficient";
  provenance: { engineVersion: string; rulesetVersion: string; generatedAt: string };
  allowedUses: Array<"matching_explanation" | "user_draft" | "moderation_review" | "consented_research">;
  rawContentPolicy: "none" | "private_reference_only";
  interpretationLimits: string[];
};

type ResearchFeedbackV2 = {
  id: string;
  subjectUserId: string;
  purpose: "research" | "nlp_feedback";
  consentRef: string;
  targetType: "profile_summary" | "match_explanation" | "communication_cue" | "product_flow";
  targetId: string;
  rating?: number;
  tags: string[];
  freeText?: string;
  trainingEligible: false; // only a later reviewed-gold action may create a separate eligible artifact
  minimizationState: "pending_review" | "minimized" | "rejected";
  reviewStatus: "unreviewed" | "reviewed" | "withdrawn" | "deleted";
  retentionRuleId: string;
  createdAt: string;
};
```

`neurotypeSelfDescription` contains `terms`, optional `selfDescribe`, and `FieldUsePreference`; `useForMatching` defaults false. Provisional gender vocabulary is `woman | man | nonbinary | agender | genderfluid | another_identity | prefer_not_to_say` plus optional custom label. Orientation display is optional and never scored. Mutual gender eligibility uses a separate explicit `gendersSought` selection and matching-use consent. Vocabulary cannot reach beta until participatory review, but implementers do not invent additional categories during the contract slice.

Account lifecycle is `active | paused | deletion_requested | deleted | moderation_hold` with effective timestamps and reason references. Paused/deletion/moderation-hold accounts are ineligible; deletion and consent withdrawal override rollback.

Moderation is split into:

- `Block`: blocker, blocked user, active/revoked timestamps; immediate user protection and no platform-finding requirement.
- `Report`: authenticated reporter/target, optional conversation/message references, categories, minimized description, submitted time.
- `ModerationCase`: report references, state, assigned role, policy version, severity and deadlines.
- `ModerationEvidence`: case ID, source reference, access class `safety_reviewer | appeal_reviewer`, retention rule, integrity hash, and optional private raw reference; raw content is not copied into ordinary API/log fields.
- `ModerationDecision`: human reviewer, reason codes, scope/duration, policy version, evidence IDs and decision time.
- `Appeal`: decision ID, appellant, grounds, state, independent reviewer where practicable, outcome and timestamps.

Ordinary users may access their own block/report status and appropriate decision/appeal notices, never private evidence or another reporter's identity. Safety reviewers receive least-privilege case access; appeal reviewers receive only the evidence required for appeal. Each evidence class has its own approved retention rule; service-profile retention cannot be reused as the default.

Minimum v2 endpoints are `GET/PUT /api/v2/profiles/:userId`, `GET/PUT /api/v2/profiles/:userId/private-research`, `GET/POST /api/v2/consents`, `GET /api/v2/matches`, `POST /api/v2/blocks`, `POST /api/v2/reports`, `GET/POST /api/v2/appeals`, and private moderator-case routes under a separately authorized namespace. All subject IDs come from authenticated server context; path/body IDs never establish authority.

## Stop and rollback rules

- Stop if migration would expose diagnosis, copy a real legacy diagnosis without fresh consent, silently enable matching use, or lose block/moderation state.
- Every writer is version-specific; failed slices leave v1 untouched.
- Dry-run and apply outputs contain IDs and state transitions, not raw text.
- Rollback restores the previous application reader and datastore snapshot; it never reverses a consent withdrawal or deletion request.
- V1 deletion requires signed evidence that the web uses v2, regression tests pass, rollback was rehearsed, and no participant environment depends on v1.
