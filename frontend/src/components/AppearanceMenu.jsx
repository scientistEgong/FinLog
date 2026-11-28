// ============================================================
// 1. Load theme descriptors and panel dependencies
// ============================================================
import { useEffect, useRef } from "react";
import {
  DEFAULT_THEME,
  LAYOUT_OPTIONS,
  MODE_OPTIONS,
  PALETTE_OPTIONS,
} from "../utils/theme.js";

// ============================================================
// 2. Present layout, colour and mode as visual choices
// ============================================================
// The panel is a non-modal dialog: it closes on Escape or an outside click and
// the caller restores focus to whichever button opened it.
export default function AppearanceMenu({ theme, onChange, onClose }) {
  const panelRef = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }

    function handlePointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    }

    // Register the outside-click listener after the opening click finishes,
    // otherwise the panel closes in the same gesture that opened it.
    const timerId = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timerId);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="appearance-panel"
      role="dialog"
      aria-labelledby="appearance-title"
      ref={panelRef}
    >
      <div className="appearance-head">
        <h2 id="appearance-title">Appearance</h2>
        <button type="button" className="secondary small-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="appearance-note muted small">
        Saved on this device. Layout, colour and mode are independent.
      </p>

      <fieldset className="appearance-group">
        <legend>Layout</legend>
        <div className="appearance-layout-grid">
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`layout-option${theme.layout === option.value ? " is-active" : ""}`}
              aria-pressed={theme.layout === option.value}
              onClick={() => onChange({ ...theme, layout: option.value })}
            >
              <span className={`layout-swatch swatch-${option.value}`} aria-hidden="true" />
              <span className="layout-option-text">
                <strong>{option.label}</strong>
                <small>{option.summary}</small>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="appearance-group">
        <legend>Colour</legend>
        <div className="appearance-palette-grid">
          {PALETTE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`palette-option${theme.palette === option.value ? " is-active" : ""}`}
              aria-pressed={theme.palette === option.value}
              onClick={() => onChange({ ...theme, palette: option.value })}
            >
              <span className="palette-swatches" aria-hidden="true">
                {option.swatches.map((colour) => (
                  <i key={colour} style={{ background: colour }} />
                ))}
              </span>
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="appearance-group">
        <legend>Mode</legend>
        <div className="segmented appearance-mode-toggle">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={theme.mode === option.value ? "seg active" : "seg"}
              aria-pressed={theme.mode === option.value}
              onClick={() => onChange({ ...theme, mode: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="appearance-actions">
        <button type="button" className="secondary" onClick={() => onChange({ ...DEFAULT_THEME })}>
          Reset appearance
        </button>
      </div>
    </div>
  );
}
