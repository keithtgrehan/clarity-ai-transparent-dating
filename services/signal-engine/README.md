# Clarity communication signal engine

This is a private research adapter for bounded wording and message-structure checks. Its supported launcher validates and binds an explicit loopback address; the internal secret remains mandatory because invoking an ASGI application through a different launcher can bypass bind metadata. The supported T0 milestone accepts only exact, tracked synthetic fixtures. A separate T1 prepare/continue/clear protocol exists for synthetic security tests, but its real-text gate has no environment path to open and the required privacy model is not approved. The service does not accept participant text, received messages, or audio, and it is not a production service.

The service minimises likely identifiers before any rule or optional embedding component can see text. This is risk reduction, not an anonymity, complete-removal, or legal-compliance guarantee. Statistical NER can miss entities; deterministic patterns can over- or under-redact; sensitive inferences can remain possible after redaction. Outputs therefore contain counts and fixed observations only—never source text, redacted text, snippets, names, contact data, diagnoses, emotions, attraction, compatibility, or person-confidence scores.

`os.remove` in the isolated acoustic research package unlinks a validated, service-owned intake file. Unlinking is not secure erasure and does not overwrite storage, snapshots, backups, caches, or copies. No HTTP route imports or calls the audio package. File decoding currently refuses closed: descriptor-bound, resource-limited subprocess decoding and timeout evidence are still required before the extractor may release measurements.

## Legal and research boundary

GDPR Article 9 requires a purpose, lawful basis, minimisation, security, retention, data-subject procedures, and—where applicable—explicit consent and a DPIA. Code cannot establish compliance. UrhG §60d does not create a general product-training or scraping licence; any TDM project requires a separately reviewed research purpose, lawful access, rights-reservation/terms analysis, security, provenance, and deletion controls. This repository contains synthetic tests only and no Common Voice, TIMIT, social-media, forum, participant, or private-message material.

## Local verification

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r services/signal-engine/requirements-dev.lock
PIP_NO_INDEX=1 .venv/bin/python -m pip install --no-build-isolation --no-deps -e services/signal-engine
.venv/bin/python -m pip check
.venv/bin/python -m pytest -o addopts='' -q services/signal-engine/tests
```

`requirements-dev.lock` is generated from the `dev` and `audio_research` extras with `pip-compile --generate-hashes`. The `dev` extra includes the Hatchling build backend so the editable install can run with build isolation and index access disabled. Regenerate and independently audit the lock whenever `pyproject.toml` changes; the July 2026 review used `pip-audit 2.10.1`. The optional NER and semantic-model extras are intentionally excluded because no local model execution is approved.

To run the adapter locally, set a non-default secret and use the supported launcher, which binds `SIGNAL_ENGINE_BIND_HOST` only after loopback validation:

```bash
SIGNAL_ENGINE_INTERNAL_SECRET='local-review-secret-change-me-32chars' \
  python -m app
```

Runtime model downloads and model execution are prohibited in inventory schema v1.1. `HF_HUB_OFFLINE=1`, `TRANSFORMERS_OFFLINE=1`, and telemetry-disable settings are applied before any optional Transformers import. The reviewed NER candidate is not locally approved or installed. The T0 route can still process only an exact allowlisted fictional fixture and truthfully reports deterministic pattern checks; the T1 route is absent by default and refuses without the required NER when exercised through test injection. Explicit test doubles are labelled as test doubles and require a test environment. The reviewed embedding model is absent and semantic analysis abstains. Inventory memory and timeout values are future admission ceilings, not claims of an active model sandbox.
