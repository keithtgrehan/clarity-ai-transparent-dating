# Dataset and model radar

Status: research horizon only. No dataset download, model download, annotation, training, provider upload, or production inference is approved.

| Candidate | Possible later purpose | Preconditions | Current status |
|---|---|---|---|
| Clarity-authored synthetic fixtures | Contract, safety and unknown-state tests | Owner attestation, content review, no realistic identifiers or relationship-verdict labels | Local fixture design only |
| Consented participant feedback | Product/evidence evaluation | Separate purpose consent, minimisation, withdrawal/deletion, reviewed protocol, access controls | Prohibited now |
| Argilla | Human review workflow | Processor/hosting/DPA/terms/access decision and G6 | Reference only |
| Snorkel/Cleanlab | Label-quality assistance | Reviewed gold exists; never automatic truth | Reference only |
| TF-IDF/logistic regression | Interpretable offline baseline | Approved corpus, source rights, reviewed labels, subgroup/error plan | G7 only |
| SetFit/Sentence Transformers | Offline representation experiments | Individual model/dataset cards and terms, privacy evaluation, reproducibility | G7 only |
| Presidio | PII-minimisation evaluation | False-negative/positive analysis and human/privacy controls | Reference only |
| Hosted model providers | Bounded later assistance | DPA, transfer, retention/no-training terms, consent/lawful basis, minimisation, no-provider-upload gate | Blocked |

Model advancement requires a documented improvement over deterministic rules on participant-relevant quality without unacceptable subgroup, privacy, safety, or explainability cost. A model card cannot substitute for release-gate evidence.
