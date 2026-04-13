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
              <h2>Less ambiguity. Better first dates. No swipe theater.</h2>
              <p className="lead">
                Clarity.ai helps people understand each other earlier: how they communicate, what
                pace feels good, where friction may show up, and whether starting a conversation
                feels worth the emotional effort.
              </p>
            </div>

            <div className="page-header-actions">
              <Link className="button" to="/onboarding">
                Start onboarding
              </Link>
              <Link className="button button-secondary" to="/matches">
                Review matches
              </Link>
              <span className="status-chip">Berlin early access</span>
            </div>
          </div>

          <aside className="section-card section-card-muted stack-small">
            <p className="eyebrow">Why it feels different</p>
            <h3>Built for people who are tired of guessing</h3>
            <p className="muted">
              Lower pressure, fewer mixed signals, and more readable decisions before time and
              energy get spent in the wrong place.
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
              Profiles stay concrete, so you can tell what daily life with someone might feel like
              before you start projecting onto them.
            </p>
          </article>

          <article className="feature-card stack-small">
            <p className="eyebrow">3. Explainable matching</p>
            <h3>See why the system suggested someone</h3>
            <p className="muted">
              Fit notes, likely friction, and first-message guidance are shown in plain language
              without pretending the product can predict chemistry.
            </p>
          </article>
        </div>
      </div>

      <WaitlistForm />
    </section>
  );
}
