# FinLog interface, themes, and browser icon

This document describes the appearance system implemented on 2026-11-28 and the
steps for maintaining the browser tab icon. It records what exists in the
repository, not an aspiration.

## 1. Design direction

The interface follows the five FinLog concepts supplied in the design lab
(Compass, Harmattan, Ledgerline, Tape, Verdant) and keeps the previous layout as
a sixth option named **Classic**. The supplied prototypes showed a single
dashboard; FinLog applies each layout's structure and typography to all four
implemented pages (Dashboard, Transactions, Budgets, Analytics).

Three principles drive the layouts:

- **Numbers first.** The balance is the largest element on the dashboard and
  every amount uses tabular figures so columns align.
- **One accent per palette.** Green/black, deep blue, teal, graphite, or mint;
  amber is reserved for near-limit budgets and red for overspending.
- **Structure is separate from colour.** A reader can keep the Ledgerline
  structure with the Midnight Blue palette, or switch to a dark surface without
  changing layout.

The sample figures shown in the design lab were not copied into the app.
Balances, budgets, and charts continue to come from the API.

## 2. Appearance model

Appearance has three independent axes. The resolved values live on the `<html>`
element as `data-layout`, `data-palette`, and `data-mode`, and the unresolved
mode preference is kept in `data-mode-preference`.

| Axis | Options | Stored key |
|---|---|---|
| Layout | Verdant (default), Classic, Compass, Harmattan, Ledgerline, Tape | `finlog.layout` |
| Colour | Forest Ink (default), Midnight Blue, Harbor Teal, Graphite, Mint | `finlog.palette` |
| Mode | System (default), Light, Dark | `finlog.mode` |

Defaults are selected in `frontend/src/utils/theme.js`. Preferences are stored
in `localStorage` for this browser profile only. A small inline script in
`frontend/index.html` applies the stored values before first paint, so the
window never flashes the wrong theme while React mounts.

### How each layout differs

| Layout | Navigation | Typography | Signature treatment |
|---|---|---|---|
| Verdant | 210 px dark rail | Manrope-style headings, monospaced figures | Oversized balance and a coloured spine on every card |
| Classic | 228 px dark rail | System sans, proportional figures | Rounded cards and softer shadows |
| Compass | 92 px icon-less rail, stacked labels | System sans | Weekly budget ring beside the balance |
| Harmattan | Top bar | Serif headings | Deep ink header band with a curved lower edge |
| Ledgerline | Top bar | Serif headings, monospaced figures | Ruled-paper background, left margin rule, double-underlined balance, no boxes |
| Tape | Top bar | Monospaced figures | Recent transactions become a dashed receipt column |

On phones every layout uses the same bottom bar with Dashboard, Transactions,
Budgets, Analytics, and More. Loans and Reports stay in the More menu until
their phases exist.

### Colour and mode

Each palette defines light and dark surfaces, brand, brand-soft, income,
expense, warning, line, and hero tokens. Dark mode is a resolved value, not a
media query, so the CSS has one source of truth per palette and the controller
listens for operating-system changes while **System** is selected.

The brand mark never uses a light tile: `--logo-bg` stays a deep colour in every
palette and mode, while `--logo-accent` follows the palette. That keeps the icon
recognisable at 16 px in a browser tab.

## 3. Dashboard information architecture

The dashboard leads with decisions, not module names:

1. Hero: available balance, total wallet, opening balance, and period totals for
   income, spending, savings, and budget left.
2. Reporting-period controls.
3. "What is left this week" budget panel with per-category progress.
4. Period comparison, spending by category, and the trailing-year trend.
5. Recent transactions (a receipt column in Tape, a second column in Harmattan
   and Ledgerline, a full-width card otherwise).
6. Backend observations, then the opening-balance editor as a secondary setting.

Higher-traffic actions changed with this structure:

- The dashboard's "Add transaction" opens `Transactions` with the entry form
  already expanded (`?new=1`).
- The transaction form is now behind an explicit button rather than permanently
  occupying the page above the history.
- Dates in lists and period captions are human-readable (`27 Nov 2026`,
  `22–28 Nov 2026`). Stored and API dates remain ISO.

### Budget totals, precisely

The backend reports two separate figures and the interface shows both:

- `total_remaining_kobo` is the sum of unspent amounts per category (each
  category contributes `max(budget − actual, 0)`).
- `total_overspent_kobo` is the sum of amounts above allocation per category.

Because each side is clamped, a period can show money left and overspending at
the same time. The dashboard therefore says "Left in budget" and adds a line
naming how many categories are already over. The interface does not invent a net
figure, and it does not call a period over budget when only one category is.

## 4. Brand mark and icon system

The mark is three shapes: a rounded tile, an "F" built from three rectangles, and
a single accent dot. It is defined once as a React component
(`frontend/src/components/BrandMark.jsx`) and once as the vector master
(`frontend/public/favicon.svg`). Colours come from CSS tokens:

| Token | Role |
|---|---|
| `--logo-bg` | Tile background (deep ink per palette) |
| `--logo-glyph` | The F (white) |
| `--logo-accent` | The dot (palette accent) |

`frontend/index.html` sets `theme-color` and the controller updates it when the
palette changes, so the mobile browser chrome matches the active palette.

## 5. Browser tab icon

Files in `frontend/public/`:

