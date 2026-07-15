import { Link } from "react-router-dom";
import { WaitlistForm } from "../components/WaitlistForm";

export function LandingPage() {
  return (
    <section className="page stack">
      <div className="hero-card stack">
        <div className="hero-grid">
          <div className="stack">
            <div className="stack-small">
              <p className="eyebrow">Quiet precision</p>
              <h2>A local prototype for testing lower-ambiguity connection flows.</h2>
              <p className="lead">
                Clarity is exploring whether structured, user-declared preferences can make
                communication, pacing, and first-conversation choices easier to inspect. The
                preserved MVP does not establish participant outcomes.
              </p>
            </div>

            <div className="page-header-actions">
              <Link className="button" to="/onboarding">
                Start onboarding
              </Link>
              <Link className="button button-secondary" to="/matches">
                Review matches
              </Link>
              <span className="status-chip">Local synthetic MVP</span>
            </div>
          </div>

          <aside className="section-card section-card-muted stack-small">
            <p className="eyebrow">Why it feels different</p>
            <h3>A product hypothesis, not a proven outcome</h3>
            <p className="muted">
              The intended direction is lower pressure and more readable choices. This synthetic
              interface has not been tested with participants and makes no effectiveness claim.
            </p>
            <div className="pill-row">
              <span className="info-pill">Berlin-first</span>
              <span className="info-pill">Explainable matches</span>
              <span className="info-pill">Low-pressure chat</span>
            </div>
          </aside>
        </div>

        <div className="feature-grid">
          <article className="feature-card stack-small">
            <p className="eyebrow">1. Structured onboarding</p>
            <h3>Reduce guesswork early</h3>
            <p className="muted">
              Clarify the parts that usually stay fuzzy: communication, social energy, sensory
              needs, routine, and relationship intent.
            </p>
          </article>

          <article className="feature-card stack-small">
            <p className="eyebrow">2. Readable profiles</p>
            <h3>Separate facts from interpretation</h3>
            <p className="muted">
              The current form displays declared fields together so reviewers can inspect the
              information presented without treating it as a prediction of daily life.
            </p>
          </article>

          <article className="feature-card stack-small">
            <p className="eyebrow">3. Explainable matching</p>
            <h3>See why the system suggested someone</h3>
            <p className="muted">
              Rule-generated overlap notes, possible differences, and first-message prompts are
              shown without treating them as compatibility or chemistry predictions.
            </p>
          </article>
        </div>
      </div>

      <div className="helper-callout">
        <strong>Not a live service:</strong> this preserved v1 interface is for synthetic local
        evaluation only. It is not accepting participants, research volunteers, or real personal
        data.
      </div>

      <WaitlistForm />
    </section>
  );
}
