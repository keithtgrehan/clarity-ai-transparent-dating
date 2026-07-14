# AI and automated-assistance boundaries

Current “AI” modules are deterministic rules and text templates. Public and internal documentation must not imply that a model understands a person or that these checks establish psychological truth.

## Allowed direction

- User-editable summaries tied to explicit inputs.
- Bounded communication cues with evidence, uncertainty, versioned rules, and safe rendering.
- Low-signal and contradiction prompts that invite user review.
- Moderation evidence organization and category suggestions for human reviewers.
- Aggregate, content-free evaluation metadata under approved consent and retention rules.

## Prohibited

- Diagnosis, authenticity, severity, trauma, attachment, motive, deception, attraction, desirability, compatibility truth, or hidden mental-state inference.
- Popularity, activity, response-time, streak, or engagement optimization.
- Provider upload or training reuse without source rights, data minimization, separate purpose consent, withdrawal handling, and release approval.
- Autonomous moderation decisions or sanctions.
- Raw private content in logs, match responses, analytics, CI, or public artifacts.

## Output standard

Outputs must cite allowed evidence, separate observation from interpretation, use `supported`, `low`, or `insufficient` confidence, disclose missing information, remain editable/ignorable where user-facing, and avoid relationship verdicts. If an output cannot be explained, safely omitted, and independently evaluated, it does not ship.
