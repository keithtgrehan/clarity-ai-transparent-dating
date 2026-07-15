# Consent and purpose model

Consent is not a single checkbox. The target record contains subject ID, purpose, `granted | declined | withdrawn`, policy and notice versions, decision/effective timestamps, source surface, withdrawal route, and only the minimum evidence necessary.

| Purpose | Required for service? | Default | Scope |
|---|---|---|---|
| `service` | Yes, where consent is the approved basis | No implicit grant | Profile, eligibility, matching, messaging and safety necessary for the service |
| `research` | No | Declined/not granted | Approved participant research only |
| `diagnosis_context` | No; requires active research purpose | Declined/not granted | Optional private diagnosis self-description; never service/matching/public |
| `nlp_feedback` | No | Declined/not granted | Minimized feedback for a named evaluation purpose; training false by default |
| `marketing_waitlist` | No | Declined/not granted | Launch updates only |
| `event_participation` | Only for a selected event | Declined/not granted | Event logistics and approved participant visibility |

Optional research, diagnosis, NLP feedback, event, or marketing purposes cannot be bundled into service access. Withdrawal stops future optional processing and triggers the applicable deletion/restriction workflow. Historic proof of a decision may be retained only if an approved legal basis and retention rule require it.
