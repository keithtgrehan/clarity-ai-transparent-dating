# DPIA screening and draft

Status: incomplete engineering draft. A qualified privacy/legal reviewer must determine controller roles, lawful bases, Article 9 condition, DPIA necessity/content, notices, processors, transfers, data-subject rights, and DSA obligations before research or beta.

Relevant sources include [GDPR Articles 9 and 35](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504), [EDPB consent guidance](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en), and the [Berlin DPA private-sector DPIA list](https://www.datenschutz-berlin.de/fileadmin/user_upload/pdf/dokumente/2018-BlnBDI_DSFA-nicht-oeffentlich.pdf).

## Screening rationale

The concept combines intimate relationship context, neurotype/diagnosis context, private communications, eligibility/ranking, safety allegations, and potentially vulnerable participants. Systematic matching and moderation may materially affect access and safety. Treat a DPIA as required programme work unless qualified review records otherwise.

## High-risk operations and required future mitigations

The following are proposed controls required by later gates, not implemented v1 safeguards.

- Sensitive self-description: voluntary, field-level visibility/use, no diagnosis matching/inference, separate private research context.
- Matching: explicit hard filters, unknown fail-closed, no scalar prediction, provenance and user control.
- Communications: authentication, participant authorization, encryption, content-free logs and deletion controls.
- Optional self-authored-draft analysis: separate purpose notice, local-model admission, identifier-minimisation evaluation, transient-session threat model, token/withdrawal races, indirect identifiers, no training reuse and a clear alternative that does not require the tool.
- Moderation: immediate block protection, least-privilege evidence, human sanctions, reasons, appeal and audit.
- Research/training: separate consent/purpose, minimisation, withdrawal/deletion, source rights, no default training eligibility.
- Underage risk: adult confirmation policy and escalation without default document collection.

## Required completion evidence

Data-flow diagram; necessity/proportionality; lawful-basis and Article 9 assessment per purpose; alternatives; participant consultation; processor/transfer inventory; access/retention/deletion/backup design; security threat model; underage and safety procedure; residual-risk acceptance; DPO/supervisory consultation decision; dated owner approvals.

The T1 readiness scaffold and fictional benchmark are engineering evidence only. They do not complete this DPIA, establish consent validity, approve an NER model or authorize real drafts.
