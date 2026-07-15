# Berlin AuDHD Dating App integration plan

Status: canonical roadmap index; T0 merged, T1 technical readiness in progress

Owner: Keith Grehan

Base for T1 readiness: `f0c1b293c6e89117d60d4ff163390bee4fdf03c7`

Branch: `codex/signal-t1-readiness`

Clarity is the product client. The neutral `communication_signal_engine` is private infrastructure. Vibe Signal remains a separate donor/product with no shared accounts, history, analytics or profile selector.

Delivery order is T0 synthetic fixture review, T1 self-authored-draft readiness, separately decided T2 received excerpts, separately decided A1 acoustic research, separately decided M1 training, and P1 production. Code, a feature flag, or passing synthetic tests never opens a later gate.

The T1 readiness implementation is defined in `T1_TECHNICAL_READINESS_PLAN.md`. Canonical release authority remains `RELEASE_GATES.md` and `SIGNAL_ENGINE_GATES.md`; canonical risks remain `RISK_REGISTER.md`; exact stage status is summarized in `BERLIN_AUDHD_GATE_MATRIX.md`.

Current decision:

- **GO:** local synthetic T0 and T1 protocol/security review.
- **NO GO:** real user-authored text, participant use, received excerpts, audio, model downloads, any model training, deployment, payment, public access or launch.
