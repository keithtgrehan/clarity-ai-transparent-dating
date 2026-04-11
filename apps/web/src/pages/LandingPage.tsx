import { useEffect, useState } from "react";
import { WaitlistForm } from "../components/WaitlistForm";
import { fetchApiHealth } from "../lib/api";

export function LandingPage() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    fetchApiHealth()
      .then((result) => setStatus(`API ${result.status} (${result.stage})`))
      .catch(() => setStatus("API unavailable while scaffolding"));
  }, []);

  return (
    <section className="page">
      <div className="hero-card stack">
        <div>
          <p className="eyebrow">Berlin-first product foundation</p>
          <h2>Dating with less ambiguity, lower sensory friction, and clearer intent.</h2>
          <p className="lead">
            Project A-Z is being built for ADHD, Autism, and AuDHD users who want
            explicit communication, calmer pacing, and compatibility signals that are
            legible before emotional energy gets spent.
          </p>
          <p className="status-chip">{status}</p>
        </div>

        <div className="panel-grid">
          <article className="panel">
            <h3>What this first pass is</h3>
            <p className="muted">
              A serious local repo foundation with real docs, shared contracts, seed data,
              and bounded product flows for waitlist, onboarding, matches, messaging, and safety.
            </p>
          </article>

          <article className="panel">
            <h3>What it refuses</h3>
            <p className="muted">
              No infinite swipe, no diagnosis proof wall, no manipulative streaks, and no AI
              pretending to know clinical truth.
            </p>
          </article>

          <article className="panel">
            <h3>Why Berlin first</h3>
            <p className="muted">
              Density, trust, local research loops, and practical founder operations matter
              more than broad top-of-funnel scale right now.
            </p>
          </article>
        </div>
      </div>

      <WaitlistForm />
    </section>
  );
}
