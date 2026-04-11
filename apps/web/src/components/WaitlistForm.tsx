import { useState, type FormEvent } from "react";
import type { CreateWaitlistLeadInput } from "@clarity/shared";
import { createWaitlistLead } from "../lib/api";
import {
  communicationOptions,
  relationshipIntentOptions
} from "../lib/profile";

const defaultDraft: CreateWaitlistLeadInput = {
  firstName: "",
  email: "",
  city: "Berlin",
  relationshipIntent: "dating_with_intent",
  communicationStyle: "direct",
  note: ""
};

export function WaitlistForm() {
  const [draft, setDraft] = useState<CreateWaitlistLeadInput>(defaultDraft);
  const [status, setStatus] = useState("Join the Berlin waitlist for future pilot access.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving waitlist lead...");

    try {
      await createWaitlistLead(draft);
      setDraft(defaultDraft);
      setStatus("Saved locally. This waitlist lead is now in the runtime store.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save waitlist lead.");
    }
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div>
        <p className="eyebrow">Waitlist</p>
        <h3>Join the Berlin pilot list</h3>
        <p className="muted">
          This stays lightweight on purpose: enough signal for interviews and pilot follow-up,
          without pretending the product is fully open.
        </p>
      </div>

      <div className="field-grid two-columns">
        <label className="field">
          <span>First name</span>
          <input
            className="input"
            value={draft.firstName}
            onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
            placeholder="Riley"
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
          <span>Relationship intent</span>
          <select
            className="input"
            value={draft.relationshipIntent ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                relationshipIntent:
                  event.target.value as CreateWaitlistLeadInput["relationshipIntent"]
              })
            }
          >
            {relationshipIntentOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Communication preference</span>
          <select
            className="input"
            value={draft.communicationStyle ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                communicationStyle:
                  event.target.value as CreateWaitlistLeadInput["communicationStyle"]
              })
            }
          >
            {communicationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>What would make dating feel clearer for you?</span>
        <textarea
          className="textarea"
          rows={4}
          value={draft.note ?? ""}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          placeholder="For example: direct communication, lower-noise date options, clearer relationship intent..."
        />
      </label>

      <div className="action-row">
        <button className="button" type="submit">
          Join waitlist
        </button>
        <span className="status-text">{status}</span>
      </div>
    </form>
  );
}
