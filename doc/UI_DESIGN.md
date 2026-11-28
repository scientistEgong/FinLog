# FinLog UI design and browser icon

## Design direction

The frontend uses the existing React and Vite application structure and its API-backed pages. The design follows the supplied FinLog concepts with a deep navigation rail, calm surfaces, clear account summaries, readable chart cards, and a compact phone navigation bar. The FinLog mark from the supplied design is used in the navigation and as the browser tab icon.

The sample designs include example financial records. Those examples are not copied into FinLog: balances, transactions, budgets, and charts continue to come from the application API.

### Appearance controls

The header offers three colour palettes and three appearance modes. The selection is stored in browser local storage for this device and browser profile.

| Palette | Main accent | Character |
|---|---|---|
| Forest Ink | Green | The default FinLog palette, with a dark green navigation rail. |
| Midnight Blue | Blue | A cooler blue accent with the same layout and contrast. |
| Harbor Teal | Teal | A quieter teal accent with the same layout and contrast. |

Appearance modes are **System**, **Light**, and **Dark**. System follows the operating system preference. No remote fonts, CSS framework, or additional frontend package is required; the interface uses local system font stacks.

## Browser tab icon

The app uses `frontend/finlog-icon.svg` as a scalable favicon. SVG keeps the mark crisp at small tab sizes and avoids adding an image-generation dependency. The shape follows the FinLog mark in the supplied UI prototype.

To make a revised icon from the approved FinLog logo:

1. Open the original logo in a vector editor such as Inkscape, Figma, or Illustrator. If the source is only a raster image, import it and trace/recreate the mark as vector paths.
2. Keep the design simple: a square canvas, the brand background, and the central mark. Check that strokes and counters remain visible at 16 by 16 pixels.
3. Export a clean SVG with a `viewBox` (the current file uses `0 0 64 64`) and no linked fonts, external images, scripts, or editor-specific effects.
4. Replace `frontend/finlog-icon.svg`, preserving the `viewBox` and using solid fills for broad browser support. The HTML already links to this file.
5. Run `npm run build` from `frontend`, open the built site, and check the favicon at normal and high-DPI browser tab sizes. Browsers cache favicons aggressively; after a replacement, hard-refresh or clear the site's cached icon if the old one remains.

For a browser or distribution channel that does not support SVG favicons, export 32 by 32 and 48 by 48 PNG versions from the same vector master and add `<link rel="icon" type="image/png" sizes="32x32" href="...">` entries in `frontend/index.html`. Keep the SVG master as the source of truth.

## Dependencies and local setup

No design dependency was added. Existing CSS custom properties cover the palette and dark-mode variants, so Tailwind or a component framework would add setup and maintenance without solving a current gap.

From a terminal in `frontend`, install the existing lockfile dependencies with:

```powershell
npm ci
```

Start the app with `npm run dev` or create a production build with `npm run build`.
