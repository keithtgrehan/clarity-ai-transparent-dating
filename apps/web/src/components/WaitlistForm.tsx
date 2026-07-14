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
  const [status, setStatus] = useState(
    "Synthetic demo only. Use a reserved .test email address; no one will contact you."
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.email.toLowerCase().endsWith(".test")) {
      setStatus("Real contact details are not accepted. Use a reserved address such as person@example.test.");
      return;
    }

    setStatus("Saving your details...");

    try {
      await createWaitlistLead(draft);
      setDraft(defaultDraft);
      setStatus("Synthetic entry saved to the disposable local demo store.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save waitlist lead.");
    }
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <div className="stack-small">
        <p className="eyebrow">Synthetic waitlist demo</p>
        <h3>Exercise the local-only form</h3>
        <p className="muted">
          Do not enter real personal data. This preserved MVP flow accepts only reserved
          <code> .test</code> email addresses and does not recruit participants or send outreach.
        </p>
      </div>

      <div className="section-card section-card-muted stack">
        <div className="section-title-row">
          <div className="stack-small">
            <h4>Core contact details</h4>
            <p className="field-hint">
              Values are stored only in the disposable local JSON demo store.
            </p>
          </div>
          <span className="status-chip">Synthetic only</span>
        </div>

        <div className="field-grid two-columns">
          <label className="field">
            <span>First name</span>
            <input
              className="input"
              value={draft.firstName}
              onChange={(event) => setDraft({ ...draft, firstName: event.target.value })}
              placeholder="Synthetic"
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
              placeholder="person@example.test"
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
      </div>

      <label className="field">
        <span>Synthetic demonstration note</span>
        <textarea
          className="textarea"
          rows={4}
          value={draft.note ?? ""}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          placeholder="Synthetic text only; do not enter private or participant information."
        />
      </label>

      <div className="action-row">
        <button className="button" type="submit">
          Save synthetic entry
        </button>
        <span className="status-text">{status}</span>
      </div>
    </form>
  );
}
