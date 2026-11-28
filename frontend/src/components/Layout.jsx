import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

const STORAGE_KEYS = {
  palette: "finlog.palette",
  mode: "finlog.mode",
};

const PALETTES = [
  { value: "forest", label: "Forest Ink" },
  { value: "midnight", label: "Midnight Blue" },
  { value: "harbor", label: "Harbor Teal" },
];

const THEME_MODES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function readPreference(key, allowedValues, defaultValue) {
  try {
    const savedValue = window.localStorage.getItem(key);
    return allowedValues.includes(savedValue) ? savedValue : defaultValue;
  } catch {
    return defaultValue;
  }
}

// 1. Keep destinations in one list so desktop and phone navigation stay aligned.
const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/transactions", label: "Transactions", icon: "🧾" },
  { to: "/budgets", label: "Budgets", icon: "🧮" },
  { to: "/analytics", label: "Analytics", icon: "📊" },
  { to: "/loans", label: "Loans", icon: "🤝" },
  { to: "/reports", label: "Reports", icon: "📄" },
];

// Bottom bar on phones, left sidebar on larger screens (pure CSS, same markup).
// 2. Render the shared responsive shell around the selected page.
export default function Layout({ children }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [palette, setPalette] = useState(() => readPreference(
    STORAGE_KEYS.palette,
    PALETTES.map((option) => option.value),
    "forest",
  ));
  const [mode, setMode] = useState(() => readPreference(
    STORAGE_KEYS.mode,
    THEME_MODES.map((option) => option.value),
    "system",
  ));

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    document.documentElement.dataset.mode = mode;

    try {
      window.localStorage.setItem(STORAGE_KEYS.palette, palette);
      window.localStorage.setItem(STORAGE_KEYS.mode, mode);
    } catch {
      // Theme controls still work for this session when storage is unavailable.
    }
  }, [mode, palette]);

  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="brand">
          <svg className="brand-mark" viewBox="0 0 30 30" role="img" aria-label="FinLog icon">
            <rect width="30" height="30" rx="7" />
            <path d="M9 7h3v16H9zM9 7h12v3H9zM9 12.5h9v3H9z" />
            <circle cx="21" cy="21" r="2.4" />
          </svg>
          <span>FinLog</span>
        </div>
        {LINKS.map((link, index) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => [
            "nav-link",
            index < 4 ? "nav-primary" : "nav-secondary",
            isActive ? "active" : "",
          ].filter(Boolean).join(" ")}>
            <span className="nav-icon" aria-hidden="true">{link.icon}</span>
            <span className="nav-label">{link.label}</span>
          </NavLink>
        ))}
        <div className="nav-more">
          <button
            type="button"
            className="nav-more-button"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <span className="nav-icon" aria-hidden="true">•••</span>
            <span className="nav-label">More</span>
          </button>
          {moreOpen && (
            <div className="nav-more-menu">
              {LINKS.slice(4).map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setMoreOpen(false)}>
                  <span aria-hidden="true">{link.icon}</span> {link.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>
      <div className="main-shell">
        <header className="app-header">
          <div className="mobile-brand" aria-label="FinLog">
            <svg className="brand-mark" viewBox="0 0 30 30" aria-hidden="true">
              <rect width="30" height="30" rx="7" />
              <path d="M9 7h3v16H9zM9 7h12v3H9zM9 12.5h9v3H9z" />
              <circle cx="21" cy="21" r="2.4" />
            </svg>
            <span>FinLog</span>
          </div>
          <div className="theme-controls" aria-label="Appearance settings">
            <label className="theme-field">
              <span>Colour</span>
              <select value={palette} onChange={(event) => setPalette(event.target.value)}>
                {PALETTES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="theme-field">
              <span>Mode</span>
              <select value={mode} onChange={(event) => setMode(event.target.value)}>
                {THEME_MODES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
