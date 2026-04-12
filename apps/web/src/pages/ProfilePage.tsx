import { useEffect, useState, type FormEvent } from "react";
import type { ProfileAnalysis, ProfileInput } from "@clarity/shared";
import { fetchProfile, saveProfile } from "../lib/api";
import {
  calmNeedOptions,
  communicationOptions,
  completenessLabel,
  diagnosisOptions,
  humanizeEnum,
  identityOptions,
  openToOptions,
  profileToInput,
  relationshipIntentOptions,
  routineOptions,
  socialEnergyOptions,
  toleranceOptions,
  toggleArrayValue,
  viewerUserId
} from "../lib/profile";

type IdentityValue = NonNullable<ProfileInput["identity"]>;
type DiagnosisValue = NonNullable<ProfileInput["diagnosisStatus"]>;
type OpenToValue = ProfileInput["openTo"][number];
type CommunicationValue = NonNullable<ProfileInput["communicationStyle"]>;
type SocialEnergyValue = NonNullable<ProfileInput["socialEnergy"]>;
type RoutineValue = NonNullable<ProfileInput["routinePreference"]>;
type IntentValue = NonNullable<ProfileInput["relationshipIntent"]>;
type SensoryNoiseValue = NonNullable<ProfileInput["sensoryProfile"]["noise"]>;
type SensoryCalmValue = NonNullable<ProfileInput["sensoryProfile"]["calm"]>;

