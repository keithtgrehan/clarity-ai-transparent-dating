import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "@project-a-z/shared";
import { fetchProfile, submitOnboarding } from "../lib/api";
import { defaultDemoUserId, demoUsers } from "../lib/demo";

export function OnboardingPage() {
  const [userId, setUserId] = useState<string>(defaultDemoUserId);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [status, setStatus] = useState("Loading demo onboarding data...");

  useEffect(() => {
    fetchProfile(userId)
      .then((result) => {
        setDraft(result.profile);
        setStatus("Onboarding draft loaded from the seeded profile.");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load profile."));
  }, [userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    setStatus("Saving onboarding...");

    try {
      await submitOnboarding(userId, draft);
      setStatus("Onboarding saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save onboarding.");
    }
  }

  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Structured onboarding</p>
        <h2>Guide users toward explicit signals, not charming vagueness.</h2>
        <p className="muted">
          This stub edits a full seeded profile through an onboarding-shaped form so the
          structure stays compatible with the shared contracts.
        </p>
      </div>

      <label className="field">
        <span>Demo user</span>
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

      {draft ? (
        <form className="panel stack" onSubmit={handleSubmit}>
          <div className="field-grid two-columns">
            <label className="field">
              <span>Tagline</span>
              <input
                className="input"
                value={draft.tagline}
                onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Relationship intent</span>
              <select
                className="input"
                value={draft.relationshipIntent.primary}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    relationshipIntent: {
                      ...draft.relationshipIntent,
                      primary: event.target.value as Profile["relationshipIntent"]["primary"]
                    }
                  })
                }
              >
                <option value="long_term_relationship">Long-term relationship</option>
                <option value="life_partner">Life partner</option>
                <option value="dating_with_intent">Dating with intent</option>
                <option value="exploring_with_clarity">Exploring with clarity</option>
                <option value="short_term_connection">Short-term connection</option>
              </select>
            </label>

            <label className="field">
              <span>Intent pacing</span>
              <select
                className="input"
                value={draft.relationshipIntent.pacing}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    relationshipIntent: {
                      ...draft.relationshipIntent,
                      pacing: event.target.value as Profile["relationshipIntent"]["pacing"]
                    }
                  })
                }
              >
                <option value="slow_and_intentional">Slow and intentional</option>
                <option value="steady">Steady</option>
                <option value="flexible">Flexible</option>
              </select>
            </label>

            <label className="field">
              <span>Planning style</span>
              <select
                className="input"
                value={draft.communicationPreferences.planningStyle}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    communicationPreferences: {
                      ...draft.communicationPreferences,
                      planningStyle:
                        event.target.value as Profile["communicationPreferences"]["planningStyle"]
                    }
                  })
                }
              >
                <option value="scheduled">Scheduled</option>
                <option value="semi_spontaneous">Semi-spontaneous</option>
                <option value="spontaneous">Spontaneous</option>
              </select>
            </label>

            <label className="field">
              <span>Directness</span>
              <select
                className="input"
                value={draft.communicationPreferences.directness}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    communicationPreferences: {
                      ...draft.communicationPreferences,
                      directness:
                        event.target.value as Profile["communicationPreferences"]["directness"]
                    }
                  })
                }
              >
                <option value="very_direct">Very direct</option>
                <option value="direct_with_context">Direct with context</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>

            <label className="field">
              <span>Noise tolerance</span>
              <select
                className="input"
                value={draft.sensoryPreferences.noiseTolerance}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sensoryPreferences: {
                      ...draft.sensoryPreferences,
                      noiseTolerance:
                        event.target.value as Profile["sensoryPreferences"]["noiseTolerance"]
                    }
                  })
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <label className="field">
            <span>What helps communication?</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.whatHelpsMeCommunicate}
              onChange={(event) =>
                setDraft({ ...draft, whatHelpsMeCommunicate: event.target.value })
              }
            />
          </label>

          <label className="field">
            <span>Ideal first date</span>
            <textarea
              className="textarea"
              rows={3}
              value={draft.idealFirstDate}
              onChange={(event) => setDraft({ ...draft, idealFirstDate: event.target.value })}
            />
          </label>

          <div className="action-row">
            <button className="button" type="submit">
              Save onboarding
            </button>
            <span className="status-text">{status}</span>
          </div>
        </form>
      ) : (
        <div className="panel">
          <p className="muted">{status}</p>
        </div>
      )}
    </section>
  );
}
