// ============================================================
// 1. Define the three appearance axes and their descriptors
// ============================================================
// Layout controls page structure and typography; palette controls colour;
// mode controls light or dark surfaces. They are independent on purpose so a
// reader can keep the ledger structure with the blue palette, for example.

export const LAYOUT_OPTIONS = [
  {
    value: "verdant",
    label: "Verdant",
    summary: "Dark sidebar, oversized balance.",
  },
  {
    value: "classic",
    label: "Classic",
    summary: "Wide rail, soft cards.",
  },
  {
    value: "compass",
    label: "Compass",
    summary: "Slim rail, weekly gauge.",
  },
  {
    value: "harmattan",
    label: "Harmattan",
    summary: "Dark curved header band.",
  },
  {
    value: "ledgerline",
    label: "Ledgerline",
    summary: "Ruled page, margin rule.",
  },
  {
    value: "tape",
    label: "Tape",
    summary: "Receipt column for history.",
  },
];

export const PALETTE_OPTIONS = [
  {
    value: "forest",
    label: "Forest Ink",
    swatches: ["#0b1f1a", "#1f7a5a", "#e6f2ec"],
  },
  {
    value: "midnight",
    label: "Midnight Blue",
    swatches: ["#0b1b33", "#2457a6", "#e8eef8"],
  },
  {
    value: "harbor",
    label: "Harbor Teal",
    swatches: ["#0a2a2e", "#0f766e", "#e2f3f1"],
  },
  {
    value: "graphite",
    label: "Graphite",
    swatches: ["#1a211e", "#4f6157", "#ecefed"],
  },
  {
    value: "mint",
    label: "Mint",
    swatches: ["#0b2b22", "#13926a", "#e3f5ee"],
  },
];

export const MODE_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export const DEFAULT_THEME = Object.freeze({
  layout: "verdant",
  palette: "forest",
  mode: "system",
});

// Browser chrome colour per palette. The mark stays dark in every palette so
// it keeps the same weight against a light or dark page.
const THEME_COLOR_BY_PALETTE = {
  forest: "#0b1f1a",
  midnight: "#0b1b33",
  harbor: "#0a2528",
  graphite: "#1a211e",
  mint: "#0b2b22",
};

const STORAGE_KEYS = {
  layout: "finlog.layout",
  palette: "finlog.palette",
  mode: "finlog.mode",
};

// ============================================================
// 2. Read, store, and resolve the visitor's choices
// ============================================================
function readStoredChoice(key, allowedValues, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return allowedValues.includes(storedValue) ? storedValue : fallback;
  } catch {
    // Private browsing or blocked storage should not break the interface.
    return fallback;
  }
}

export function loadThemePreferences() {
  return {
    layout: readStoredChoice(
      STORAGE_KEYS.layout,
      LAYOUT_OPTIONS.map((option) => option.value),
      DEFAULT_THEME.layout,
    ),
    palette: readStoredChoice(
      STORAGE_KEYS.palette,
      PALETTE_OPTIONS.map((option) => option.value),
      DEFAULT_THEME.palette,
    ),
    mode: readStoredChoice(
      STORAGE_KEYS.mode,
      MODE_OPTIONS.map((option) => option.value),
      DEFAULT_THEME.mode,
    ),
  };
}

export function saveThemePreferences(theme) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.layout, theme.layout);
    window.localStorage.setItem(STORAGE_KEYS.palette, theme.palette);
    window.localStorage.setItem(STORAGE_KEYS.mode, theme.mode);
  } catch {
    // The controls still apply for this session when storage is unavailable.
  }
}

function prefersDark() {
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

export function resolveMode(preference) {
  if (preference === "system") return prefersDark() ? "dark" : "light";
  return preference;
}

// ============================================================
// 3. Apply the resolved theme to the document
// ============================================================
// CSS keys off data-layout, data-palette and the resolved data-mode. The
// unresolved preference is kept in data-mode-preference so the UI can show
// "System" while the surface is already light or dark.
export function applyThemeToDocument(theme) {
  const root = document.documentElement;
  root.dataset.layout = theme.layout;
  root.dataset.palette = theme.palette;
  root.dataset.mode = resolveMode(theme.mode);
  root.dataset.modePreference = theme.mode;

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", THEME_COLOR_BY_PALETTE[theme.palette] || THEME_COLOR_BY_PALETTE.forest);
  }
}

export function watchSystemMode(onChange) {
  if (!window.matchMedia) return () => {};
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  darkQuery.addEventListener("change", onChange);
  return () => darkQuery.removeEventListener("change", onChange);
}
