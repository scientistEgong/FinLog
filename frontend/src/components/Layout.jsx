import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/transactions", label: "Transactions", icon: "🧾" },
  { to: "/budgets", label: "Budgets", icon: "🧮" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/loans", label: "Loans", icon: "🤝" },
  { to: "/reports", label: "Reports", icon: "📄" },
];

// Bottom bar on phones, left sidebar on larger screens (pure CSS, same markup).
export default function Layout({ children }) {
  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand">FinLog</div>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            <span className="nav-icon" aria-hidden="true">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="content">{children}</main>
    </div>
  );
}
