import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", hint: "Product position and waitlist" },
  { to: "/onboarding", label: "Onboarding", hint: "Structured entry flow" },
  { to: "/profile", label: "Profile", hint: "Signals, summary, and edits" },
  { to: "/matches", label: "Matches", hint: "Explainable fit, not swipes" },
  { to: "/chat", label: "Chat", hint: "Low-pressure conversation flow" },
  { to: "/safety", label: "Safety", hint: "Report and block basics" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block stack-small">
          <p className="eyebrow">Clarity-first dating</p>
          <h1>Clarity.ai</h1>
          <p className="sidebar-lead">
            A quieter dating environment for structured onboarding, readable profiles, and
            explainable matching.
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
          <p className="sidebar-note-title">Current MVP slice</p>
          <p className="muted">
            Calm onboarding, profile editing, explainable matching, grounded chat, and
            basic safety tooling.
          </p>
        </div>

        <div className="sidebar-note stack-small sidebar-note-muted">
          <p className="sidebar-note-title">What this is not</p>
          <p className="muted">
            No swipe deck, no streaks, no fake percentages, and no pressure loops.
          </p>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
