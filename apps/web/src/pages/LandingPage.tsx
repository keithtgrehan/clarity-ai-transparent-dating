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
        <div className="stack-small">
          <p className="eyebrow">Clarity-first dating</p>
          <h2>Less ambiguity. More signal. No swipe theater.</h2>
          <p className="lead">
            Clarity.ai is built for people who want direct onboarding, readable profiles,
            explainable matches, and calmer early-stage dating decisions.
          </p>
          <div className="action-row">
            <Link className="button" to="/onboarding">
              Start onboarding
            </Link>
            <Link className="button button-secondary" to="/matches">
              View matches
            </Link>
            <span className="status-chip">{status}</span>
          </div>
        </div>

        <div className="feature-grid">
          <article className="feature-card">
            <h3>Structured onboarding</h3>
            <p className="muted">
              Core compatibility questions are explicit and low-pressure, with progress and
              validation built in.
            </p>
          </article>

          <article className="feature-card">
            <h3>Readable profiles</h3>
            <p className="muted">
              Profiles stay concrete: communication, energy, sensory needs, routine, intent,
              and what helps.
            </p>
          </article>

          <article className="feature-card">
            <h3>Explainable matches</h3>
            <p className="muted">
              Each match shows why it could work, where friction might show up, and how much
              signal the system actually has.
            </p>
          </article>
        </div>
      </div>

      <WaitlistForm />
    </section>
  );
}
