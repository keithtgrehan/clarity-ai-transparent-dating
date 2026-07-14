# Clarity product brief

## Thesis

Clarity explores whether neuroinclusive adults in Berlin benefit from dating, friendship, and event experiences that make communication, intent, access needs, pacing, and boundaries more explicit without requiring diagnosis or rewarding compulsive use.

## Audience and boundary

- Berlin-only learning scope.
- Adults aged 18 or older; the current MVP does not yet implement a policy-versioned age gate.
- Neuroinclusive: users own their self-description and may decline to disclose it.
- No diagnosis proof, inference, authenticity assessment, or service gate.
- Invite-only is a future operating model, not current functionality.

## Intended outcomes

Participants should be able to express connection mode, communication preferences, sensory and access needs, logistics, boundaries, and uncertainty in plain language; understand why another profile was shown; control which fields affect matching; and access report, block, human review, and appeal paths.

## Current MVP reality

The repository currently implements a dating-oriented local demo with waitlist, onboarding, profiles, deterministic match candidates, messages, reports, blocks, and synthetic fixtures. It lacks authentication, participant-safe storage, first-class friendship/events, production moderation, and consent/lifecycle models. Current matching and diagnosis behavior are migration debt, not approved product policy.

## Product principles

- Finite discovery instead of infinite swipe.
- Declared preferences instead of hidden behavioral inference.
- Differences and unknowns shown without relationship verdicts.
- User control over visibility and matching use.
- Quiet, predictable notifications and no streaks or urgency manipulation.
- Human accountability for moderation.
- Accessibility and participatory vocabulary validation before beta.

## Success criteria by stage

The governed-foundation stage succeeds when repository claims match code, synthetic flows are reproducibly tested, high dependency advisories are resolved, source rights are validated, and privacy/safety/research/migration decisions are documented. Participant outcomes are not claimed until approved Berlin research produces evidence.

Authoritative scope and gates live in `docs/control_room`.
