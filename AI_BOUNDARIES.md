# AI Boundaries

## Role Of AI In Clarity.ai - transparent dating
AI is allowed to help with clarity, summarization, bounded signal extraction, and moderation support. AI is not allowed to act as a therapist, diagnostician, truth engine, or hidden ranking oracle.

## Allowed AI Uses
- summarize a profile into a short, user-editable overview
- extract communication-style tags from explicit text
- detect low-signal profiles for review
- identify when relationship intent appears unclear
- flag contradictions between profile text and structured answers
- assist moderation review by organizing evidence and category suggestions

## Allowed Only With Human Oversight
- moderation enforcement recommendations
- copy rewrites that may affect perceived tone or consent framing
- analytics summarization used to make product decisions

## Disallowed AI Uses
- inferring whether someone is genuinely neurodivergent
- inferring diagnosis authenticity
- inferring mental health severity
- inferring trauma, attachment style, or hidden motives
- generating clinical advice
- presenting compatibility as psychological truth
- using opaque engagement optimization to maximize compulsion

## Product Copy Rules
- never say AI “understands” the user
- never imply profile summaries are objective truth
- never present moderation AI as final authority
- always allow users to edit or disregard AI-generated summaries

## Model Output Rules
- outputs must be short, legible, and bounded to source inputs
- outputs should prefer “possible mismatch” over “this person is X”
- outputs should include uncertainty where appropriate
- outputs should degrade safely to TODO or “needs review” states

## Data Handling Rules
- do not send more user text than necessary for the task
- redact or minimize sensitive information in prompts where possible
- retain prompts and outputs only as long as necessary for product operations
- document every AI touchpoint in code and docs

## Evaluation Priorities
- false confidence risk
- moderation false positives
- profile-summary usefulness
- contradiction detection precision
- user perception of clarity vs. creepiness

## Launch Standard
If an AI feature cannot be explained in plain language, bounded to explicit inputs, and safely ignored by the user, it should not ship.
