# Training asset extraction

Status: method extraction only; training is disabled

Last reviewed: 2026-07-15

This document records which research and donor concepts were retained, transformed or rejected. It does not authorize a corpus, model training, participant input, public scraping, private-message use, audio use, provider transfer, or production inference. The source-of-truth decisions are `configs/training_source_registry.yml`, `configs/resource_registry.yml`, the canonical cue registry and the Control Room release gates.

## Extraction decisions

| Source concept | Retained abstraction | Clarity target | Excluded material |
|---|---|---|---|
| private WhatsApp research plan | abstract row schema, review roles, consent-reference field, withdrawal/deletion coverage, aggregate-only reporting | future G6 protocol design only | exports, names, messages, redacted messages, examples, labels, notes, files and derived artifacts |
| synthetic 10k plan | scenario matrix, coverage balancing, hard negatives, split isolation, manifest checks, blocked-output tests | Clarity-authored synthetic fixture method | donor fixtures, donor rows, private-derived examples, corpus size or quality claims, trained artifact |
| dataset/benchmark radar | metadata-first rights review and explicit blocked uses | source registry and candidate inventory below | downloads, raw rows, benchmark execution and auto-promotion to gold |
| observable cue taxonomy | evidence preconditions, cannot-infer limits, low-signal fallback | canonical cue registry | diagnosis-centered profile names, hidden-state cues, relationship verdicts and deprecated output IDs |
| matching rights map | explicit dimensions, multi-stakeholder review, unknown handling | deterministic matching research boundary | compatibility score, popularity/reply ranking and inferred sensitive traits |
| calm UI research | evidence before explanation, explicit consent/review, one editable action, useful abstention | synthetic-only review UI acceptance criteria | urgency, streaks, variable rewards, infinite feeds and notification pressure |

All legacy concepts above are reference-only from `keithtgrehan/NLP-ENGINE-TRAINER-LIMITLESS` at `c09944a4061011044b461be2512b955e3b1af981`. Exact source paths and blobs are pinned in `configs/resource_registry.yml`; the donor’s `NOASSERTION` status is not a licence or outbound rights grant. No source prose or data is copied into Clarity.

## Abstract private-review schema

Only the schema and reviewer process are retained as a future design artifact. No private row may instantiate this schema under the current milestone.

| Field | Purpose | Privacy constraint |
|---|---|---|
| `review_item_id` | random, source-neutral review identifier | must not encode file, account, date, participant or thread identity |
| `source_tier` | approved registry source ID | fail closed if the registry row is absent, expired or broader than the purpose |
| `consent_reference` | external reference to purpose-specific authority | no consent document or participant identity in a model row |
| `withdrawal_state` | current include/delete state | deletion must cover raw, redacted, labels, vectors, caches and artifacts |
| `task_id` | bounded communication task | cannot encode diagnosis, attraction, deception or outcome |
| `candidate_cue_ids` | deterministic review suggestions | never gold; reviewers can reject all and choose low signal |
| `reviewed_cue_ids` | human-reviewed observable cue IDs | only canonical registry IDs and satisfied preconditions |
| `evidence_offsets` | offsets inside a restricted ephemeral review view | no source text in exports, reports, logs or issue trackers |
| `review_status` | unreviewed, reviewed, adjudicated, excluded | unreviewed and weak labels never enter gold |
| `reviewer_role` | role, not personal account identity | access-controlled audit mapping held outside corpus artifacts |
| `deletion_receipt` | aggregate proof that required stores were handled | unlink/delete wording only; no complete storage-erasure guarantee |

Future reviewer process, if G4 and G6 are independently approved:

1. verify source-specific rights, privacy and purpose records before access;
2. present the minimum context needed in a restricted local review surface;
3. require a low-signal/none option and visible cue preconditions;
4. review observable wording only, never an inferred person state;
5. adjudicate disagreements without treating majority vote as truth;
6. export counts, agreement and error categories only;
7. execute and verify withdrawal/deletion across every derivative store;
8. keep all raw, redacted and row-level material out of git, CI, PRs, screenshots, providers and public reports.

None of these steps is active or approved now.

## Clarity-authored synthetic fixture method

Synthetic fixtures are the only currently permitted content asset, and only for contract, deterministic-regression, safety-red-team and accessibility-demo purposes. They are not enabled for training.

### Scenario matrix

Each fixture declares independent dimensions so coverage is deliberate rather than mistaken for prevalence:

