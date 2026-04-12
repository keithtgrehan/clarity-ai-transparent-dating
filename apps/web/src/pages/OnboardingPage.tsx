import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ProfileInput } from "@clarity/shared";
import { fetchProfile, submitOnboarding } from "../lib/api";
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

type OpenToValue = ProfileInput["openTo"][number];
type SensoryNoiseValue = NonNullable<ProfileInput["sensoryProfile"]["noise"]>;
type SensoryCalmValue = NonNullable<ProfileInput["sensoryProfile"]["calm"]>;

const steps = [
  {
    title: "Identity and diagnosis status",
    helper: "Choose the neurotype identity and diagnosis status you want matching to respect. No inference, no personality typing."
  },
  {
    title: "Communication style",
    helper: "Pick the style that feels easiest for you to receive from a new person."
  },
  {
    title: "Social energy",
    helper: "This helps set expectations for pacing, frequency, and social recovery."
  },
  {
    title: "Sensory profile",
    helper: "Name the environments that help you stay present rather than overloaded."
  },
  {
    title: "Routine versus spontaneity",
    helper: "This keeps planning friction visible before it becomes personal."
  },
  {
    title: "Relationship intent",
    helper: "Clarity about intent matters more than impressive wording."
  },
  {
    title: "Optional context",
    helper: "Add anything that would make dating with you easier to understand early."
  }
] as const;

function calculateDraftCompletion(draft: ProfileInput) {
  const checks = [
    Boolean(draft.identity),
    Boolean(draft.diagnosisStatus),
    draft.openTo.length > 0,
    Boolean(draft.communicationStyle),
    Boolean(draft.socialEnergy),
    Boolean(draft.sensoryProfile.noise),
    Boolean(draft.sensoryProfile.crowd),
    Boolean(draft.sensoryProfile.calm),
    Boolean(draft.routinePreference),
    Boolean(draft.relationshipIntent),
    Boolean(draft.locationLabel),
    Boolean(draft.whatDrainsMe),
    Boolean(draft.whatINeedFromAPartner)
  ];

  return checks.filter(Boolean).length / checks.length;
}

function validateStep(draft: ProfileInput, stepIndex: number) {
  switch (stepIndex) {
    case 0:
      if (!draft.identity) {
        return "Choose how you want your identity shown.";
      }

      if (draft.openTo.length === 0) {
        return "Choose at least one identity you are open to dating.";
      }

      if (!draft.diagnosisStatus) {
        return "Choose a diagnosis status.";
      }

      return null;
    case 1:
      return draft.communicationStyle ? null : "Choose a communication style.";
    case 2:
      return draft.socialEnergy ? null : "Choose a social energy level.";
    case 3:
      if (!draft.sensoryProfile.noise) {
        return "Choose your noise preference.";
      }

      if (!draft.sensoryProfile.crowd) {
        return "Choose your crowd preference.";
      }

      return draft.sensoryProfile.calm ? null : "Choose how much calm matters for you.";
    case 4:
      return draft.routinePreference ? null : "Choose a routine preference.";
    case 5:
      return draft.relationshipIntent ? null : "Choose a relationship intent.";
    default:
      return null;
  }
}

