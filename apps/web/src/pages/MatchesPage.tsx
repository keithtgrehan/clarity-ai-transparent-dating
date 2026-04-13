import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MatchCandidate } from "@clarity/shared";
import { fetchMatchCandidates, fetchProfile } from "../lib/api";
import { candidateName, humanizeEnum, viewerUserId } from "../lib/profile";

const savedMatchesKey = "clarity.savedMatches";
const dismissedMatchesKey = "clarity.dismissedMatches";

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
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setSavedIds(JSON.parse(window.localStorage.getItem(savedMatchesKey) ?? "[]") as string[]);
    setDismissedIds(
      JSON.parse(window.localStorage.getItem(dismissedMatchesKey) ?? "[]") as string[]
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(savedMatchesKey, JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    window.localStorage.setItem(dismissedMatchesKey, JSON.stringify(dismissedIds));
  }, [dismissedIds]);

  useEffect(() => {
    async function load() {
      try {
        const [profileResult, matchResult] = await Promise.all([
          fetchProfile(viewerUserId),
          fetchMatchCandidates(viewerUserId)
        ]);

        setCanMatch(profileResult.profile.onboardingCompleted);
        setCandidates(matchResult.candidates);
        setStatus(
          matchResult.candidates.length > 0
            ? `${matchResult.candidates.length} people look worth a closer read.`
            : "No strong fits yet."
        );
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Could not load matches.");
      }
    }

    void load();
  }, []);

  const visibleCandidates = candidates.filter(
    (candidate) => !dismissedIds.includes(candidate.candidateUserId)
  );

  function toggleSaved(candidateUserId: string) {
    setSavedIds((current) =>
      current.includes(candidateUserId)
        ? current.filter((entry) => entry !== candidateUserId)
        : [...current, candidateUserId]
    );
  }

  function dismissCandidate(candidateUserId: string) {
    setDismissedIds((current) =>
      current.includes(candidateUserId) ? current : [...current, candidateUserId]
    );
  }

  return (
    <section className="page stack">
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Explainable matching</p>
          <h2>See who feels promising, where friction may show up, and what to ask next.</h2>
          <p className="lead">
            Each suggestion is broken into shared signal, likely friction, and a sensible next
            step in plain language.
          </p>
        </div>
        <div className="page-header-meta">
          <span className="info-pill">{visibleCandidates.length} visible candidates</span>
          <span className="info-pill">{savedIds.length} saved</span>
          <span className="status-text">{status}</span>
        </div>
      </header>

      {!canMatch ? (
        <article className="panel stack-small">
          <h3>Finish the core profile first</h3>
          <p className="muted">
            Match explanations only become useful once the basics are in place. Finish onboarding
            and the fit notes will start to read like something you can actually use.
          </p>
        </article>
      ) : null}

      {dismissedIds.length > 0 ? (
        <div className="helper-callout">
          <strong>Review state:</strong> dismissed matches are only hidden here for now.
          <div className="action-row">
            <button className="button button-ghost" onClick={() => setDismissedIds([])} type="button">
              Restore dismissed matches
            </button>
          </div>
        </div>
      ) : null}

      <div className="stack">
        {visibleCandidates.map((candidate) => {
          const saved = savedIds.includes(candidate.candidateUserId);
          const summaryReason = candidate.whyItCouldWork[0] ?? candidate.profile.summary;
          const frictionPreview =
            candidate.potentialFriction[0] ?? "No major friction is obvious from the current signal.";

          return (
            <article className="panel match-card" key={candidate.candidateUserId}>
              <div className="match-summary">
                <div className="stack-small">
                  <p className="eyebrow">Summary</p>
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
                      <p className="meta-line">
                        {candidate.profile.locationLabel || candidate.profile.city} •{" "}
                        {humanizeEnum(candidate.profile.identity)} •{" "}
                        {humanizeEnum(candidate.profile.relationshipIntent)} •{" "}
                        {humanizeEnum(candidate.profile.communicationStyle)}
                      </p>
                      <p className="match-caption">{summaryReason}</p>
                    </div>
                  </div>
                </div>

                <div className="pill-row">
                  {candidate.sharedSignals.map((signal) => (
                    <span className="info-pill" key={signal}>
                      {signal}
                    </span>
                  ))}
                  {saved ? <span className="status-chip">Saved</span> : null}
                </div>
              </div>

              <div className="match-rationale-grid">
                <div className="section-card section-card-muted stack-small">
                  <p className="eyebrow">Why it could work</p>
                  <ul className="simple-list">
                    {candidate.whyItCouldWork.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>

                <div className="section-card stack-small">
                  <p className="eyebrow">Potential friction</p>
                  <p className="muted">{frictionPreview}</p>
                  <ul className="simple-list">
                    {candidate.potentialFriction.length > 0 ? (
                      candidate.potentialFriction.map((item) => <li key={item}>{item}</li>)
                    ) : (
                      <li>No major friction is obvious from the current signal.</li>
                    )}
                  </ul>
                </div>
              </div>

              <div className="match-actions">
                <div className="stack-small">
                  <p className="eyebrow">Action</p>
                  <strong>Next step</strong>
                  <p className="muted">
                    {candidate.firstMessagePrompt
                      ? "Start with a concrete opener based on what already looks shared."
                      : "Review the structured profile and open a conversation when the fit feels worth testing."}
                  </p>
                </div>

                <div className="action-row">
                  <button
                    className="button"
                    onClick={() => navigate(`/chat?candidate=${candidate.candidateUserId}`)}
                    type="button"
                  >
                    Open chat
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => toggleSaved(candidate.candidateUserId)}
                    type="button"
                  >
                    {saved ? "Unsave" : "Save for later"}
                  </button>
                  <button
                    className="button button-ghost"
                    onClick={() => dismissCandidate(candidate.candidateUserId)}
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {candidate.firstMessagePrompt ? (
                <div className="helper-callout">
                  <strong>First message helper:</strong> {candidate.firstMessagePrompt}
                </div>
              ) : null}
            </article>
          );
        })}

        {canMatch && visibleCandidates.length === 0 ? (
          <article className="panel">
            <p className="muted">
              No candidates are visible right now. Try restoring dismissed matches, broadening
              identity preferences, or saving a more complete profile.
            </p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
