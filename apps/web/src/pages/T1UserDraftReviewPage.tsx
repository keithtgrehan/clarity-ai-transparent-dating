import { useEffect, useReducer, useRef } from "react";
import type { FormEvent } from "react";
import {
  clearT1UserDraftReview,
  continueT1UserDraftReview,
  prepareT1UserDraftReview
} from "../lib/t1UserDraftApi";
import {
  createInitialT1UserDraftReviewState,
  T1_USER_DRAFT_COPY,
  t1UserDraftReviewReducer
} from "./t1UserDraftReviewModel";

export function T1UserDraftReviewPage() {
  const [state, dispatch] = useReducer(
    t1UserDraftReviewReducer,
    undefined,
    createInitialT1UserDraftReviewState
  );
  const activeRequestRef = useRef<AbortController | null>(null);
  const activeTokenRef = useRef<string | null>(null);
  const operationRevisionRef = useRef(0);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state.phase === "review") previewHeadingRef.current?.focus();
    if (state.phase === "result" || state.phase === "error") {
      statusHeadingRef.current?.focus();
    }
    if (state.phase === "cleared" || state.phase === "expired") draftRef.current?.focus();
  }, [state.phase]);

  useEffect(() => {
    const preparation = state.preparation;
    if (!preparation) return;

    const expiresIn = Math.max(0, Date.parse(preparation.expiresAt) - Date.now());
    const timer = window.setTimeout(
      () => {
        if (activeTokenRef.current !== preparation.reviewToken) return;
        activeRequestRef.current?.abort();
        activeRequestRef.current = null;
        activeTokenRef.current = null;
        operationRevisionRef.current += 1;
        dispatch({ type: "expire", revision: operationRevisionRef.current });
        void clearT1UserDraftReview({ reviewToken: preparation.reviewToken }).catch(
          () => undefined
        );
      },
      Math.min(expiresIn, 2_147_483_647)
    );

    return () => window.clearTimeout(timer);
  }, [state.preparation]);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
      operationRevisionRef.current += 1;
      const token = activeTokenRef.current;
      activeTokenRef.current = null;
      if (token) {
        void clearT1UserDraftReview({ reviewToken: token }, { keepalive: true }).catch(
          () => undefined
        );
      }
    },
    []
  );

  function nextRevision() {
    operationRevisionRef.current += 1;
    return operationRevisionRef.current;
  }

  function releaseCurrentReview() {
    const token = activeTokenRef.current;
    activeTokenRef.current = null;
    if (token) void clearT1UserDraftReview({ reviewToken: token }).catch(() => undefined);
  }

  function invalidateForEdit(
    action:
      | { type: "edit_draft"; value: string; revision: number }
      | { type: "select_profile"; value: typeof state.profileId; revision: number }
      | { type: "select_language"; value: typeof state.languageTag; revision: number }
      | { type: "confirm_self_authored"; value: boolean; revision: number }
  ) {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    releaseCurrentReview();
    dispatch(action);
  }

  async function handlePrepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.selfAuthoredConfirmed || state.draft.trim().length === 0) return;

    activeRequestRef.current?.abort();
    releaseCurrentReview();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const revision = nextRevision();
    dispatch({ type: "prepare_start", revision });

    try {
      const preparation = await prepareT1UserDraftReview(
        {
          task: "draft_review",
          sourceClass: "self_authored_draft",
          profileId: state.profileId,
          languageTag: state.languageTag,
          draft: state.draft
        },
        controller.signal
      );
      if (controller.signal.aborted || operationRevisionRef.current !== revision) {
        void clearT1UserDraftReview({ reviewToken: preparation.reviewToken }).catch(() => undefined);
        return;
      }
      activeTokenRef.current = preparation.reviewToken;
      dispatch({ type: "prepare_succeed", value: preparation, revision });
    } catch {
      if (!controller.signal.aborted && operationRevisionRef.current === revision) {
        dispatch({ type: "prepare_fail", revision });
      }
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
    }
  }

  async function handleContinue() {
    const preparation = state.preparation;
    if (!preparation || !state.redactedReviewConfirmed) return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const revision = nextRevision();
    dispatch({ type: "continue_start", revision });

    try {
      const analysis = await continueT1UserDraftReview(
        { reviewToken: preparation.reviewToken, confirmed: true },
        controller.signal
      );
      activeTokenRef.current = null;
      if (!controller.signal.aborted && operationRevisionRef.current === revision) {
        dispatch({ type: "continue_succeed", value: analysis, revision });
      }
    } catch {
      if (!controller.signal.aborted && operationRevisionRef.current === revision) {
        // The server may or may not have consumed an ambiguous failed request.
        // Clear is idempotent, so retain and exercise the cleanup capability.
        releaseCurrentReview();
        dispatch({ type: "continue_fail", revision });
      }
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
    }
  }

  function handleClear() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    const revision = nextRevision();
    releaseCurrentReview();
    dispatch({ type: "clear", revision });
  }

  const busy = state.phase === "preparing" || state.phase === "continuing";

  return (
    <section
      className="page stack signal-review-page"
      aria-busy={busy}
      aria-labelledby="t1-draft-title"
    >
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Disabled T1 readiness scaffold</p>
          <h2 id="t1-draft-title">{T1_USER_DRAFT_COPY.title}</h2>
          <p className="lead">
            This development-only flow rehearses a two-step privacy review. It describes wording
            and structure and does not infer diagnosis, neurotype, emotion, intent, attraction,
            confidence, compatibility, or likely response.
          </p>
        </div>
        <span className="status-chip">Development flags required</span>
      </header>

      <section className="signal-notice stack-small" aria-labelledby="t1-notice-heading">
        <h3 id="t1-notice-heading">Fictional text only</h3>
        <p>{T1_USER_DRAFT_COPY.notice}</p>
      </section>

      <form className="panel stack" autoComplete="off" onSubmit={handlePrepare} noValidate>
        <div className="field-grid two-columns">
          <label className="field" htmlFor="t1-draft-profile">
            <span>Support view</span>
            <select
              className="input"
              id="t1-draft-profile"
              disabled={busy}
              value={state.profileId}
              onChange={(event) => {
                const revision = nextRevision();
                invalidateForEdit({
                  type: "select_profile",
                  value: event.target.value as typeof state.profileId,
                  revision
                });
              }}
            >
              <option value="wording_support">Wording support</option>
              <option value="structure_support">Structure support</option>
            </select>
          </label>

          <label className="field" htmlFor="t1-draft-language">
            <span>Declared language pattern</span>
            <select
              className="input"
              id="t1-draft-language"
              disabled={busy}
              value={state.languageTag}
              onChange={(event) => {
                const revision = nextRevision();
                invalidateForEdit({
                  type: "select_language",
                  value: event.target.value as typeof state.languageTag,
                  revision
                });
              }}
            >
              <option value="en-US">American English</option>
              <option value="en-GB">British English</option>
              <option value="en-EU">Euro-English</option>
              <option value="mixed">Mixed or code-switched</option>
            </select>
          </label>
        </div>

        <label className="field" htmlFor="t1-fictional-draft">
          <span>Fictional self-authored draft</span>
          <textarea
            className="textarea t1-draft-input"
            id="t1-fictional-draft"
            ref={draftRef}
            disabled={busy}
            maxLength={4_000}
            rows={7}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={state.draft}
            aria-describedby="t1-draft-hint t1-draft-count"
            onChange={(event) => {
              const revision = nextRevision();
              invalidateForEdit({ type: "edit_draft", value: event.target.value, revision });
            }}
          />
          <span className="field-hint" id="t1-draft-hint">
            Editing after preparation invalidates the short-lived review and requires preparation
            again. Nothing is autosaved, stored in the URL, or written to browser storage.
          </span>
          <span className="field-hint" id="t1-draft-count">
            {state.draft.length} of 4,000 characters
          </span>
        </label>

        <label className="checkbox-pill signal-confirmation">
          <input
            type="checkbox"
            checked={state.selfAuthoredConfirmed}
            disabled={busy}
            onChange={(event) => {
              const revision = nextRevision();
              invalidateForEdit({
                type: "confirm_self_authored",
                value: event.target.checked,
                revision
              });
            }}
          />
          <span>
            I wrote this fictional test draft. It is not a received message, real conversation,
            public comment, support-group post, or participant material.
          </span>
        </label>

        <div className="action-row">
          <button
            className="button"
            type="submit"
            disabled={busy || !state.selfAuthoredConfirmed || state.draft.trim().length === 0}
          >
            {state.phase === "preparing" ? "Preparing minimised preview…" : "Prepare privacy review"}
          </button>
          <button className="button button-secondary" type="button" onClick={handleClear}>
            Clear this review
          </button>
        </div>
      </form>

      <div className="signal-live-region" aria-live="polite" aria-atomic="true">
        {state.phase === "preparing" ? (
          <p className="status-text">Replacing potential identifiers before analysis…</p>
        ) : null}
        {state.phase === "continuing" ? (
          <p className="status-text">Running bounded wording and structure checks…</p>
        ) : null}
        {state.phase === "cleared" ? (
          <section className="panel stack-small">
            <h3 ref={statusHeadingRef} tabIndex={-1}>
              Review cleared
            </h3>
            <p>{T1_USER_DRAFT_COPY.clearLimitation}</p>
          </section>
        ) : null}
        {state.phase === "expired" ? (
          <section className="panel stack-small">
            <h3 ref={statusHeadingRef} tabIndex={-1}>
              Review expired and cleared
            </h3>
            <p>{T1_USER_DRAFT_COPY.expiryLimitation}</p>
          </section>
        ) : null}
        {state.phase === "error" ? (
          <section className="panel danger-panel stack-small" role="alert">
            <h3 ref={statusHeadingRef} tabIndex={-1}>
              Review unavailable
            </h3>
            <p>{state.error}</p>
          </section>
        ) : null}
      </div>

      {state.phase === "review" && state.preparation ? (
        <section className="panel stack" aria-labelledby="t1-redacted-preview-heading">
          <div className="stack-small">
            <p className="eyebrow">Step 2 · Review before analysis</p>
            <h3 id="t1-redacted-preview-heading" ref={previewHeadingRef} tabIndex={-1}>
              Check the minimised preview
            </h3>
            <p className="muted">{T1_USER_DRAFT_COPY.privacyLimitation}</p>
          </div>

          <pre className="signal-redacted-preview" aria-label="Minimised fictional draft preview">
            {state.preparation.redactedPreview}
          </pre>

          <section className="signal-receipt stack-small" aria-labelledby="t1-privacy-receipt-heading">
            <h3 id="t1-privacy-receipt-heading">Preparation receipt</h3>
            <ul className="signal-receipt-list">
              {Object.entries(state.preparation.potentialIdentifierCounts).map(
                ([category, count]) => (
                  <li key={category}>
                    {category.replaceAll("_", " ")}: {count}
                  </li>
                )
              )}
            </ul>
            <p className="supporting-note">
              Detector version: <code>{state.preparation.detectorVersion}</code>. The opaque review
              reference expires at{" "}
              <time dateTime={state.preparation.expiresAt}>{state.preparation.expiresAt}</time>.
            </p>
            <p className="field-hint">{state.preparation.limitation}</p>
          </section>

          <label className="checkbox-pill signal-confirmation">
            <input
              type="checkbox"
              checked={state.redactedReviewConfirmed}
              disabled={busy}
              onChange={(event) =>
                dispatch({ type: "confirm_redacted_review", value: event.target.checked })
              }
            />
            <span>
              I reviewed this minimised preview and explicitly choose to continue with these
              bounded checks.
            </span>
          </label>

          <div className="action-row">
            <button
              className="button"
              type="button"
              disabled={!state.redactedReviewConfirmed || busy}
              onClick={handleContinue}
            >
              Continue with minimised text
            </button>
            <button className="button button-secondary" type="button" onClick={handleClear}>
              Clear instead
            </button>
          </div>
        </section>
      ) : null}

      {state.phase === "result" && state.analysis ? (
        <section className="stack" aria-labelledby="t1-result-heading">
          <div className="panel stack-small">
            <p className="eyebrow">Bounded result</p>
            <h3 id="t1-result-heading" ref={statusHeadingRef} tabIndex={-1}>
              {state.analysis.low_signal ? "Not enough signal" : "Up to three review cues"}
            </h3>
            <p className="muted">
              {state.analysis.low_signal
                ? "The engine abstained instead of stretching a short or unclear draft into an interpretation."
                : "These are wording or structure observations, not conclusions about either person."}
            </p>
          </div>

          <div className="signal-cue-grid" aria-label="Draft review cues">
            {state.analysis.cues.slice(0, 3).map((cue) => (
              <article className="feature-card stack-small" key={cue.canonical_id}>
                <p className="eyebrow">{cue.canonical_id}</p>
                <h3>{cue.observation}</h3>
                <p className="muted">{cue.limitation}</p>
                <span className="status-chip">{cue.evidence_sufficiency} rule evidence</span>
              </article>
            ))}
          </div>

          {state.analysis.repair_action ? (
            <section className="panel stack" aria-labelledby="t1-repair-action-heading">
              <div className="stack-small">
                <p className="eyebrow">One optional, editable action</p>
                <h3 id="t1-repair-action-heading">{state.analysis.repair_action.title}</h3>
                <p className="muted">{state.analysis.repair_action.rationale}</p>
              </div>
              <label className="field" htmlFor="t1-editable-repair">
                <span>Edit the suggested wording locally</span>
                <textarea
                  className="textarea"
                  id="t1-editable-repair"
                  maxLength={600}
                  value={state.editableRepairText}
                  onChange={(event) => dispatch({ type: "edit_repair", value: event.target.value })}
                />
                <span className="field-hint">
                  This edit is not submitted, saved, scored, or tracked.
                </span>
              </label>
            </section>
          ) : null}

          <section className="panel stack-small" aria-labelledby="t1-limitations-heading">
            <h3 id="t1-limitations-heading">Limits to keep in view</h3>
            <ul className="signal-limit-list">
              {state.analysis.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <p className="field-hint">{state.analysis.privacy_receipt.limitation}</p>
          </section>

          <button className="button button-secondary" type="button" onClick={handleClear}>
            Clear result
          </button>
        </section>
      ) : null}
    </section>
  );
}