function renderStep(draft: ProfileInput, setDraft: (next: ProfileInput) => void, stepIndex: number) {
  switch (stepIndex) {
    case 0:
      return (
        <div className="stack">
          <div className="field-grid two-columns">
            <label className="field">
              <span>Name shown on profile</span>
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
                  setDraft({
                    ...draft,
                    locationLabel: event.target.value || undefined
                  })
                }
                placeholder="Optional, but helpful for local matching"
              />
            </label>
          </div>

          <div className="stack-small">
            <span className="field-label">Identity (ADHD / Autism / AuDHD)</span>
            <div className="choice-grid">
              {identityOptions.map((option) => (
                <button
                  className={
                    draft.identity === option.value ? "choice-card choice-card-active" : "choice-card"
                  }
                  key={option.value}
                  onClick={() => setDraft({ ...draft, identity: option.value })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
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

          <div className="stack-small">
            <span className="field-label">Diagnosis status</span>
            <div className="choice-grid">
              {diagnosisOptions.map((option) => (
                <button
                  className={
                    draft.diagnosisStatus === option.value
                      ? "choice-card choice-card-active"
                      : "choice-card"
                  }
                  key={option.value}
                  onClick={() =>
                    setDraft({ ...draft, diagnosisStatus: option.value })
                  }
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    case 1:
      return (
        <div className="choice-grid">
          {communicationOptions.map((option) => (
            <button
              className={
                draft.communicationStyle === option.value
                  ? "choice-card choice-card-active"
                  : "choice-card"
              }
              key={option.value}
              onClick={() =>
                setDraft({ ...draft, communicationStyle: option.value })
              }
              type="button"
            >
              <strong>{option.label}</strong>
              <span className="muted">{option.help}</span>
            </button>
          ))}
        </div>
      );
    case 2:
      return (
        <div className="choice-grid">
          {socialEnergyOptions.map((option) => (
            <button
              className={
                draft.socialEnergy === option.value
                  ? "choice-card choice-card-active"
                  : "choice-card"
              }
              key={option.value}
              onClick={() => setDraft({ ...draft, socialEnergy: option.value })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    case 3:
      return (
        <div className="stack">
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
        </div>
      );
    case 4:
      return (
        <div className="choice-grid">
          {routineOptions.map((option) => (
            <button
              className={
                draft.routinePreference === option.value
                  ? "choice-card choice-card-active"
                  : "choice-card"
              }
              key={option.value}
              onClick={() =>
                setDraft({ ...draft, routinePreference: option.value })
              }
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    case 5:
      return (
        <div className="choice-grid">
          {relationshipIntentOptions.map((option) => (
            <button
              className={
                draft.relationshipIntent === option.value
                  ? "choice-card choice-card-active"
                  : "choice-card"
              }
              key={option.value}
              onClick={() =>
                setDraft({ ...draft, relationshipIntent: option.value })
              }
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      );
    default:
      return (
        <div className="stack">
          <label className="field">
            <span>Short bio</span>
            <textarea
              className="textarea"
              rows={4}
              value={draft.bio ?? ""}
              onChange={(event) => setDraft({ ...draft, bio: event.target.value || undefined })}
              placeholder="Optional, but useful. Keep it concrete."
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
              placeholder="For example: vague plans, loud bars, pressure, last-minute changes..."
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
              placeholder="For example: direct updates, steadier pacing, calm plans, explicit reassurance..."
            />
          </label>
        </div>
      );
  }
}

export function OnboardingPage() {
  const [draft, setDraft] = useState<ProfileInput | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState("Loading onboarding...");
  const [analysisSummary, setAnalysisSummary] = useState("");

  useEffect(() => {
    fetchProfile(viewerUserId)
      .then((result) => {
        setDraft(profileToInput(result.profile));
        setAnalysisSummary(result.analysis.summary);
        setStatus(
          result.exists
            ? "Loaded your saved draft from the local store."
            : "Starting a new onboarding draft."
        );
      })
      .catch((error) =>
        setStatus(error instanceof Error ? error.message : "Could not load onboarding.")
      );
  }, []);

  const completion = useMemo(() => (draft ? calculateDraftCompletion(draft) : 0), [draft]);

  function handleNext() {
    if (!draft) {
      return;
    }

    const validationError = validateStep(draft, stepIndex);

    if (validationError) {
      setStatus(validationError);
      return;
    }

    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
    setStatus("Progress saved in the form. Submit on the final step to persist it.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    const validationError = steps
      .map((_, index) => validateStep(draft, index))
      .find(Boolean);

    if (validationError) {
      setStatus(validationError);
      return;
    }

    setStatus("Saving onboarding...");

    try {
      const result = await submitOnboarding(viewerUserId, draft);
      setDraft(profileToInput(result.profile));
      setAnalysisSummary(result.analysis.summary);
      setStatus("Onboarding saved. Your profile is now persisted locally.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save onboarding.");
    }
  }

  if (!draft) {
    return (
      <section className="page">
        <div className="panel">
          <p className="muted">{status}</p>
        </div>
      </section>
    );
  }

  const activeStep = steps[stepIndex];
  const currentStepError = validateStep(draft, stepIndex);

  return (
    <section className="page stack">
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Structured onboarding</p>
          <h2>{activeStep.title}</h2>
          <p className="lead">
            Structured data first, free text second. Each section is short on purpose so the
            profile stays readable and matching stays explainable.
          </p>
        </div>

        <div className="page-header-meta">
          <span className="info-pill">Step {stepIndex + 1} of {steps.length}</span>
          <span className="info-pill">{completenessLabel(completion)}</span>
          <p className="status-text">
            {currentStepError ? currentStepError : "Current step has enough signal to continue."}
          </p>
        </div>
      </header>

      <div className="progress-rail" aria-hidden="true">
        <div className="progress-bar" style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <div className="field-grid onboarding-layout">
        <form className="panel stack" onSubmit={handleSubmit}>
          <div className="section-card section-card-muted stack-small">
            <p className="eyebrow">Current section</p>
            <h3>{activeStep.title}</h3>
            <p className="muted">{activeStep.helper}</p>
          </div>

          {renderStep(draft, setDraft, stepIndex)}

          <div className="action-row action-row-spread">
            <span className="status-text">{status}</span>
            <div className="action-row">
              <button
                className="button button-ghost"
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                type="button"
              >
                Back
              </button>

              {stepIndex < steps.length - 1 ? (
                <button className="button" onClick={handleNext} type="button">
                  Continue
                </button>
              ) : (
                <button className="button" type="submit">
                  Save onboarding
                </button>
              )}
            </div>
          </div>
        </form>

        <div className="stack">
          <article className="panel stack-small">
            <p className="eyebrow">Progress map</p>
            <ol className="step-list">
              {steps.map((step, index) => {
                const stepState =
                  index < stepIndex ? "Complete" : index === stepIndex ? "Current" : "Up next";

                return (
                  <li
                    className={index === stepIndex ? "step-item step-item-active" : "step-item"}
                    key={step.title}
                  >
                    <span className="step-index">{index + 1}</span>
                    <div className="step-body">
                      <strong>{step.title}</strong>
                      <p>{stepState}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>

          <article className="panel stack-small">
            <p className="eyebrow">Profile snapshot</p>
            <h3>{draft.displayName}</h3>
            <p className="muted">{analysisSummary || "Summary will appear once you add more signal."}</p>
            <ul className="summary-list">
              <li>Identity: {humanizeEnum(draft.identity)}</li>
              <li>Match filter: {draft.openTo.map((item) => humanizeEnum(item)).join(", ")}</li>
              <li>Communication: {humanizeEnum(draft.communicationStyle)}</li>
              <li>Energy: {humanizeEnum(draft.socialEnergy)}</li>
              <li>Routine: {humanizeEnum(draft.routinePreference)}</li>
              <li>Intent: {humanizeEnum(draft.relationshipIntent)}</li>
            </ul>
          </article>

          <article className="panel stack-small">
            <p className="eyebrow">What gets saved</p>
            <p className="muted">
              This onboarding persists to the local backend and becomes the structured profile
              used for matching, chat prompts, and reporting context.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