- task: clarify, lower pressure, request time, repair, summarize, offer channel choice;
- profile: `structure_support` or `wording_support`;
- language context: `en-US`, `en-GB`, `en-EU`, or `mixed`, always as test metadata rather than a robustness claim;
- signal level: supported, low signal, unknown context, hard negative, blocked request;
- cue family: canonical cue ID or explicit no-cue expectation;
- structure: single statement, multi-part request, transition, long detail run, response window;
- safety boundary: no person-state claim, no diagnosis, no attraction, no deception, no outcome;
- privacy behavior: identifier minimisation category counts and closed-output check;
- accessibility state: keyboard path, focus order, reduced motion and dismissible result.

### Balance rules

- Balance means test coverage, not a population distribution.
- Every supported cue has positive, near-miss, negated, quoted-text, dialect-variant and low-signal cases where applicable.
- No profile, dialect tag or cue may dominate merely because a generator template is easier to expand.
- Multi-cue cases are capped so single-cue failures remain diagnosable.
- Paraphrase families stay in one split; near-duplicates cannot cross dev/holdout boundaries.
- The held-out set is human-authored independently of generator prompts and frozen before threshold work.
- Any synthetic generator output requires human review and provenance before it becomes a fixture.

### Hard-negative families

| Risk | Required hard negative | Expected behavior |
|---|---|---|
| ambiguity overread | accurate uncertainty or polite softening | cautious observation or low signal; no confidence/motive claim |
| urgency/pressure conflation | genuine deadline without obligation or proof demand | do not emit pressure |
| long-turn pathologizing | detailed shared-interest message with an explicit summary | do not apply a pathologizing density label or judge rapport |
| repair overclaim | apology or correction without evidence of resolution | describe marker only; no relationship verdict |
| processing-time inference | explicit pause request with no reason | describe request/window only; no cognitive-state claim |
| dialect normalization | valid US, UK, Euro-English or mixed phrasing outside a rule list | unknown/abstain; do not “correct” dialect |
| reassurance pathology | one considerate check or permission-preserving phrase | no anxiety, attachment or compulsion claim |
| contradiction/deception conflation | changed availability with a plausible update | no lying or hidden-intent claim |
| identifier minimisation | synthetic handle/location/name variants | fail closed if residual detector fires; no complete-removal claim |

### Manifest and validation fields

Every fixture pack records:

- pack ID and version;
- owner attestation and review date;
- generation method and tool/model identifier if used;
- prompt/template family ID without external or private source text;
- split and duplicate-family group;
- expected canonical cue IDs and evidence offsets;
- expected low-signal/abstention state;
- blocked outputs and closed-contract assertions;
- language metadata and the explicit statement that it is not population validation;
- content hash, fixture count and reviewer status.

The validator rejects unknown/deprecated cue IDs, missing evidence for supported cues, forbidden person-state language, realistic identifiers, unreviewed generated content, split leakage, unregistered source IDs and any training/accuracy claim.

## Canonical taxonomy and alias extraction

The canonical runtime IDs live in `configs/cue_registry_v1.yml`. Legacy labels are not parallel product outputs.

| Legacy or ambiguous term | Canonical resolution | Reason |
|---|---|---|
| `cognitive_load` | `structure.multi_request_load` | count observable requests; do not claim cognitive state |
| `cognitive_load_proxy` | `structure.multi_request_load` | same observable rule and limitation |
| `request_stacking` | `structure.multi_request_load` | one ID avoids metric fragmentation |
| `potential_overload` / `overloaded_message` | use `structure.multi_request_load`, `structure.long_information_run`, or abstain according to preconditions | separate question count from length/scanability |
| legacy pathologizing density/interest labels | no canonical output | hidden-state terms are excluded; long turns can support rapport |
| `linear_narrative_break` / `topic_shift` | `structure.explicit_transition` only when an explicit navigation marker exists; otherwise abstain | no evasion or cognition inference |
| `reassurance` | `communication.reassurance_request` or `communication.reassurance_repetition` | distinguish one request from observable repetition |
| `pressure_language` | `communication.pressure` | wording check only; not coercion, manipulation or person scoring |
| `repair_attempt` / `repair_opportunity` | `communication.repair` when the text contains an explicit repair marker | no outcome claim |
| `response_timing` | no single-message cue | metadata or multi-message timing requires a separately approved contract |

Unknown aliases fail validation. Deprecated aliases may be accepted only at an ingestion boundary with an explicit migration map; user-facing output always uses canonical IDs.

## Matching asset extraction

No dating corpus, swipe outcome, reply-delay data or relationship outcome is an approved asset. Future matching fixtures may cover deterministic comparisons of explicit dimensions only:

- connection goal;
- date-format and Berlin travel preferences;
- explicit communication channel/planning/response-window preferences;
- optional user-declared accommodations;
- explicit boundaries/deal-breakers;
- explicit interests.

