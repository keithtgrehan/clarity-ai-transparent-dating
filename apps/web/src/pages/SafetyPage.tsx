import { useState, type FormEvent } from "react";
import { createReport } from "../lib/api";
import { defaultDemoUserId, demoUsers } from "../lib/demo";

const categories = [
  { value: "harassment", label: "Harassment" },
  { value: "boundary_violation", label: "Boundary violation" },
  { value: "coercion", label: "Coercion" },
  { value: "fetishization", label: "Fetishization" },
  { value: "impersonation", label: "Impersonation" },
  { value: "hate_or_bigotry", label: "Hate or bigotry" },
  { value: "sexual_content_without_consent", label: "Sexual content without consent" },
  { value: "spam_or_scam", label: "Spam or scam" },
  { value: "manipulative_pressure", label: "Manipulative pressure" },
  { value: "unsafe_off_platform_request", label: "Unsafe off-platform request" }
] as const;

export function SafetyPage() {
  const [reporterUserId, setReporterUserId] = useState<string>(defaultDemoUserId);
  const [targetUserId, setTargetUserId] = useState<string>("user-jonas");
  const [category, setCategory] = useState<(typeof categories)[number]["value"]>("boundary_violation");
  const [description, setDescription] = useState("");
  const [blockUser, setBlockUser] = useState(true);
  const [status, setStatus] = useState("Report and block flow ready.");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Saving report...");

    try {
      await createReport({
        reporterUserId,
        targetUserId,
        categories: [category],
        description,
        blockUser
      });
      setDescription("");
      setStatus("Report saved locally. Matching and conversations will respect block state.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save report.");
    }
  }

  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Report and block flow</p>
        <h2>Safety is foundational, not a post-launch patch.</h2>
        <p className="muted">
          Reports in this repo are platform-safety structures. They are not clinical judgments,
          and AI is not the final authority on enforcement.
        </p>
      </div>

      <form className="panel stack" onSubmit={handleSubmit}>
        <div className="field-grid two-columns">
          <label className="field">
            <span>Reporter</span>
            <select
              className="input"
              value={reporterUserId}
              onChange={(event) => setReporterUserId(event.target.value)}
            >
              {demoUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Reported user</span>
            <select
              className="input"
              value={targetUserId}
              onChange={(event) => setTargetUserId(event.target.value)}
            >
              {demoUsers
                .filter((user) => user.id !== reporterUserId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.label}
                  </option>
                ))}
            </select>
          </label>

          <label className="field">
            <span>Category</span>
            <select
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value as typeof category)}
            >
              {categories.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            className="textarea"
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Describe the behavior or message that crossed a line."
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

        <div className="action-row">
          <button className="button button-danger" type="submit">
            Submit report
          </button>
          <span className="status-text">{status}</span>
        </div>
      </form>
    </section>
  );
}
