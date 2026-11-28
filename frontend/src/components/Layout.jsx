// ============================================================
// 1. Load shell dependencies, navigation model, and appearance helpers
// ============================================================
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import AppearanceMenu from "./AppearanceMenu.jsx";
import BrandMark from "./BrandMark.jsx";
import {
  applyThemeToDocument,
  loadThemePreferences,
  saveThemePreferences,
  watchSystemMode,
} from "../utils/theme.js";

const PRIMARY_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/transactions", label: "Transactions" },
  { to: "/budgets", label: "Budgets" },
  { to: "/analytics", label: "Analytics" },
];

const SECONDARY_LINKS = [
  { to: "/loans", label: "Loans" },
  { to: "/reports", label: "Reports" },
];

function navLinkClassName({ isActive }, extraClasses = "") {
  return ["nav-link", extraClasses, isActive ? "active" : ""].filter(Boolean).join(" ");
}

// ============================================================
// 2. Render the responsive shell and appearance controls
// ============================================================
// One markup tree serves every layout: rail layouts put the navigation beside
// the page, top-navigation layouts put it above, and phones always get a
// bottom bar. Layout, colour and mode live on <html> so CSS owns appearance.
export default function Layout({ children }) {
  const [theme, setTheme] = useState(loadThemePreferences);
  const [moreOpen, setMoreOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceTrigger = useRef(null);

  useEffect(() => {
    applyThemeToDocument(theme);
    saveThemePreferences(theme);
  }, [theme]);

  useEffect(() => {
    if (theme.mode !== "system") return undefined;
    // Follow operating-system changes while "System" is selected.
    return watchSystemMode(() => applyThemeToDocument(theme));
  }, [theme]);

  function openAppearance(trigger) {
    appearanceTrigger.current = trigger || null;
    setMoreOpen(false);
    setAppearanceOpen(true);
  }

  function closeAppearance() {
    setAppearanceOpen(false);
    if (appearanceTrigger.current) appearanceTrigger.current.focus();
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <nav className="nav" aria-label="Main">
        <div className="nav-brand">
          <BrandMark showWordmark decorative />
        </div>

        {PRIMARY_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={(state) => navLinkClassName(state)}
            onClick={() => setMoreOpen(false)}
          >
            {link.label}
          </NavLink>
        ))}

        <div className="nav-secondary">
          {SECONDARY_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={(state) => navLinkClassName(state)}>
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-more">
          <button
            type="button"
            className="nav-more-button"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => setMoreOpen((open) => !open)}
          >
            More
          </button>
          {moreOpen && (
            <div className="nav-more-menu">
              {SECONDARY_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setMoreOpen(false)}>
                  {link.label}
                </NavLink>
              ))}
              <button type="button" onClick={(event) => openAppearance(event.currentTarget)}>
                Appearance
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="nav-appearance"
          aria-haspopup="dialog"
          aria-expanded={appearanceOpen}
          onClick={(event) => openAppearance(event.currentTarget)}
        >
          Appearance
        </button>
      </nav>

      {appearanceOpen && (
        <AppearanceMenu theme={theme} onChange={setTheme} onClose={closeAppearance} />
      )}

      <div className="app-frame">
        <header className="app-header">
          <BrandMark showWordmark decorative />
          <button
            type="button"
            className="app-header-action"
            aria-haspopup="dialog"
            aria-expanded={appearanceOpen}
            onClick={(event) => openAppearance(event.currentTarget)}
          >
            Appearance
          </button>
        </header>
        <main id="main-content" className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
