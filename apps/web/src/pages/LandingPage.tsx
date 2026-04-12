import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchApiHealth } from "../lib/api";

export function LandingPage() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    fetchApiHealth()
      .then((result) => setStatus(`API ${result.status} (${result.stage})`))
      .catch(() => setStatus("API unavailable"));
  }, []);

  return (
    <section className="page stack">
      <div className="hero-card stack">
        <div className="hero-grid">
          <div className="stack">
            <div className="stack-small">
              <p className="eyebrow">Quiet precision</p>
              <h2>Less ambiguity. More signal. No swipe theater.</h2>
              <p className="lead">
                Clarity.ai is a structured dating environment for people who want direct
                onboarding, explainable matching, and calmer early-stage decisions.
              </p>
            </div>

            <div className="page-header-actions">
              <Link className="button" to="/onboarding">
                Start onboarding
              </Link>
              <Link className="button button-secondary" to="/matches">
                Review matches
              </Link>
              <span className="status-chip">{status}</span>
            </div>
          </div>

          <aside className="section-card section-card-muted stack-small">
            <p className="eyebrow">Operating stance</p>
            <h3>Built for clarity, not compulsion</h3>
            <p className="muted">
              The MVP emphasizes structured profile signal, slower decision-making, and
              readable rationale over engagement loops.
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
              Core compatibility questions are explicit, chunked, and saved step by step so
              you do not have to improvise your profile from scratch.
            </p>
          </article>

          <article className="feature-card stack-small">
            <p className="eyebrow">2. Readable profiles</p>
            <h3>Separate facts from interpretation</h3>
            <p className="muted">
              Profiles stay concrete: communication, energy, sensory needs, routine, intent,
              and the practical context that makes dating easier.
            </p>
          </article>

          <article className="feature-card stack-small">
            <p className="eyebrow">3. Explainable matching</p>
            <h3>See why the system suggested someone</h3>
            <p className="muted">
              Each match shows fit rationale, likely friction, and a first-message helper
              without pretending the system knows more than it does.
            </p>
          </article>
        </div>
      </div>

      <WaitlistForm />
    </section>
  );
}
