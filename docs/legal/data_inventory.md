# Data inventory

Current code is approved only for synthetic local fixtures.

| Data | Current location | Sensitivity/risk | Current issue | Target control before participants |
|---|---|---|---|---|
| User/account identifiers and city | JSON store | Personal data | Client-controlled identity, no auth | Authenticated subject IDs, access policy and audit |
| Profile age, neurotype, diagnosis, preferences and free text | JSON store | Potentially special-category/highly sensitive | Co-mingled; diagnosis required/exposed | Service/private-research separation, explicit use controls, encryption, minimisation |
| Waitlist name/email and preferences | JSON store | Contact/profile data | No purpose separation or deletion | Separate marketing/research consent, retention and deletion |
| Conversations/messages | JSON store | Private communications | Membership GET not authorized; indefinite retention | Participant authorization, encryption, content-free logs, deletion/incident controls |
| Reports/blocks and evidence snippets | JSON store | Allegation and safety data | Report doubles as block; broad access | Separate block/case/evidence, least privilege, human decision and appeal |
| Moderation flags | JSON store | Inference/allegation | No operational access model | Role-based queue, audit and distinct retention |
| Browser saved/dismissed IDs | Local storage | Behavioral preference | Device-local and undocumented lifecycle | User-visible controls and documented lifecycle |
| Future consent records | Not implemented | Governance evidence | Missing | Versioned purposes/status/source/timestamps; immutable withdrawal history |
| Future research feedback | Not implemented | Research and possibly special-category data | Missing | Separate store/access/consent/retention; training false by default |

Before participant processing, record every recipient, processor, hosting region, international transfer, backup, log, analytics event, access role, retention timer, export/delete behavior, and incident owner.