function ProfileDetails({
  draft,
  analysis,
  completeness
}: {
  draft: ProfileInput;
  analysis: ProfileAnalysis;
  completeness: number;
}) {
  return (
    <div className="stack">
      <article className="panel stack-small">
        <p className="eyebrow">Profile summary</p>
        <h2>{draft.displayName}</h2>
        <p className="muted">{analysis.summary}</p>
        <div className="pill-row">
          <span className="info-pill">{completenessLabel(completeness)}</span>
          <span className="info-pill">{humanizeEnum(analysis.clarityLevel)} clarity</span>
          <span className="info-pill">{humanizeEnum(draft.relationshipIntent)}</span>
          <span className="info-pill">{humanizeEnum(draft.communicationStyle)}</span>
          <span className="info-pill">{humanizeEnum(draft.socialEnergy)}</span>
        </div>
        <p className="muted">{analysis.communicationStyleNote}</p>
      </article>

      <article className="panel stack-small">
        <p className="eyebrow">Structured profile</p>
        <div className="field-grid two-columns">
          <div>
            <strong>Identity</strong>
            <p className="muted">{humanizeEnum(draft.identity)}</p>
          </div>
          <div>
            <strong>Diagnosis status</strong>
            <p className="muted">{humanizeEnum(draft.diagnosisStatus)}</p>
          </div>
          <div>
            <strong>Match filter</strong>
            <p className="muted">{draft.openTo.map((item) => humanizeEnum(item)).join(", ")}</p>
          </div>
          <div>
            <strong>Communication</strong>
            <p className="muted">{humanizeEnum(draft.communicationStyle)}</p>
          </div>
          <div>
            <strong>Social energy</strong>
            <p className="muted">{humanizeEnum(draft.socialEnergy)}</p>
          </div>
          <div>
            <strong>Sensory profile</strong>
            <p className="muted">
              Noise {humanizeEnum(draft.sensoryProfile.noise)}, crowd{" "}
              {humanizeEnum(draft.sensoryProfile.crowd)}, calm{" "}
              {humanizeEnum(draft.sensoryProfile.calm)}
            </p>
          </div>
          <div>
            <strong>Routine</strong>
            <p className="muted">{humanizeEnum(draft.routinePreference)}</p>
          </div>
          <div>
            <strong>Intent</strong>
            <p className="muted">{humanizeEnum(draft.relationshipIntent)}</p>
          </div>
          <div>
            <strong>Location</strong>
            <p className="muted">{draft.locationLabel || draft.city}</p>
          </div>
        </div>
      </article>

      <article className="panel stack-small">
        <p className="eyebrow">Optional context</p>
        <div className="stack-small">
          <div>
            <strong>Bio</strong>
            <p className="muted">{draft.bio || "Not added yet."}</p>
          </div>
          <div>
            <strong>What drains me</strong>
            <p className="muted">{draft.whatDrainsMe || "Not added yet."}</p>
          </div>
          <div>
            <strong>What I need from a partner</strong>
            <p className="muted">{draft.whatINeedFromAPartner || "Not added yet."}</p>
          </div>
        </div>
      </article>

      <article className="panel stack-small">
        <p className="eyebrow">Profile guidance</p>
        {analysis.lowSignalIndicators.length > 0 ? (
          <ul className="simple-list">
            {analysis.lowSignalIndicators.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Signal strength looks solid right now.</p>
        )}

        {analysis.improvementSuggestions.length > 0 ? (
          <ul className="simple-list">
            {analysis.improvementSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}

        {analysis.contradictionHints.length > 0 ? (
          <ul className="simple-list">
            {analysis.contradictionHints.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </div>
  );
}

export function ProfilePage() {
  const [draft, setDraft] = useState<ProfileInput | null>(null);
  const [analysis, setAnalysis] = useState<ProfileAnalysis | null>(null);
  const [status, setStatus] = useState("Loading profile...");
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    fetchProfile(viewerUserId)
      .then((result) => {
        setDraft(profileToInput(result.profile));
        setAnalysis(result.analysis);
        setCompleteness(result.profile.profileCompleteness);
        setStatus("Profile loaded from the local store.");
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Could not load profile."));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    setStatus("Saving profile...");

    try {
      const result = await saveProfile(viewerUserId, draft);
      setDraft(profileToInput(result.profile));
      setAnalysis(result.analysis);
      setCompleteness(result.profile.profileCompleteness);
      setStatus("Profile saved locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save profile.");
    }
  }

  if (!draft || !analysis) {
    return (
      <section className="page">
        <div className="panel">
          <p className="muted">{status}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page stack">
      <div className="panel split-header">
        <div className="stack-small">
          <p className="eyebrow">Structured profile</p>
          <h2>Edit the signals your matches will actually see</h2>
          <p className="muted">
            This page shows the persisted profile, summary, completeness, and improvement cues
            generated from the current backend state.
          </p>
        </div>
        <div className="stack-small align-end">
          <span className="info-pill">{completenessLabel(completeness)}</span>
          <span className="status-text">{status}</span>
        </div>
      </div>

      <div className="field-grid profile-layout">
        <ProfileDetails analysis={analysis} draft={draft} completeness={completeness} />

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
              <span>Age</span>
              <input
                className="input"
                type="number"
                min={18}
                max={80}
                value={draft.age ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    age: event.target.value ? Number(event.target.value) : undefined
                  })
                }
              />
            </label>

            <label className="field">
              <span>City</span>
              <input
                className="input"
                value={draft.city}
                onChange={(event) => setDraft({ ...draft, city: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Berlin area</span>
              <input
                className="input"
                value={draft.locationLabel ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, locationLabel: event.target.value || undefined })
                }
              />
            </label>
          </div>

          <div className="field-grid two-columns">
            <label className="field">
              <span>Identity (ADHD / Autism / AuDHD)</span>
              <select
                className="input"
                value={draft.identity ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    identity: (event.target.value || undefined) as IdentityValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {identityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Diagnosis status</span>
              <select
                className="input"
                value={draft.diagnosisStatus ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    diagnosisStatus: (event.target.value || undefined) as DiagnosisValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {diagnosisOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="stack-small">
            <span className="field-label">Show me matches from</span>
            <div className="checkbox-row">
              {openToOptions.map((option) => (
                <label className="checkbox-pill" key={option.value}>
                  <input
                    type="checkbox"
                    checked={draft.openTo.includes(option.value)}
                    onChange={() =>
                      setDraft({
                        ...draft,
                        openTo: toggleArrayValue(draft.openTo, option.value as OpenToValue)
                      })
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="field-grid two-columns">
            <label className="field">
              <span>Communication style</span>
              <select
                className="input"
                value={draft.communicationStyle ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    communicationStyle:
                      (event.target.value || undefined) as CommunicationValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {communicationOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Social energy</span>
              <select
                className="input"
                value={draft.socialEnergy ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    socialEnergy:
                      (event.target.value || undefined) as SocialEnergyValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {socialEnergyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Routine</span>
              <select
                className="input"
                value={draft.routinePreference ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    routinePreference:
                      (event.target.value || undefined) as RoutineValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {routineOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Relationship intent</span>
              <select
                className="input"
                value={draft.relationshipIntent ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    relationshipIntent:
                      (event.target.value || undefined) as IntentValue | undefined
                  })
                }
              >
                <option value="">Choose...</option>
                {relationshipIntentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field-grid three-columns">
            <label className="field">
              <span>Noise</span>
              <select
                className="input"
                value={draft.sensoryProfile.noise ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sensoryProfile: {
                      ...draft.sensoryProfile,
                      noise: (event.target.value || undefined) as SensoryNoiseValue | undefined
                    }
                  })
                }
              >
                <option value="">Choose...</option>
                {toleranceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Crowd</span>
              <select
                className="input"
                value={draft.sensoryProfile.crowd ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sensoryProfile: {
                      ...draft.sensoryProfile,
                      crowd: (event.target.value || undefined) as SensoryNoiseValue | undefined
                    }
                  })
                }
              >
                <option value="">Choose...</option>
                {toleranceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Calm</span>
              <select
                className="input"
                value={draft.sensoryProfile.calm ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    sensoryProfile: {
                      ...draft.sensoryProfile,
                      calm: (event.target.value || undefined) as SensoryCalmValue | undefined
                    }
                  })
                }
              >
                <option value="">Choose...</option>
                {calmNeedOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field">
            <span>Bio</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.bio ?? ""}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value || undefined })}
            />
          </label>

          <label className="field">
            <span>What drains me</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.whatDrainsMe ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, whatDrainsMe: event.target.value || undefined })
              }
            />
          </label>

          <label className="field">
            <span>What I need from a partner</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.whatINeedFromAPartner ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  whatINeedFromAPartner: event.target.value || undefined
                })
              }
            />
          </label>

          <div className="action-row">
            <button className="button" type="submit">
              Save profile
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
