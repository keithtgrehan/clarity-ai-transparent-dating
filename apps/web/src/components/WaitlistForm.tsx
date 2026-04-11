import { useState, type FormEvent } from "react";
import type { CreateWaitlistLeadInput } from "@project-a-z/shared";
import { createWaitlistLead } from "../lib/api";
import { splitCommaList } from "../lib/demo";

type NeurotypeContext = CreateWaitlistLeadInput["neurotypeContexts"][number];
type RelationshipPrimary = CreateWaitlistLeadInput["relationshipIntent"]["primary"];
type RelationshipPacing = CreateWaitlistLeadInput["relationshipIntent"]["pacing"];
type RelationshipOpenness = CreateWaitlistLeadInput["relationshipIntent"]["openness"][number];

type DraftState = {
  firstName: string;
  email: string;
  city: string;
  neighborhood: string;
  languages: string;
  neurotypeContexts: NeurotypeContext[];
  relationshipPrimary: RelationshipPrimary;
  relationshipPacing: RelationshipPacing;
  openness: RelationshipOpenness;
  communicationNeeds: string;
  source: string;
  interviewOptIn: boolean;
  pilotOptIn: boolean;
};

const defaultDraft: DraftState = {
  firstName: "",
  email: "",
  city: "Berlin",
  neighborhood: "",
  languages: "English, German",
  neurotypeContexts: ["audhd"],
  relationshipPrimary: "dating_with_intent",
  relationshipPacing: "steady",
  openness: "monogamous",
  communicationNeeds: "",
  source: "Project A-Z landing page",
  interviewOptIn: true,
  pilotOptIn: true
};

function buildPayload(draft: DraftState): CreateWaitlistLeadInput {
  return {
    firstName: draft.firstName,
    email: draft.email,
    city: draft.city,
    neighborhood: draft.neighborhood,
    languages: splitCommaList(draft.languages),
    neurotypeContexts: draft.neurotypeContexts,
    relationshipIntent: {
      primary: draft.relationshipPrimary as CreateWaitlistLeadInput["relationshipIntent"]["primary"],
      pacing: draft.relationshipPacing as CreateWaitlistLeadInput["relationshipIntent"]["pacing"],
      openness: [draft.openness as CreateWaitlistLeadInput["relationshipIntent"]["openness"][number]],
      notes: "Captured from landing-page waitlist scaffold."
    },
    communicationNeeds: draft.communicationNeeds,
    source: draft.source,
    interviewOptIn: draft.interviewOptIn,
    pilotOptIn: draft.pilotOptIn
  };
}

export function WaitlistForm() {
  const [draft, setDraft] = useState(defaultDraft);
  const [status, setStatus] = useState("Berlin-first waitlist open.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving waitlist lead...");

    try {
      await createWaitlistLead(buildPayload(draft));
      setStatus("Saved locally. This lead is now in the runtime store.");
      setDraft(defaultDraft);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save waitlist lead.");
    }
  }

  function toggleNeurotype(value: NeurotypeContext) {
    setDraft((current) => {
      const exists = current.neurotypeContexts.includes(value);
      const nextValues = exists
        ? current.neurotypeContexts.filter((entry) => entry !== value)
        : [...current.neurotypeContexts, value];

      return {
        ...current,
        neurotypeContexts: nextValues.length > 0 ? nextValues : current.neurotypeContexts
      };
    });
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Berlin waitlist</p>
        <h3>Join the first local cohort</h3>
        <p className="muted">
          This captures enough structure for founder interviews and early pilot filtering
          without pretending the product is public-ready yet.
        </p>
      </div>

      <div className="field-grid two-columns">
        <label className="field">
          <span>First name</span>
          <input
            className="input"
            value={draft.firstName}
            onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
            placeholder="Lara"
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            className="input"
            type="email"
            value={draft.email}
            onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            placeholder="you@example.com"
            required
          />
        </label>

        <label className="field">
          <span>City</span>
          <input
            className="input"
            value={draft.city}
            onChange={(event) => setDraft({ ...draft, city: event.target.value })}
            required
          />
        </label>

        <label className="field">
          <span>Neighborhood</span>
          <input
            className="input"
            value={draft.neighborhood}
            onChange={(event) => setDraft({ ...draft, neighborhood: event.target.value })}
            placeholder="Neukolln"
            required
          />
        </label>

        <label className="field">
          <span>Languages</span>
          <input
            className="input"
            value={draft.languages}
            onChange={(event) => setDraft({ ...draft, languages: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Source</span>
          <input
            className="input"
            value={draft.source}
            onChange={(event) => setDraft({ ...draft, source: event.target.value })}
          />
        </label>
      </div>

      <div className="field-grid three-columns">
        <label className="field">
          <span>Relationship intent</span>
          <select
            className="input"
            value={draft.relationshipPrimary}
            onChange={(event) =>
              setDraft({
                ...draft,
                relationshipPrimary: event.target.value as RelationshipPrimary
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
          <span>Pacing</span>
          <select
            className="input"
            value={draft.relationshipPacing}
            onChange={(event) =>
              setDraft({
                ...draft,
                relationshipPacing: event.target.value as RelationshipPacing
              })
            }
          >
            <option value="slow_and_intentional">Slow and intentional</option>
            <option value="steady">Steady</option>
            <option value="flexible">Flexible</option>
          </select>
        </label>

        <label className="field">
          <span>Relationship structure</span>
          <select
            className="input"
            value={draft.openness}
            onChange={(event) =>
              setDraft({
                ...draft,
                openness: event.target.value as RelationshipOpenness
              })
            }
          >
            <option value="monogamous">Monogamous</option>
            <option value="non_monogamous">Non-monogamous</option>
            <option value="not_sure_yet">Not sure yet</option>
          </select>
        </label>
      </div>

      <div className="stack-small">
        <span className="field-label">Neurotype context</span>
        <div className="checkbox-row">
          {[
            { value: "adhd", label: "ADHD" },
            { value: "autism", label: "Autism" },
            { value: "audhd", label: "AuDHD" },
            { value: "anxiety_secondary", label: "Anxiety (secondary)" },
            { value: "depression_secondary", label: "Depression (secondary)" }
          ].map((option) => (
            <label className="checkbox-pill" key={option.value}>
              <input
                type="checkbox"
                checked={draft.neurotypeContexts.includes(option.value as NeurotypeContext)}
                onChange={() =>
                  toggleNeurotype(option.value as NeurotypeContext)
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="field">
        <span>What helps communication feel good?</span>
        <textarea
          className="textarea"
          value={draft.communicationNeeds}
          onChange={(event) => setDraft({ ...draft, communicationNeeds: event.target.value })}
          placeholder="For example: direct language, clear timing, lower-noise dates..."
          rows={4}
          required
        />
      </label>

      <div className="checkbox-row">
        <label className="checkbox-pill">
          <input
            type="checkbox"
            checked={draft.interviewOptIn}
            onChange={(event) => setDraft({ ...draft, interviewOptIn: event.target.checked })}
          />
          <span>Open to founder interview</span>
        </label>

        <label className="checkbox-pill">
          <input
            type="checkbox"
            checked={draft.pilotOptIn}
            onChange={(event) => setDraft({ ...draft, pilotOptIn: event.target.checked })}
          />
          <span>Open to early Berlin pilot</span>
        </label>
      </div>

      <div className="action-row">
        <button className="button" type="submit">
          Save waitlist lead
        </button>
        <span className="status-text">{status}</span>
      </div>
    </form>
  );
}
