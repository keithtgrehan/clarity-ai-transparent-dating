import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Landing" },
  { to: "/onboarding", label: "Onboarding" },
  { to: "/profile", label: "Profile" },
  { to: "/matches", label: "Matches" },
  { to: "/chat", label: "Chat" },
  { to: "/settings", label: "Settings" },
  { to: "/safety", label: "Safety" }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">Berlin-first dating foundation</p>
          <h1>Project A-Z</h1>
          <p className="muted">Calm, explicit, neurodivergent-first.</p>
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
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
