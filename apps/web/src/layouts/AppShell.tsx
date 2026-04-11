import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/onboarding", label: "Onboarding" },
  { to: "/profile", label: "Profile" },
  { to: "/matches", label: "Matches" },
  { to: "/chat", label: "Chat" },
  { to: "/safety", label: "Safety" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block stack-small">
          <p className="eyebrow">Clarity-first dating MVP</p>
          <h1>Clarity.ai</h1>
          <p className="muted">
            Structured onboarding, structured profiles, and explainable matching without
            swipe loops.
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
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <p className="sidebar-note-title">What this demo proves</p>
          <p className="muted">
            You can onboard, save a profile, view seeded matches, open a conversation, send
            a message, and report a user from one calm local flow.
          </p>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