| File | Purpose |
|---|---|
| `favicon.svg` | Vector master, used by modern browsers |
| `favicon-32.png`, `favicon-48.png` | Raster fallbacks for browsers or shells that ignore SVG |
| `apple-touch-icon.png` | 180 px home-screen icon for iOS and some Android launchers |
| `site.webmanifest` | Name, start URL, colours, and icon list for installable shells |

`frontend/index.html` links all four images and the manifest.

### How these files were produced

The committed PNGs were rasterised from the SVG master through a headless
browser at exactly 32, 48, and 180 CSS pixels, with a transparent page
background, so the rounded corners stay transparent. That is the same geometry
as the master; no separate artwork exists.

### How to regenerate the icon

1. Edit `frontend/public/favicon.svg`. Keep a square `viewBox` (`0 0 64 64`),
   solid fills, no linked fonts or external images, and check that the F and dot
   remain readable at 16 px.
2. Export the raster sizes from that same master with a vector editor. Inkscape
   example:

   ```powershell
   inkscape favicon.svg --export-type=png --export-filename=favicon-32.png -w 32 -h 32
   inkscape favicon.svg --export-type=png --export-filename=favicon-48.png -w 48 -h 48
   inkscape favicon.svg --export-type=png --export-filename=apple-touch-icon.png -w 180 -h 180
   ```

   In Figma, select the frame and use Export with 32, 48, and 180 widths and PNG
   format. Keep the background transparent outside the rounded tile.
3. If you prefer no extra tooling, render the SVG at 100% in a temporary HTML
   file served by `npm run dev`, set the browser viewport to the target size,
   and capture a screenshot with a transparent background. That is how the
   current files were made.
4. Place the files in `frontend/public/`, keeping the existing names.
5. Run `npm run build` and open the built app. Browsers cache icons
   aggressively; hard-refresh or clear the site's cached icon if the old mark
   persists.

The manifest and `theme-color` do not need to change when only the artwork
changes. Update `site.webmanifest` if the icon sizes or start URL change.

## 6. Decisions and constraints

- **No new frontend dependency.** The system uses the existing React, Vite, and
  plain CSS stack, so no Tailwind or component framework was installed. This
  follows `AGENTS.md` (no new dependency without approval) and avoids rewriting
  every page's classes.
- **No remote fonts.** `SECURITY.md` prohibits third-party fonts without
  approval, so the layouts use local font stacks: the serif layouts fall back to
  Georgia/Palatino, and the numeral layouts fall back to Consolas/ui-monospace.
  The intended families (Fraunces, Manrope, IBM Plex Mono) are named first, so
  self-hosting them later changes nothing else. Do not add a Google Fonts link
  without approval.
- **Loans are not shown on the dashboard.** The prototype's "Who do I owe?"
  block needs the Phase 5 API; the dashboard omits it rather than showing zeros.
- **Emoji navigation icons were removed.** The prototypes use text labels and the
  emoji rendered differently on every operating system.
- **No financial arithmetic in React.** Monetary totals, remaining budget, and
  overspending all come from the API. The only browser-side arithmetic is the
  budget gauge percentage and bar widths for presentation.

## 7. Accessibility and responsive rules

- 42–44 px minimum control sizes and a visible `:focus-visible` ring.
- A skip link jumps to `#main-content`.
- The appearance panel is a labelled dialog: Escape closes it, outside clicks
  close it, and focus returns to the button that opened it. All choices are
  buttons with `aria-pressed`.
- Charts offer a "View as table" alternative, axis and legend text follow the
  theme, and amounts use tabular figures.
- Wide tables become cards below 640 px; the two-column dashboard collapses
  below 1100 px; every layout uses the bottom bar below 900 px.
- Measured at 390 px: document width 375 px, so no horizontal scrolling.

## 8. File map for appearance work

| File | Responsibility |
|---|---|
| `frontend/src/utils/theme.js` | Layout, palette, and mode descriptors; defaults; storage; document attributes; theme colour |
| `frontend/src/components/AppearanceMenu.jsx` | Visual picker (layout cards, palette swatches, mode toggle) |
| `frontend/src/components/BrandMark.jsx` | Token-driven logo |
| `frontend/src/components/Layout.jsx` | Shell, navigation, appearance state, skip link |
| `frontend/src/components/DashboardHero.jsx` | Balance, period totals, weekly gauge |
| `frontend/src/components/DashboardBudgetPanel.jsx` | Weekly budget rows and totals |
| `frontend/src/hooks/useWeeklyBudget.js` | Loads the current canonical week's budget snapshot |
| `frontend/src/styles/tokens.css` | Palette, mode, layout, typography, and logo tokens |
| `frontend/src/styles/base.css` | Elements, cards, controls, tables, charts, appearance panel |
| `frontend/src/styles/layouts.css` | Shell, six layout treatments, phone behaviour |
| `frontend/src/styles/main.css` | Layer imports and page composition |
| `frontend/public/*` | Icon masters, PNG sizes, manifest |

## 9. Dependencies and local setup

No package was added for this work. From `frontend`:

```powershell
npm ci
npm run dev
npm run build
```

## 10. Known limitations

- Interactive behaviour was checked in Chromium headless at 1440×1000 and
  390×844. Firefox, Safari, physical phones, and screen readers were not tested.
- The appearance matrix is large (six layouts × five palettes × two resolved
  modes). Individual contrast pairs were not measured with a contrast tool.
- Self-hosted display fonts would sharpen the Harmattan, Ledgerline, and Tape
  character but need a licensing and security decision first.
- The Analytics page still presents eleven chart cards in one scroll; a
  sectioned or tabbed arrangement remains a design follow-up.
