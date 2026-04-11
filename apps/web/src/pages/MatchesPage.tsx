import { useEffect, useState } from "react";
import type { MatchCandidate } from "@project-a-z/shared";
import { fetchMatchCandidates } from "../lib/api";
import { defaultDemoUserId, demoUsers } from "../lib/demo";

export function MatchesPage() {
  const [userId, setUserId] = useState<string>(defaultDemoUserId);
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [status, setStatus] = useState("Loading candidate list...");

  useEffect(() => {
    fetchMatchCandidates(userId)
      .then((result) => {
        setCandidates(result.candidates);
        setStatus(`${result.candidates.length} candidate profiles ranked.`);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load candidates."));
  }, [userId]);

  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Candidate list</p>
        <h2>No swipe deck. Just ranked candidates with reasons and caution signals.</h2>
        <p className="muted">{status}</p>
      </div>

      <label className="field">
        <span>View matches for</span>
        <select
          className="input"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        >
          {demoUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.label}
            </option>
          ))}
        </select>
      </label>

      <div className="stack">
        {candidates.map((candidate) => (
          <article className="panel" key={candidate.candidateUserId}>
            <div className="card-header">
              <div>
                <h3>{candidate.profileSummary.headline}</h3>
                <p className="muted">{candidate.profileSummary.summary}</p>
              </div>
              <div className="score-pill">{candidate.compatibilityScore}</div>
            </div>

            <div className="pill-row">
              {candidate.profileSummary.communicationTags.map((tag) => (
                <span className="info-pill" key={tag}>
                  {tag}
                </span>
              ))}
            </div>

            <div className="field-grid two-columns">
              <div>
                <h4>Reasons</h4>
                <ul className="simple-list">
                  {candidate.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h4>Caution signals</h4>
                <ul className="simple-list">
                  {candidate.cautionSignals.length > 0 ? (
                    candidate.cautionSignals.map((signal) => <li key={signal}>{signal}</li>)
                  ) : (
                    <li>No strong caution flags in the current scaffold.</li>
                  )}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
