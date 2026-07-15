import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", hint: "Hypothesis and synthetic waitlist demo" },
  { to: "/onboarding", label: "Onboarding", hint: "Exercise the legacy form" },
  { to: "/profile", label: "Profile", hint: "Inspect synthetic fields" },
  { to: "/matches", label: "Matches", hint: "Review overlap notes, differences, and prompts" },
  { to: "/chat", label: "Chat", hint: "Exercise synthetic conversations" },
  { to: "/safety", label: "Safety", hint: "Exercise report/block scaffolding" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block stack-small">
          <p className="eyebrow">Clarity-first dating</p>
          <h1>Clarity.ai</h1>
          <p className="sidebar-lead">
            A local product-development prototype for reviewing lower-ambiguity interaction flows.
          </p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
              to={item.to}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-hint">{item.hint}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note stack-small">
          <p className="sidebar-note-title">What you get</p>
          <p className="muted">
            Synthetic structured profiles, rule-output review, local chat, and report/block scaffolding.
          </p>
        </div>

        <div className="sidebar-note stack-small sidebar-note-muted">
          <p className="sidebar-note-title">What this is not</p>
          <p className="muted">
            No swipes, no streaks, no pressure loops, and no pretending chemistry can be solved by a score.
          </p>
        </div>
      </aside>

      <main className="content">
        <div className="helper-callout">
          <strong>Local synthetic MVP only.</strong> Do not enter real profiles, diagnosis or
          identity data, messages, reports, research information, or contact details. No participant
          service or operational safety review exists.
        </div>
        <Outlet />
      </main>
    </div>
  );
}
