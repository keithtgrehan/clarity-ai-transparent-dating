export function SettingsPage() {
  return (
    <section className="page stack">
      <div className="panel">
        <p className="eyebrow">Settings and boundaries</p>
        <h2>Explicit controls beat hidden defaults.</h2>
      </div>

      <div className="panel-grid">
        <article className="panel">
          <h3>Match filters</h3>
          <p className="muted">
            The profile model already supports `nd_only`, `prefer_nd`, and `open_later`.
            This first pass surfaces the decision in profile settings rather than hiding it in ranking logic.
          </p>
        </article>

        <article className="panel">
          <h3>AI posture</h3>
          <p className="muted">
            AI summaries should stay editable, bounded, and easy to ignore. There is no
            psychological truth layer in this foundation.
          </p>
        </article>

        <article className="panel">
          <h3>Privacy and deletion</h3>
          <p className="muted">
            Export, deletion, retention, and consent copy need real legal review before launch.
            They are intentionally documented as TODOs rather than hand-waved.
          </p>
        </article>
      </div>
    </section>
  );
}
