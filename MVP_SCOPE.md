# Clarity.ai - transparent dating MVP Scope

## Scope Principle
The MVP is a disciplined learning product, not a full dating platform. It should support real end-to-end flows locally while keeping risk, complexity, and false confidence low.

## Must-Have In Scope

### 1. Berlin-first waitlist capture
- capture city, neighborhood, language comfort, relationship intent, and launch interest
- capture neurotype self-identification without proof requirements
- record referral source and availability for interviews or pilot groups

### 2. Guided onboarding skeleton
- communication preferences
- sensory preferences
- relationship intent
- pacing and energy expectations
- optional secondary context for anxiety/depression without making it central

### 3. Profile creation and update
- structured answers plus short text sections
- explicit “what helps me communicate well” prompts
- clear filters for neurotype compatibility preferences

### 4. Match candidate retrieval
- no swipe deck
- ranked candidate list with compatibility reasons
- bounded explanations tied to declared preferences, not psychoanalysis

### 5. Messaging scaffold
- conversation list
- create conversation
- send message
- message metadata ready for moderation and rate controls later

### 6. Safety foundation
- report and block structures
- moderation categories
- content policy draft
- legal-review TODO markers for privacy, deletion, consent, and appeals

### 7. AI assistance foundation
- profile summarization
- low-signal detection
- intent clarity detection
- contradiction detection
- moderation review prompt/template

## Explicitly Out Of Scope
- native mobile apps
- payments or subscriptions
- algorithmic ranking tuned on live behavioral data
- push notifications
- read receipts, streaks, infinite swipe, or reward loops
- deployment infrastructure
- identity verification or diagnosis verification
- therapy, treatment, crisis handling, or clinical claims
- automated moderation decisions without human review path

## First Release User Journey
1. User lands on the Berlin-first page and understands the product in under 60 seconds.
2. User joins the waitlist or enters the product stub locally.
3. User completes structured onboarding with explicit communication and sensory preferences.
4. User reviews their profile summary and edits it.
5. User sees a ranked list of compatible candidates with short reason tags.
6. User opens or starts a conversation.
7. User can report or block if something feels unsafe or manipulative.

## Functional Acceptance For This Repo Run
- web routes exist for landing, onboarding, profile, matches, chat, settings, and report/block
- API routes exist for waitlist, profiles, onboarding, matches, conversations, messages, reports, and seed load
- shared schemas cover the key domain models
- seed fixtures make the product reviewable without manual database setup
- docs explain what is real, what is stubbed, and what still needs legal or product work

## Quality Threshold
The MVP foundation should be:
- understandable by one founder returning tomorrow
- honest about missing pieces
- deterministic enough to demo locally
- structured enough to support future auth, persistence, and moderation depth

## Non-Functional Constraints
- local-first development only
- low dependency surface area
- TypeScript across web, API, and shared contracts
- file-backed persistence scaffold for early iteration

## Kill Criteria
Revisit the product thesis if early Berlin interviews show:
- structured clarity feels patronizing rather than relieving
- neurodivergent users want a friendship/community product instead of dating
- users refuse longer onboarding despite clear benefit
- safety expectations require more manual operations than a solo founder can sustain
