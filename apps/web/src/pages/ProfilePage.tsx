import { useEffect, useState, type FormEvent } from "react";
import type { Profile } from "@project-a-z/shared";
import { fetchProfile, saveProfile } from "../lib/api";
import { defaultDemoUserId, demoUsers, splitCommaList } from "../lib/demo";

export function ProfilePage() {
  const [userId, setUserId] = useState<string>(defaultDemoUserId);
  const [draft, setDraft] = useState<Profile | null>(null);
  const [status, setStatus] = useState("Loading profile...");

  useEffect(() => {
    fetchProfile(userId)
      .then((result) => {
        setDraft(result.profile);
        setStatus("Profile loaded from the seeded runtime store.");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load profile."));
  }, [userId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    setStatus("Saving profile...");

    try {
      await saveProfile(userId, draft);
      setStatus("Profile saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save profile.");
    }
  }

  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Profile editor</p>
        <h2>Structured profile fields come first, expressive text comes second.</h2>
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
              <span>Display name</span>
              <input
                className="input"
                value={draft.displayName}
                onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Tagline</span>
              <input
                className="input"
                value={draft.tagline}
                onChange={(event) => setDraft({ ...draft, tagline: event.target.value })}
              />
            </label>
          </div>

          <label className="field">
            <span>Bio</span>
            <textarea
              className="textarea"
              rows={5}
              value={draft.bio}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value })}
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

          <div className="field-grid two-columns">
            <label className="field">
              <span>Interests</span>
              <input
                className="input"
                value={draft.interests.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, interests: splitCommaList(event.target.value) })
                }
              />
            </label>

            <label className="field">
              <span>Berlin areas</span>
              <input
                className="input"
                value={draft.berlinAreas.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, berlinAreas: splitCommaList(event.target.value) })
                }
              />
            </label>

            <label className="field">
              <span>Languages</span>
              <input
                className="input"
                value={draft.languages.join(", ")}
                onChange={(event) =>
                  setDraft({ ...draft, languages: splitCommaList(event.target.value) })
                }
              />
            </label>

            <label className="field">
              <span>Neurotype match preference</span>
              <select
                className="input"
                value={draft.neurotypeMatchPreference}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    neurotypeMatchPreference:
                      event.target.value as Profile["neurotypeMatchPreference"]
                  })
                }
              >
                <option value="nd_only">Neurodivergent only</option>
                <option value="prefer_nd">Prefer neurodivergent</option>
                <option value="open_later">Open later</option>
              </select>
            </label>
          </div>

          <div className="action-row">
            <button className="button" type="submit">
              Save profile
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
