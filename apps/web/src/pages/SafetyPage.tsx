import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { MatchCandidate } from "@clarity/shared";
import { createReport, fetchMatchCandidates } from "../lib/api";
import { candidateName, reportCategories, toggleArrayValue, viewerUserId } from "../lib/profile";

const categoryGuidance: Record<string, string> = {
  harassment: "Repeated hostility, intimidation, or aggressive contact.",
  sexual_pressure: "Pushing sexual content or escalation after a boundary was clear.",
  fetishisation: "Reducing someone to a diagnosis, trait, or neurotype.",
  other: "Anything serious that does not fit the categories above."
};

export function SafetyPage() {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [targetUserId, setTargetUserId] = useState<string>(searchParams.get("target") ?? "");
  const [conversationId, setConversationId] = useState<string>(
    searchParams.get("conversation") ?? ""
  );
  const [categories, setCategories] = useState<string[]>(["harassment"]);
  const [description, setDescription] = useState("");
  const [blockUser, setBlockUser] = useState(true);
  const [status, setStatus] = useState("Report and block flow ready.");

  useEffect(() => {
    fetchMatchCandidates(viewerUserId)
      .then((result) => {
        setCandidates(result.candidates);
        setTargetUserId((current) => current || result.candidates[0]?.candidateUserId || "");
      })
      .catch(() => {
        setCandidates([]);
      });
  }, []);

  const candidateOptions = useMemo(
    () =>
      candidates.map((candidate) => ({
        id: candidate.candidateUserId,
        label: candidateName(candidate)
      })),
    [candidates]
  );

  const selectedCandidate = useMemo(
    () => candidateOptions.find((candidate) => candidate.id === targetUserId),
    [candidateOptions, targetUserId]
  );

  const targetLabel = useMemo(
    () =>
      selectedCandidate?.label ??
      (targetUserId ? `user ${targetUserId}` : "this user"),
    [selectedCandidate, targetUserId]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving report...");

    try {
      await createReport({
        reporterUserId: viewerUserId,
        targetUserId,
        conversationId: conversationId || undefined,
        categories: categories as Array<(typeof reportCategories)[number]["value"]>,
        description,
        blockUser
      });
      setDescription("");
      setStatus("Report saved locally. Block state now affects matches and conversations.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save report.");
    }
  }

  return (
    <section className="page stack">
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Safety basics</p>
          <h2>Report behavior and block fast, without turning moderation into theater.</h2>
          <p className="lead">
          Reports here are structured safety records. They are not diagnoses, and automated
          moderation is only a bounded assist.
          </p>
        </div>
        <div className="page-header-meta">
          <span className="status-chip status-chip-danger">Safety action</span>
          <span className="status-text">{status}</span>
        </div>
      </header>

      <div className="field-grid onboarding-layout">
        <form className="panel stack" onSubmit={handleSubmit}>
          <div className="field-grid two-columns">
            <label className="field">
              <span>Reported user</span>
              {candidateOptions.length > 0 ? (
                <select
                  className="input"
                  value={targetUserId}
                  onChange={(event) => setTargetUserId(event.target.value)}
                >
                  {targetUserId && !selectedCandidate ? (
                    <option value={targetUserId}>{targetLabel}</option>
                  ) : null}
                  {candidateOptions.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  onChange={(event) => setTargetUserId(event.target.value)}
                  placeholder="Enter a user ID"
                  value={targetUserId}
                />
              )}
            </label>

            <label className="field">
              <span>Conversation ID</span>
              <input
                className="input"
                value={conversationId}
                onChange={(event) => setConversationId(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="section-card section-card-muted stack">
            <div className="stack-small">
              <p className="eyebrow">Categories</p>
              <h3>Select what best fits the issue</h3>
            </div>
            <div className="stack-small">
              {reportCategories.map((category) => (
                <label className="checkbox-pill" key={category.value}>
                  <input
                    type="checkbox"
                    checked={categories.includes(category.value)}
                    onChange={() =>
                      setCategories((current) => {
                        const next = toggleArrayValue(current, category.value);
                        return next.length > 0 ? next : current;
                      })
                    }
                  />
                  <span>
                    <strong>{category.label}</strong> {" - "}
                    {categoryGuidance[category.value]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="field">
            <span>What happened with {targetLabel}?</span>
            <textarea
              className="textarea"
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the behavior, message, or pressure that crossed a line."
              required
            />
          </label>

          <label className="checkbox-pill">
            <input
              type="checkbox"
              checked={blockUser}
              onChange={(event) => setBlockUser(event.target.checked)}
            />
            <span>Block this user immediately</span>
          </label>

          <div className="action-row action-row-spread">
            <span className="status-text">{status}</span>
            <button className="button button-danger" type="submit">
              Submit report
            </button>
          </div>
        </form>

        <div className="stack">
          <article className="panel stack-small">
            <p className="eyebrow">Immediate effect</p>
            <h3>What happens after submit</h3>
            <p className="muted">
              The report is stored locally, moderation metadata is attached to the target user,
              and optional blocking removes them from normal matching and conversation flow.
            </p>
          </article>

          <article className="panel stack-small">
            <p className="eyebrow">Review stance</p>
            <p className="muted">
              Safety review is platform-focused. It should not infer diagnosis authenticity,
              clinical severity, or psychological truth.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
