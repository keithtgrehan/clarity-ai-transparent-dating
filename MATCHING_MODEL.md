# Matching Model First Pass

## Objective
Produce a bounded, explainable compatibility model for early matching that privileges explicit alignment over behavioral manipulation.

## Model Principles
- prefer declared preferences over inferred personality claims
- rank candidates, do not pretend to predict romance
- generate short compatibility reasons tied to actual fields
- keep explanations legible and non-clinical
- allow users to fully exclude neurotypical matches when that control ships

## Matching Inputs

### Structured inputs
- relationship intent
- communication preferences
- sensory preferences
- social energy and planning style
- languages
- Berlin location radius
- neurotype visibility and compatibility settings
- age range and gender preferences once implemented

### Text inputs
- short bio
- what helps me communicate well
- ideal first date
- boundaries or pacing notes

Text is supporting signal only. Structured inputs should dominate early ranking.

## First-Pass Weighted Dimensions
- relationship intent alignment: 0.24
- communication style fit: 0.22
- sensory compatibility: 0.18
- pacing and planning fit: 0.14
- language and Berlin logistics fit: 0.10
- profile completeness / usable signal: 0.07
- shared interests and date format overlap: 0.05

Weights should stay hand-tuned until there is enough real-world evidence to justify changes.

## Hard Filters Before Ranking
- outside Berlin-first geography
- incompatible relationship intent
- opted-out neurotype visibility or incompatible neurotype preference
- blocked users
- reported / moderation hold users

## Compatibility Output Shape
Each candidate should return:
- total compatibility score
- dimension scores
- 2 to 4 compatibility reasons
- possible caution notes such as low-signal profile or intent ambiguity

## AI-Assisted Signal Extraction
Allowed support:
- short profile summaries
- communication-style tags from explicit text
- low-signal detection
- contradiction checks between structured answers and profile text

Not allowed:
- diagnosis verification
- mental health severity scoring
- “attachment style” inference unless explicitly self-stated and user-controlled later
- hidden emotional state inference

## First-Pass Compatibility Heuristics

### Strong positive signals
- both users want the same relationship horizon
- both prefer explicit texting norms
- both are compatible on sensory environment for dates
- both align on planning style and response expectations

### Mild caution signals
- one user wants spontaneous messaging while the other needs predictable check-ins
- sensory preferences differ but are manageable
- text suggests uncertainty while structured intent says “serious relationship”

### Strong caution signals
- conflicting relationship intent
- direct contradiction on communication needs
- repeated low-signal profile answers
- recent unresolved safety flags

## What This Model Is Not
- not a machine learning ranking system
- not a hidden desirability score
- not a behavioral retention engine
- not a diagnostic compatibility engine

## Evolution Path
Phase 1:
- hand-authored weights and explanation tags

Phase 2:
- review manual match outcomes and user feedback

Phase 3:
- consider limited calibration from explicit post-match feedback, not compulsive engagement data
