import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MatchCandidate } from "@clarity/shared";
import { fetchMatchCandidates, fetchProfile } from "../lib/api";
import { candidateName, humanizeEnum, viewerUserId } from "../lib/profile";

function confidenceClass(confidence: MatchCandidate["confidence"]) {
  if (confidence === "high") {
    return "confidence-pill confidence-high";
  }

  if (confidence === "medium") {
    return "confidence-pill confidence-medium";
  }

  return "confidence-pill confidence-low";
}

export function MatchesPage() {
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [status, setStatus] = useState("Loading match candidates...");
  const [canMatch, setCanMatch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [profileResult, matchResult] = await Promise.all([
          fetchProfile(viewerUserId),
          fetchMatchCandidates(viewerUserId)
        ]);

        setCanMatch(profileResult.profile.onboardingCompleted);
        setCandidates(matchResult.candidates);
        setStatus(`${matchResult.candidates.length} seeded candidates available.`);
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not load matches.");
      }
    }

    void load();
  }, []);

  return (
    <section className="page stack">
      <div className="panel split-header">
        <div className="stack-small">
          <p className="eyebrow">Explainable matching</p>
          <h2>Why it could work, where friction may show up, and how much signal exists.</h2>
          <p className="muted">
            No swipe deck, no percentages, and no fake certainty. Just structured candidates
            with readable reasoning.
          </p>
        </div>
        <span className="status-text">{status}</span>
      </div>

      {!canMatch ? (
        <article className="panel stack-small">
          <h3>Complete onboarding to unlock match explanations</h3>
          <p className="muted">
            Matching only runs once the core structured fields are filled in. That keeps the
            explanations honest instead of pretending sparse data is enough.
          </p>
        </article>
      ) : null}

      <div className="stack">
        {candidates.map((candidate) => (
          <article className="panel match-card" key={candidate.candidateUserId}>
            <div className="match-header">
              <div className="stack-small">
                <div className="title-row">
                  <h3>
                    {candidateName(candidate)}
                    {candidate.profile.age ? `, ${candidate.profile.age}` : ""}
                  </h3>
                  <span className={confidenceClass(candidate.confidence)}>
                    {humanizeEnum(candidate.confidence)} confidence
                  </span>
                </div>
                <p className="muted">
                  {candidate.profile.locationLabel || candidate.profile.city} •{" "}
                  {humanizeEnum(candidate.profile.relationshipIntent)} •{" "}
                  {humanizeEnum(candidate.profile.communicationStyle)}
                </p>
                <p>{candidate.profile.summary}</p>
              </div>

              <div className="stack-small align-end">
                <div className="pill-row">
                  {candidate.sharedSignals.map((signal) => (
                    <span className="info-pill" key={signal}>
                      {signal}
                    </span>
                  ))}
                </div>
                <button
                  className="button"
                  onClick={() => navigate(`/chat?candidate=${candidate.candidateUserId}`)}
                  type="button"
                >
                  Open conversation
                </button>
              </div>
            </div>

            <div className="field-grid two-columns">
              <div className="match-section">
                <h4>Why it could work</h4>
                <ul className="simple-list">
                  {candidate.whyItCouldWork.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div className="match-section">
                <h4>Potential friction</h4>
                <ul className="simple-list">
                  {candidate.potentialFriction.length > 0 ? (
                    candidate.potentialFriction.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No major friction is obvious from the current signal.</li>
                  )}
                </ul>
              </div>
            </div>

            {candidate.firstMessagePrompt ? (
              <div className="helper-callout">
                <strong>First message helper:</strong> {candidate.firstMessagePrompt}
              </div>
            ) : null}
          </article>
        ))}

        {canMatch && candidates.length === 0 ? (
          <article className="panel">
            <p className="muted">
              No candidates passed the current hard filters. Try broadening identity
              preferences or saving a more complete profile.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
