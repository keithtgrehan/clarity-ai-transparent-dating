import { useEffect, useReducer, useRef } from "react";
import type { FormEvent } from "react";
import { analyzeSyntheticCommunicationFixture } from "../lib/api";
import {
  createInitialSignalReviewState,
  SIGNAL_FIXTURE_OPTIONS,
  SIGNAL_REVIEW_COPY,
  signalReviewReducer
} from "./signalReviewModel";

export function SignalReviewPage() {
  const [state, dispatch] = useReducer(signalReviewReducer, undefined, createInitialSignalReviewState);
  const statusHeadingRef = useRef<HTMLHeadingElement>(null);
  const fixtureSelectRef = useRef<HTMLSelectElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (state.phase === "result" || state.phase === "error") {
      statusHeadingRef.current?.focus();
    }
  }, [state.phase]);

  useEffect(() => () => activeRequestRef.current?.abort(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.redactionReviewConfirmed || state.phase === "loading") return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const revision = state.requestRevision + 1;
    dispatch({ type: "start" });
    try {
      const analysis = await analyzeSyntheticCommunicationFixture({
        fixtureId: state.fixtureId,
        task: state.task,
        profileId: state.profileId,
        redactionReviewConfirmed: true
      }, controller.signal);
      if (!controller.signal.aborted) {
        dispatch({ type: "succeed", value: analysis, revision });
      }
    } catch {
      if (!controller.signal.aborted) {
        dispatch({ type: "fail", revision });
      }
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
    }
  }

  function clearSession() {
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    dispatch({ type: "clear" });
    requestAnimationFrame(() => fixtureSelectRef.current?.focus());
  }

  const selectedFixture = SIGNAL_FIXTURE_OPTIONS.find((fixture) => fixture.id === state.fixtureId);

  return (
    <section className="page stack signal-review-page" aria-labelledby="signal-review-title">
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Optional synthetic review</p>
          <h2 id="signal-review-title">{SIGNAL_REVIEW_COPY.title}</h2>
          <p className="lead">
            {SIGNAL_REVIEW_COPY.syntheticOnly} It describes wording and structure; it does not infer
            diagnosis, emotion, attraction, motive, personality, compatibility, or relationship
            outcomes.
          </p>
        </div>
        <span className="status-chip">Feature-gated · local only</span>
      </header>

      <form className="panel stack" onSubmit={handleSubmit} noValidate>
        <div className="field-grid two-columns">
          <label className="field" htmlFor="signal-fixture">
            <span>Fictional fixture</span>
            <select
              className="input"
              id="signal-fixture"
              ref={fixtureSelectRef}
              disabled={state.phase === "loading"}
              aria-describedby="fixture-description"
              value={state.fixtureId}
              onChange={(event) =>
                dispatch({
                  type: "select_fixture",
                  value: event.target.value as typeof state.fixtureId
                })
              }
            >
              {SIGNAL_FIXTURE_OPTIONS.map((fixture) => (
                <option key={fixture.id} value={fixture.id}>
                  {fixture.label}
                </option>
              ))}
            </select>
            <span className="field-hint" id="fixture-description">
              {selectedFixture?.description}
            </span>
          </label>

          <label className="field" htmlFor="signal-task">
            <span>Review task</span>
            <select
              className="input"
              id="signal-task"
              disabled={state.phase === "loading"}
              value={state.task}
              onChange={(event) =>
                dispatch({ type: "select_task", value: event.target.value as typeof state.task })
              }
            >
              <option value="draft_review">Review a fictional draft</option>
              <option value="message_excerpt_review">Review a fictional excerpt</option>
            </select>
          </label>
        </div>

        <label className="field" htmlFor="signal-profile">
          <span>Support view</span>
          <select
            className="input"
            id="signal-profile"
            disabled={state.phase === "loading"}
            value={state.profileId}
            onChange={(event) =>
              dispatch({
                type: "select_profile",
                value: event.target.value as typeof state.profileId
              })
            }
          >
            <option value="wording_support">Wording support</option>
            <option value="structure_support">Structure support</option>
          </select>
          <span className="field-hint">
            These task-oriented views are not identity, diagnosis, or personality profiles.
          </span>
        </label>

        <section className="signal-preview stack-small" aria-labelledby="fictional-preview-heading">
          <p className="eyebrow" id="fictional-preview-heading">Fictional text preview</p>
          <blockquote>{selectedFixture?.preview}</blockquote>
          <p className="field-hint">
            This tracked text is product-authored. It is not a participant message or a copied public comment.
          </p>
          <p className="eyebrow">Potential-identifier simulation</p>
          <code>{selectedFixture?.redactedPreview}</code>
          <p className="field-hint">
            {selectedFixture?.potentialCategories.length
              ? `Potential coarse categories: ${selectedFixture.potentialCategories.join(", ")}.`
              : "No potential identifier category is marked in this deliberately short fixture."}
            {" "}This preview is fallible and is not an anonymity claim.
          </p>
        </section>

        <section className="signal-receipt stack-small" aria-labelledby="privacy-receipt-heading">
          <p className="eyebrow" id="privacy-receipt-heading">
            {SIGNAL_REVIEW_COPY.receiptHeading}
          </p>
          <ul className="signal-receipt-list">
            <li>Source: one tracked fictional fixture; no free-text, upload, audio, or paste field.</li>
            <li>Route: local Clarity adapter to an authenticated service configured for loopback.</li>
            <li>Storage: this flow writes no request, result, history, or edit to browser storage.</li>
            <li>Output: no raw or sanitised message text is returned.</li>
          </ul>
        </section>

        <label className="checkbox-pill signal-confirmation">
          <input
            type="checkbox"
            disabled={state.phase === "loading"}
            checked={state.redactionReviewConfirmed}
            onChange={(event) =>
              dispatch({ type: "confirm_review", value: event.target.checked })
            }
          />
          <span>{SIGNAL_REVIEW_COPY.confirmation}</span>
        </label>

        <div className="action-row">
          <button
            className="button"
            type="submit"
            disabled={!state.redactionReviewConfirmed || state.phase === "loading"}
          >
            {state.phase === "loading" ? "Reviewing fictional fixture…" : SIGNAL_REVIEW_COPY.continue}
          </button>
          <button className="button button-secondary" type="button" onClick={clearSession}>
            {SIGNAL_REVIEW_COPY.clear}
          </button>
        </div>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {state.phase === "loading" ? <p className="status-text">Running bounded checks…</p> : null}
        {state.phase === "error" ? (
          <section className="panel danger-panel stack-small" role="alert">
            <h3 ref={statusHeadingRef} tabIndex={-1}>
              Review unavailable
            </h3>
            <p>{state.error}</p>
          </section>
        ) : null}
      </div>

      {state.phase === "result" && state.analysis ? (
        <section className="stack" aria-labelledby="signal-result-heading">
          <div className="panel stack-small">
            <p className="eyebrow">Bounded result</p>
            <h3 id="signal-result-heading" ref={statusHeadingRef} tabIndex={-1}>
              {state.analysis.low_signal ? "Not enough signal" : "Up to three review cues"}
            </h3>
            <p className="muted">
              {state.analysis.low_signal
                ? "The engine abstained instead of stretching a short or unclear fixture into an interpretation."
                : "These are deterministic wording or structure observations, not conclusions about a person."}
            </p>
          </div>

          <div className="signal-cue-grid" aria-label="Communication review cues">
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
            <section className="panel stack" aria-labelledby="repair-action-heading">
              <div className="stack-small">
                <p className="eyebrow">One optional, editable action</p>
                <h3 id="repair-action-heading">{state.analysis.repair_action.title}</h3>
                <p className="muted">{state.analysis.repair_action.rationale}</p>
              </div>
              <label className="field" htmlFor="editable-repair">
                <span>Edit the fictional repair wording</span>
                <textarea
                  className="textarea"
                  id="editable-repair"
                  maxLength={600}
                  value={state.editableRepairText}
                  onChange={(event) =>
                    dispatch({ type: "edit_repair", value: event.target.value })
                  }
                />
                <span className="field-hint">{SIGNAL_REVIEW_COPY.editNote}</span>
              </label>
            </section>
          ) : null}

          <section className="panel stack-small" aria-labelledby="limitations-heading">
            <h3 id="limitations-heading">Limits to keep in view</h3>
            <ul className="signal-limit-list">
              {state.analysis.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
            <div className="signal-receipt stack-small" aria-labelledby="result-privacy-receipt-heading">
              <h3 id="result-privacy-receipt-heading">Privacy receipt</h3>
              <p className="supporting-note">
                Detector status: <code>{state.analysis.privacy_receipt.local_ner_status}</code>
              </p>
              <p className="supporting-note">
                Method: <code>{state.analysis.privacy_receipt.method}</code>
              </p>
              <p className="supporting-note">
                {state.analysis.privacy_receipt.redaction_total} potential pattern(s) replaced; raw
                text was neither returned nor persisted by this flow.
              </p>
              <ul className="signal-receipt-list" aria-label="Potential pattern counts by coarse category">
                {Object.entries(state.analysis.privacy_receipt.redaction_counts).map(
                  ([category, count]) => (
                    <li key={category}>{category.replaceAll("_", " ")}: {count}</li>
                  )
                )}
              </ul>
              <p className="field-hint">{state.analysis.privacy_receipt.limitation}</p>
            </div>
          </section>
        </section>
      ) : null}
    </section>
  );
}
