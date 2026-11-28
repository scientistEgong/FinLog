// ============================================================
// 1. Render the FinLog mark from theme tokens
// ============================================================
// The tile, glyph and accent dot are coloured by --logo-* tokens, so the mark
// follows the active palette and light/dark mode instead of being hardcoded.
export default function BrandMark({ className = "", showWordmark = false, decorative = false }) {
  const accessibilityProps = decorative
    ? { "aria-hidden": "true" }
    : { role: "img", "aria-label": "FinLog" };

  return (
    <span className={["brand-lockup", className].filter(Boolean).join(" ")}>
      <svg className="brand-mark" viewBox="0 0 30 30" {...accessibilityProps}>
        <rect className="brand-mark-tile" width="30" height="30" rx="7" />
        <path className="brand-mark-glyph" d="M9 7h3v16H9zM9 7h12v3H9zM9 12.5h9v3H9z" />
        <circle className="brand-mark-dot" cx="21" cy="21" r="2.4" />
      </svg>
      {showWordmark && <span className="brand-wordmark">FinLog</span>}
    </span>
  );
}
