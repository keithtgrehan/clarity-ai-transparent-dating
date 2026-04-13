import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview", hint: "Product position and waitlist" },
  { to: "/onboarding", label: "Onboarding", hint: "Build a clear starting point" },
  { to: "/profile", label: "Profile", hint: "Review what others will read" },
  { to: "/matches", label: "Matches", hint: "See fit, friction, and next steps" },
  { to: "/chat", label: "Chat", hint: "Keep first conversations grounded" },
  { to: "/safety", label: "Safety", hint: "Report and block clearly" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block stack-small">
          <p className="eyebrow">Clarity-first dating</p>
          <h1>Clarity.ai</h1>
          <p className="sidebar-lead">
            A quieter way to meet people when ambiguity, pressure, and shallow matching have
            started to feel expensive.
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
            Structured profiles, explainable matches, grounded chat, and a serious safety path.
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
        <Outlet />
      </main>
    </div>
  );
}