Each dimension carries provenance `explicit` or `unknown`. Unknown never becomes a positive match, negative verdict or inferred default. Hard filters fail closed; soft dimensions remain separately explained. No total compatibility score is computed, and protected/sensitive context is not used to rank exposure.

## UI and trust acceptance criteria

- Synthetic demo is the only enabled path.
- One communication task is selected before review.
- The review screen explains what will be checked and what cannot be inferred.
- Identifier minimisation is described as a fallible aid; the user confirms the reviewed form before any future real-text submission gate could open.
- Results show no more than three cues, limitations adjacent to each cue and one editable repair action.
- Low signal provides a useful next step and never pressures retry.
- Completion feedback is stable, subtle and non-random.
- No streak, urgency, countdown, scarcity, read-receipt pressure, infinite scroll, pull-to-refresh reward, variable reward, unsolicited notification or engagement score.
- Full keyboard operation, visible focus, target size, contrast, screen-reader labels and reduced-motion behavior are acceptance criteria.
- “Clear session” is prominent and does not claim complete erasure from every storage layer.

## Dataset and benchmark rights inventory

Metadata review does not authorize download or execution. Licence labels can change and must be verified from a primary source for the exact release and purpose.

| Candidate class | Possible research question | Current rights/ethics posture | Current decision |
|---|---|---|---|
| Clarity-authored synthetic fixtures | contract and hard-negative behavior | owner attestation and content review required | allowed for bounded tests; training disabled |
| legacy synthetic 10k donor corpus | generation/balance methodology | donor `NOASSERTION`; no fixture reuse | method reference only |
| [GoEmotions](https://github.com/google-research/google-research/tree/master/goemotions) | taxonomy and annotation caveats | Reddit-derived content; exact terms, privacy and profiling review required | metadata only |
| [DailyDialog](https://aclanthology.org/I17-1099/) | dialogue-act evaluation design | corpus rights and product-purpose review incomplete | metadata only |
| [EmpatheticDialogues](https://aclanthology.org/P19-1534/) | repair/support phrasing research | non-commercial/source terms and response-generation harms require review | metadata only |
| Civil Comments / Wikipedia Detox | safety false-positive and identity-term review | protected-trait and task-fit harms; exact source terms required | metadata only |
| ProsocialDialog / safety dialogue sets | safe-response rubric design | normative labels and source rights require harm review | metadata only |
| ASDBank/TalkBank and neurodivergent transcript corpora | accessibility/research-method review | highly sensitive transcripts, consent/access and profiling risks | blocked for rows, metadata only |
| [Mozilla Common Voice](https://commonvoice.mozilla.org/en/datasets) | dialect/accent benchmark design | exact release terms, speaker consent, biometric/privacy and purpose review required | metadata only; no audio download |
| [TIMIT](https://catalog.ldc.upenn.edu/LDC93S1) | synthetic acoustic test-shape reference | LDC access/licence; speaker and redistribution constraints | metadata only; no audio download |
| IEMOCAP, MSP-Podcast, MELD, CMU-MOSI/MOSEI | acoustic/multimodal benchmark caveats | restricted/media/speaker rights and hidden-state label harms | blocked beyond metadata |
| public dating/profile datasets | matching evaluation | personal data, platform terms, representational and outcome-label harms | blocked |
| Reddit, YouTube, forums, support groups and blogs | future participatory research-question discovery | contract, copyright, privacy, special-category and contextual-integrity risks | collection and training prohibited |
| consented participant material | future usefulness/error evaluation | G4/G6, separate purpose consent, withdrawal/deletion and access controls absent | prohibited |
| private WhatsApp/chat exports | future reviewer-process research | all-speaker rights, purpose, Article 9 and deletion complexity unresolved | prohibited; schema/process only |

## Advancement gates

No training experiment can start until all of the following are recorded as passed for one exact source and purpose:

1. G4/G6 prerequisites as applicable, including qualified privacy/legal/ethics review;
2. exact licence, terms, copyright/database-rights and platform-contract snapshot;
3. controller, lawful-basis, Article 9, notice, DPIA, processor/transfer, retention and deletion analysis;
4. purpose-specific consent and withdrawal coverage for every relevant participant where required;
5. approved label taxonomy, reviewer protocol, frozen holdout and subgroup/error plan;
6. deterministic baseline and abstention/safe-output evaluator built before training;
7. local-only artifact controls, provenance, model card and rollback plan;
8. independent review showing no raw/private content or blocked inference in artifacts or reports;
9. owner decision enabling the exact gate—never a broad “training enabled” switch.

Current result: **NO GO for training, public/community collection, participant/private data, real audio and production use. GO only for Clarity-authored synthetic contract and regression fixtures.**
