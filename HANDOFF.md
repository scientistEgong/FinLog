# FinLog — Project Handoff

> This is a working handoff, not a substitute for inspecting the repository. Some status notes below are historical reports from earlier development sessions. Verify the current files and runtime before acting on them.

## 1. Product summary

FinLog is a personal finance tracker intended first for local use on a Windows laptop. The longer-term direction is a web-first React application that may later be wrapped for Android using Capacitor.

The application should help the user record and understand personal income, expenditure, savings, budgets, loans, and repayments.

### Current scope exclusions

Do not introduce these unless the developer explicitly approves:
- premium tiers or payments;
- voice features;
- AI assistant;
- login/authentication or user accounts;
- cloud deployment or synchronisation;
- unrelated integrations.

Default currency: NGN, displayed in a form such as `₦15,000.00`.

## 2. Intended stack

- Frontend: React + Vite.
- Backend: FastAPI.
- ORM: SQLAlchemy 2.0.
- Database: SQLite for the current local-first stage.
- Frontend dev server: port 5173.
- Backend dev server: port 8000.
- Vite `/api` proxy target: `127.0.0.1:8000`.

Intended request flow:

`React/Vite → FastAPI → SQLAlchemy → SQLite`

## 3. Locked architecture

The established backend dependency direction is:

`routers → services → repositories → database`

- Routers handle HTTP concerns.
- Schemas define request and response validation.
- Services own business rules, calculations, and application validation.
- Repositories are the only layer that performs database queries.
- Models define persistence structure.
- Configuration and database setup remain in their established modules.

The frontend displays data received from the API. It must not own authoritative financial calculations or hardcode financial totals.

Do not change the folder structure or introduce additional layers without explicit approval.

## 4. Known intended project structure

The intended structure was:

```text
FinLog/
├── run_finlog.bat
├── README.md
├── HANDOFF.md
├── .gitignore
├── .venv/                         # Python virtual environment at project root
├── data/
│   ├── finlog.db                  # Local database; never commit
│   └── backups/                   # Local backups; never commit
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── routers/
│   │   ├── exports/
│   │   └── migrations/
│   └── test/
└── frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api/
        ├── pages/
        ├── components/
        ├── hooks/
        ├── utils/
        └── styles/
```

This is an intended structure, not proof that every listed file or directory currently exists. The actual test directory is `backend/test/`. Inspect the actual repository before creating, moving, or deleting anything.

Known decisions:
- Python virtual environment is at the repository root.
- No backend `utils/` directory was approved.
- Money and date helpers were intended to live in `backend/app/services/money.py` and `backend/app/services/dates.py`.
- `init_db()` and `seed_default_categories()` were intended to live in `database.py`.
- Do not create `init_db.py` or `pytest.ini` unless the developer approves a reasoned change.

## 5. Financial business rules

### Money representation

- Store money as integer kobo.
- Client sends `amount` as a naira string.
- API responses use `amount_kobo`, `amount_input`, and `amount_display` where appropriate.
- Reject more than two decimal places; do not silently round.
- Documented maximum: NGN 1 trillion.

### Transactions and savings

Types are `income` and `expense`.

A category marked `is_savings=True` represents savings. Expenses assigned to savings categories are separated from ordinary expenditure.

Agreed calculation:

```text
total_expenditure = expenses excluding savings-category expenses
total_savings = expenses assigned to savings categories
available_balance = opening_balance + income - total_expenditure - total_savings
total_wallet = available_balance + total_savings
```

Do not change this model without discussing it with the developer.

### Opening balance

- Stored as `opening_balance_kobo`.
- Defaults to zero if absent.
- Is not an income transaction.
- API: `GET` and `PUT /api/settings/opening-balance`.
- The opening-balance editor was moved from Transactions to the Dashboard in Phase 3.

### Loans

- Creating a loan does not create a transaction.
- Outstanding = principal + flat interest amount − repayments.
- Outstanding is derived, not stored as a separately maintained balance.

### Budgets and periods

- Budgets are not expenditure.
- Weekly/monthly budget totals sum category rows.
- Weeks run Sunday through Saturday.
- Monthly periods start on the first day of the month.

### Categories

- Default categories cannot be deleted.
- Categories in use cannot be deleted.

## 6. Known Phase 2 API contract

The following endpoints were recorded as implemented in the earlier handoff. Verify the current routers and schemas before relying on this list.

- `GET /api/health`
- `GET /api/transactions?date_from&date_to&type&category_id&q&limit&offset`
  - `limit`: 1–200, default 25.
- `POST /api/transactions` — expected 201.
- `GET /api/transactions/{id}`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}` — expected 204.
- `GET /api/categories`
- `POST /api/categories`
- `DELETE /api/categories/{id}` — expected 409 when default or in use.
- `GET /api/settings/opening-balance`
- `PUT /api/settings/opening-balance`

Recorded error conventions:
- 404 and 409 use a `detail` message.
- 422 is used for request validation errors.

Do not change an API contract without checking frontend callers and obtaining approval for material changes.

## 7. Phase status — historical, verify locally

### Phase 1: Foundation

Earlier reports indicated:
- Python compilation checks passed.
- 17 standard-library tests passed for money/date/validation/environment loading.
- SQLite constraint semantics were checked using raw SQLite.
- SQLAlchemy models, `init_db()`, FastAPI startup, database tests, and launcher were not verified in the earlier sandbox because dependencies were unavailable.
- The developer later reported opening the database in SQLite Browser and inspecting tables/columns.

These are historical statements. Re-run the relevant checks in the current local environment.

### Phase 2: Transactions, categories, opening balance, frontend foundation

Earlier reports indicated the implementation had been written:
- transaction API and validation;
- categories API;
- opening-balance API;
- React/Vite scaffold;
- responsive layout/navigation;
- transaction form and history;
- filters/search/pagination;
- edit/delete flows.

Earlier sandbox verification was limited:
- selected frontend JavaScript syntax and helper behaviour were checked with mocked fetch;
- FastAPI/SQLAlchemy execution and tests were not run;
- JSX/Vite build and dev server were not run;
- `run_finlog.bat` was not verified end-to-end.

**Historical status at the time:** Phase 2 implementation was reported as written, but execution verification remained outstanding. The full backend suite has since passed during Phase 3 verification; see the current Phase 3 record below.

### Phase 3: Dashboard and budgets

**Implemented 2026-11-26:** Added `GET /api/dashboard` for the all-time summary. It returns opening balance, income, non-savings expenditure, savings, available balance, and total wallet as integer-kobo and display fields. Dashboard balance formulas remain in `dashboard_service.py`; repository aggregation is in `dashboard_repository.py`.

Added `GET /api/budgets?period_type=week|month&period_start=YYYY-MM-DD`, `POST /api/budgets`, `PUT /api/budgets/{id}`, and `DELETE /api/budgets/{id}`. Budget inputs use a naira `amount` string, non-negative amount validation, category existence validation, Sunday weekly starts, first-of-month monthly starts, and conflict responses for duplicate category/period allocations. Budget totals are sums of allocation rows and are not joined into dashboard expenditure calculations.

The React Dashboard displays API-provided all-time metrics and now owns the opening-balance editor; `/` redirects to `/dashboard`. The Budgets page provides week/month selection, a calendar date input, category budget CRUD, and the backend-provided period total. The selected calendar date is mapped to a canonical period start in the existing frontend date utility.

**Verification:** `python -m pytest test --basetemp=.pytest_cache\phase3-final` from `backend` passed 55 tests on 2026-11-26. `npm.cmd run build` from `frontend` passed. Four Node assertions checked period-start conversion. Headless Chrome screenshots were captured at 390×844 and 1440×1000 using a temporary Vite config and backend on port 8001 with a disposable SQLite database and synthetic records. The 390px document width and main budget component bounds were checked through Chrome DevTools Protocol. The existing `data/finlog.db` was not used or changed.

**Not verified:** Budget create/edit/delete and opening-balance save/refetch have API test coverage, but those interactions were not manually clicked through in a browser. No automated frontend interaction test framework is configured.

## 8. Roadmap

The current planned sequence is:

1. Foundation.
2. Transactions, categories, opening balance, and frontend foundation.
3. Dashboard and budgets.
4. Analytics.
5. Loans and repayments.
6. Exports.
7. Migrations, security, backups, and quality assurance.
8. Release readiness and future Android preparation.

### Phase 4: Analytics

**Implemented:** Added `GET /api/analytics?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&group_by=week|month|year`. The repository filters and groups transaction rows; the service builds canonical Sunday-start, first-of-month, and calendar-year periods and computes category, trend, and weekday aggregates. Amount totals remain integer kobo. Average amounts use Decimal values because a statistical mean can be fractional in kobo. The API preserves the existing savings rule: savings-category expenses are reported separately and excluded from ordinary expenditure.

The response powers eight charts: (1) period income, ordinary expenditure, and savings; (2) change in available balance excluding opening balance; (3) highest spending categories; (4) trends for the five largest spending categories; (5) savings contributions by period; (6) income sources by category; (7) average ordinary spending per weekday occurrence; and (8) ordinary expense count versus average expense size. Every chart uses the selected exact date range; trend charts use the selected weekly, monthly, or yearly grouping. Recharts is lazy-loaded with the Analytics route so its bundle does not inflate the initial app load.

**Chart presentation update:** Analytics time-series views use line charts, category/income segmentation uses horizontal bars, and chart gridlines are removed. The Dashboard also shows a line chart for ordinary expenditure over the trailing 12 months, with a weekly/monthly selector. The analytics service returns the highest-spending period for that range so the Dashboard can label and highlight the peak without calculating financial results in React.

**Verification:** The backend application imported and OpenAPI showed required `date_from`/`date_to`, optional `group_by`, and the nullable highest-spending-period response. The Stage 4 note below records the current tests, frontend build, and browser checks.

**Dependency review:** Recharts 3.11.1 was added. `npm audit` reports four issues in existing Vite/esbuild and React Router dependency lines (three moderate, one high); Recharts was not listed among the affected packages. Those existing dependencies were not upgraded as part of this feature.

See `PROJECT_CHECKLIST.md` for detailed items.

### Dashboard and analytics enhancement — Stage 4 (approved 2026-11-26)

**Implemented:** `GET /api/analytics` now populates the savings-rate trend, category percentages, top individual expenses, and budget-versus-actual data that the schema already declared. `AnalyticsRepository.list_budget_allocations` supplies budget rows, and `AnalyticsService` keeps all aggregation in integer kobo, uses Decimal for fractional averages, and preserves the savings-category exclusion rule.

The Analytics page defaults to the shared `this-month` preset, uses `REPORTING_PRESETS` with the Dashboard, and renders the three new views through `frontend/src/components/AnalyticsCharts.jsx`: savings rate, budget comparison, and largest individual expenses. Top-expense detail links open `Transactions` with `?id=<transaction_id>`, and `Transactions.jsx` loads that exact record through the existing transaction-by-ID endpoint. No new dependency, database schema, route, folder, or architectural layer was introduced.

**Important decisions:** Savings rate is `(Income - Ordinary Expenditure - Savings Contributions) / Income × 100` and is unavailable when income is zero. Budget comparison only includes complete canonical weekly or monthly periods inside the selected range; yearly grouping returns no comparisons and shows a clear explanatory message. Comparisons include budget allocations and ordinary-spending categories; a category with spending but no allocation is shown with a zero budget and utilization, and a negative remaining amount to flag the missing budget.

Each budget comparison now returns `remaining_kobo` and `remaining_display`, calculated as the category budget less its ordinary expenditure in that period. A positive value is shown as remaining funds; a negative value is shown as the amount over budget. Existing signed `variance_*` fields remain available for compatibility. Savings-category expenses are excluded from this comparison.

**Verified 2026-11-26:** From `backend`, `..\.venv\Scripts\python.exe -m pytest test\test_analytics.py -q` passed 6 tests. From `backend`, `..\.venv\Scripts\python.exe -m pytest test -q` passed 66 tests, 21 subtests, with Starlette `httpx` deprecation and pytest cache permission warnings. From `frontend`, `npm.cmd run build` passed in 14.31s after the final preset change. A headless Chrome 1440x1000 DOM render at `http://127.0.0.1:5174/analytics` confirmed the new chart sections and budget rows using a disposable SQLite database on temporary ports 8001 and 5174. Temporary servers, config, database, seed script, screenshots, and browser profiles were removed; the real `data/finlog.db` was not used.

**Budget remaining update verified 2026-11-26:** The analytics tests again passed 6 cases, the full backend suite passed 66 tests and 21 subtests, and `npm.cmd run build` passed after adding `remaining_kobo` and `remaining_display`. Tests confirm both unused budget remaining and negative over-budget balances. The temporary browser-render flow was not rerun for this UI wording update; no temporary analytics server was listening and the temporary Vite config was absent.

**Missing-budget visibility update 2026-11-27:** Budget comparisons now also include ordinary-spending categories without an allocation, using zero budget and utilization so the chart shows the amount spent and negative remaining balance. The detail row labels these as “Budget needed.” This update has not been separately verified.

**Not verified:** Phone/desktop screenshots were captured, but screenshots were not visually inspected; tooltip interaction, preset click-through, and end-to-end browser workflows were not manually exercised. Claims above are limited to the tests and DOM/build checks actually run.

### Dashboard enhancement — Stage 3 (approved 2026-11-26)

**Implemented:** `GET /api/dashboard` now accepts optional `date_from` and `date_to` query parameters. Existing all-time response fields are unchanged. When a complete range is supplied, the response adds a `period` object containing range-filtered income, ordinary expenditure, savings, available change, savings rate (null when income is zero), ranked ordinary-spending categories with percentage of period expenditure, and backend-generated factual observations. Incomplete or reversed ranges return 422.

The React Dashboard now provides preset and custom reporting periods, separates all-time position cards from period activity cards, shows an income/expenditure/savings/retained comparison chart, shows a compact spending-by-category chart with an Analytics link, lists backend observations, and shows the five most recent transactions. Existing Recharts is reused and lazy-loaded; no new dependency, schema, or folder structure was introduced.

**Verification:** `..\.venv\Scripts\python.exe -m pytest test\test_dashboard.py -q` from `backend` passed 8 tests. The full backend suite passed 60 tests and 21 subtests. `npm.cmd run build` from `frontend` passed. Tests used temporary databases only; `data/finlog.db` was not used.

**Not verified:** Browser interaction, chart tooltips, and phone/desktop layout have not been manually inspected. Stage 4 is implemented and tested separately above.

Do not start a later phase merely because it appears in the roadmap. The developer approves the next task.

### Stabilisation pass — approved budget corrections (2026-11-27)

**Implemented:** The Budgets API and Analytics now use the same backend category comparison calculation. The Budgets page reports allocation, ordinary spending, remaining funds, and overspent amounts per category and in total. The selected partial current period is marked “So far”; Analytics still compares only complete weekly/monthly periods. A zero or absent allocation is returned with `budget_status="budget_needed"` and `utilization_percent=null`, while actual spending and overspending remain visible. Existing savings-category budget rows remain stored and listed, are excluded from comparisons and totals, and savings categories are absent from the editor choices. Budget integrity errors become duplicate conflicts only for the period/category uniqueness constraint. Category deletion now catches the foreign-key failure raised by repository flush. Transaction ID links open a single-record view with a back action. Analytics/Budgets/recent-transaction errors have retry actions; all eleven Analytics chart cards have table views; phone navigation puts Loans and Reports under More; Analytics/transaction controls use compact phone layouts; the weekday chart title states that its average includes every calendar occurrence.

**Tests:** The full isolated backend suite passed 79 tests and 59 subtests on 2026-11-27. It passed with one Starlette/httpx deprecation warning. Coverage added or corrected for unbudgeted spending, zero budgets, empty-transaction budget visibility, savings exclusion, partial-period budgets, budget uniqueness error classification, and SQLAlchemy rollback collection checks. `npm.cmd run build` passed from `frontend`; `git diff --check` passed. No database schema or dependency changed.

**Phase 3–4 roadmap reconciliation:**

| Deliverable | Status | Evidence |
|---|---|---|
| Root route opens Dashboard | Done | `frontend/src/App.jsx` redirects `/` to `/dashboard`. |
| Calendar date picker for budget period | Done | `frontend/src/pages/Budgets.jsx` uses a date input and canonical period start. |
| Week/month budget toggle | Done | `frontend/src/pages/Budgets.jsx` period selector. |
| Opening-balance card on Dashboard | Done | `frontend/src/pages/Dashboard.jsx` renders `OpeningBalanceCard`. |
| Budget category breakdown with spent/remaining totals | Done in this pass | `frontend/src/pages/Budgets.jsx`; shared backend calculation in `backend/app/services/budget_service.py`; API tests in `backend/test/test_budgets.py`. |
| Six chart types required in the original specification | Partial | Budget-vs-actual horizontal bars exist. Monthly expenditure trend is available on the Dashboard but uses a line chart. Weekly spending comparison and income-vs-expenditure are represented by other chart forms. The category donut and debt summary are absent. See the requirement mapping below. |
| Exactly six Recharts charts in the current app | Missing | Current source renders eleven Analytics charts plus three Dashboard charts. This count does not match the specification’s six required chart types or the checklist’s historical eight-chart Analytics count. No charts were removed in this stabilization pass. |

The six specification chart types map to current source as follows: (1) category donut — missing; spending category bars exist instead (`Analytics.jsx`, Dashboard category component); (2) monthly expenditure trend — partial (`DashboardSpendingTrend.jsx`, line chart with period selector); (3) weekly spending comparison columns — partial (`Analytics.jsx`, weekly grouped period line chart rather than the specified comparison columns); (4) budget-versus-actual horizontal bars — present (`AnalyticsCharts.jsx`); (5) income-versus-expenditure grouped columns — partial (`Analytics.jsx`, the period cashflow view is a line chart and also includes savings); (6) outstanding debt summary — missing, deferred to Loans/Phase 5.

The eleven Analytics chart purposes are: period income/ordinary spending/savings; available-balance change; savings-rate trend; highest spending categories; spending by category over time; budget versus actual; largest individual expenses; savings contributions; income sources; average spending per calendar weekday occurrence; purchase frequency versus average expense size. The Dashboard adds three chart views: period income/spending/savings comparison, spending by category, and trailing-period spending trend.

**Phase 2 status:** Source-level Phase 2 backend/frontend implementation is present, the complete backend test suite passes, and the frontend production build passes. Manual browser CRUD/filter/pagination, persistence after restart, and local launcher behavior remain unverified; checklist implementation items are checked separately from those runtime verification items.

**Logging check:** No persisted server log handler or tracked `.log` file was found. The launcher starts Uvicorn in a console without redirecting output to a file. Search terms may be visible in console access logs, but this review found no configured persisted server log and made no logging changes.

**Runtime verification limitation and safety note:** A live check was attempted while port 8000 was already occupied. A temporary backend was launched with `FINLOG_DATABASE_URL` pointing to `C:\Users\Scientist\AppData\Local\Temp\FinLogRuntime_20261127.db`, but Windows reported multiple listeners on port 8000. Requests were sent to `127.0.0.1:8000` before the collision was understood; therefore it cannot be proven which listener handled them. The requests created and edited a synthetic transaction (then sent a delete request), attempted a duplicate weekly budget, and created/edited a November 2026 Transport monthly budget to ₦9,000. These may have reached the pre-existing local application and may have changed its database. No further requests were made; the temporary database and processes started by this pass were stopped/removed. The user should inspect the live application for the synthetic transaction description “Synthetic browser audit edited” and a November 2026 Transport monthly budget of ₦9,000 if those values were not already present. This audit did not read the real database. Phone screenshots and the requested interactive browser workflow were not completed because the ports were not safely isolated.

### UI redesign and appearance system — approved 2026-11-28

**Implemented:** The frontend now has three independent appearance axes: layout,
colour, and mode. Six layouts are available — Verdant (default), Classic,
Compass, Harmattan, Ledgerline, and Tape — with the previous interface preserved
as Classic. Five palettes are available (Forest Ink, Midnight Blue, Harbor Teal,
Graphite, Mint) and System/Light/Dark modes. Values resolve onto `<html>` as
`data-layout`, `data-palette`, `data-mode`, and the mode preference as
`data-mode-preference`; an inline script in `frontend/index.html` applies stored
values before first paint.

The two header dropdowns were replaced by a visual appearance panel with layout
schematic cards, palette swatches, and a mode segment control. The logo is now a
single token-driven `BrandMark` component; tile, glyph, and accent follow the
palette and mode, and `theme-color` tracks the palette.

Layout changes apply to all four pages. Dashboard order is now: balance hero and
period totals, reporting-period control, weekly budget panel, charts, recent
transactions, observations, opening-balance editor. Transactions gains an
explicit add/hide form action and supports `/transactions?new=1` from the
dashboard hero. Budgets gains a period summary strip and human period captions
("Showing 22–28 Nov 2026"); dates in lists render as "27 Nov 2026". Chart axis
and legend text follow the active theme, and the two-column dashboard layouts
render recent transactions as a compact two-line entry.

`frontend/public/` now holds `favicon.svg` (master), `favicon-32.png`,
`favicon-48.png`, `apple-touch-icon.png`, and `site.webmanifest`; the old
project-root `frontend/finlog-icon.svg` was removed. `doc/UI_DESIGN.md` was
rewritten with the appearance model, dashboard map, brand tokens, and icon
regeneration steps.

**Important decisions:** (1) No new dependency and no Tailwind: the system uses
the existing React/Vite/plain-CSS stack, matching `AGENTS.md` and the user's
chosen option. (2) No remote fonts: `SECURITY.md` forbids third-party fonts
without approval, so serif and monospaced layouts use local stacks with the
intended families named first. (3) The loans block is intentionally absent until
Phase 5's API exists. (4) Defaults are Verdant, Forest Ink, System. (5) The
backend budget totals clamp unspent and overspent amounts separately; the UI
shows both and does not invent a net figure or call a period over budget when
only one category is. (6) Where the clarification answers selected every option
(styling and loans), the recommended path recorded above was used.

**Files:** `frontend/src/utils/theme.js`, `frontend/src/components/BrandMark.jsx`,
`frontend/src/components/AppearanceMenu.jsx`,
`frontend/src/components/DashboardHero.jsx`,
`frontend/src/components/DashboardBudgetPanel.jsx`,
`frontend/src/hooks/useWeeklyBudget.js`, `frontend/src/components/Layout.jsx`,
`frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Transactions.jsx`,
`frontend/src/pages/Budgets.jsx`, `frontend/src/pages/Analytics.jsx`,
`frontend/src/components/RecentTransactions.jsx`,
`frontend/src/components/TransactionList.jsx`,
`frontend/src/components/AnalyticsCharts.jsx`, `frontend/src/utils/dates.js`,
`frontend/src/styles/tokens.css`, `base.css`, `layouts.css`, `main.css`,
`frontend/index.html`, `frontend/public/*`, `doc/UI_DESIGN.md`,
`PROJECT_DOC.md`, `PROJECT_CHECKLIST.md`. `DashboardSummaryCards.jsx` was deleted
because the hero replaced it.

**Verified 2026-11-28:** `npm.cmd run build` from `frontend` passed after the
theme work (39.61 kB CSS, 681 modules) and again after the budget-copy fix.
Headless Chromium at 1440×1000 rendered Verdant, Classic, Compass, Harmattan,
Ledgerline, and Tape; a dark Verdant dashboard; dark Analytics; Ledgerline
Transactions; and Tape Budgets. Appearance interactions were asserted through
the DOM: selecting Midnight Blue produced `data-palette="midnight"` and
`--brand: #2457a6`; selecting Dark produced `data-mode="dark"` with
`data-mode-preference="dark"`. A 390×844 run measured `scrollWidth` 375 against
a 390 px viewport, so no horizontal overflow. Synthetic records were served from
a disposable SQLite database via `FINLOG_DATABASE_URL`; `data/finlog.db` was not
opened or modified.

**Not verified:** keyboard-only traversal and screen-reader announcement,
Firefox/Safari, physical phones, chart tooltips on touch, production serving of
the built bundle, and per-pair contrast measurement across the full
6 × 5 × 2 matrix. Backend tests were not rerun because no backend file changed.

### Self-hosted typefaces — approved 2026-11-28

**Implemented:** Fraunces, Manrope, and IBM Plex Mono are now served from the
repository, so the serif and monospaced layouts no longer render in system
fallbacks.

| Family | Files in `frontend/public/fonts/` | Used by |
|---|---|---|
| Fraunces, variable 400-700 | `fraunces-latin.woff2`, `fraunces-latin-ext.woff2` | Harmattan balance and headings; Ledgerline headings and wordmark |
| Manrope, variable 400-800 | `manrope-latin.woff2`, `manrope-latin-ext.woff2` | Verdant headings and wordmark |
| IBM Plex Mono 400/500/600/700 | eight `ibm-plex-mono-*-latin*.woff2` files | Every figure in every layout |

Twelve `woff2` files and three SIL OFL licence texts were added.
`frontend/src/styles/fonts.css` declares the faces and is imported first by
`main.css`; `tokens.css` points the typography tokens at them.

**Decisions:**

- Only latin and latin-ext subsets were taken from the Google Fonts CSS API.
  latin-ext is declared first because it owns the currency block
  `U+20A0-20AB`, which contains the naira sign, and the declared character ranges
  ensure a page downloads only what its text needs.
- Files are served from `public/fonts/` rather than `src/assets/` so the built
  `dist/` carries the licence texts beside the fonts, which the OFL expects of a
  redistributed build, and so the paths stay readable in `fonts.css`.
- No CDN link and no preload: a runtime request to `fonts.gstatic.com` would be
  an unapproved third-party transfer under `SECURITY.md`, and the display
  families are used by only some of the six layouts. `font-display: swap` is
  used instead.
- Two defects were fixed while wiring the tokens. Verdant declared
  `--font-num: var(--font-num)`, a CSS cycle, so its figures had been inheriting
  the body face; Ledgerline and Tape repeated the mono stack literally. The
  duplicate declarations were removed and all figures now resolve through the
  root token.
- The `"Inter"` entry was removed from `--font-body`: it matched no installed
  family, so body copy was already Segoe UI and remains so at the same measured
  width. No fourth family was added.
- Verdant's phone balance floor dropped from 42 px to 30 px, because monospaced
  figures are wider: at a 390 px viewport, `₦12,345,678.90` previously broke
  inside the decimal part and now holds one line.

**Verified 2026-11-28:** `npm.cmd run build` from `frontend` passed; the build
emitted `dist/fonts/` (12 `woff2` files plus 3 licence texts) and a 43.55 kB CSS
bundle. `vite preview` on port 4180 returned HTTP 200 for
`/fonts/fraunces-latin.woff2` and for `LICENCE-Fraunces-OFL.txt`, and rendered
the application with the new faces.

Headless Chromium at 1440×1000 reported the rendered platform font per node for
four layouts: Verdant balance `IBM Plex Mono` (13 of 13 glyphs), Verdant heading
and wordmark `Manrope`; Harmattan heading and wordmark `Fraunces`; Ledgerline
heading and wordmark `Fraunces` with an `IBM Plex Mono` balance; Tape wordmark
`IBM Plex Mono SemiBold` and heading `Segoe UI`, which is that layout's
documented system sans. Loaded face lists and resource entries referenced only
`/fonts/*.woff2`, and no request to `fonts.gstatic.com` or `fonts.googleapis.com`
appeared. At 390×844 the document width stayed 375 px and every layout held
`₦12,345,678.90` on one line. API requests were answered with a synthetic 503
while measuring; one earlier dev-server load did proxy to the backend already
listening on port 8000 and displayed that data before the interception was
narrowed. Only GET requests occurred, and no record was created, changed, or
deleted.

**Not verified:** Firefox and Safari font loading, a physical phone, screen
readers, cross-pair contrast, and layout shift on a page loading live data. The
final built page reported cumulative layout shift of 0.001 with the API blocked. Fraunces carries no naira glyph, so in Harmattan the `₦` of the
serif balance is drawn by the platform serif while the digits are Fraunces; the
rendered node reported both faces. This is recorded in `doc/UI_DESIGN.md` with
the two possible remedies. Backend tests were not rerun because no backend file
changed.

**Working-tree note:** git operations outside this task discarded the work twice:
a `reset: moving to HEAD` at 13:49:54, then a rebase onto `origin/main` that
stashed it. It was re-applied and then restored from `stash@{0}`. `main` now
points at the rebased `2c4837d`, the fonts and documentation are present again,
and this task committed nothing.

## 9. Data safety and Git

Never commit:
- `data/finlog.db`;
- `data/backups/`;
- real financial exports;
- `.env`;
- `.venv/`;
- `node_modules/`;
- secrets, credentials, tokens, or private keys.

The product brief PDF in `doc/` is the developer's private planning material. It
is intentionally local-only: untracked, ignored by the `/doc/*.pdf` rule, and
absent from the index and from every ref, so no history rewrite is outstanding.
Do not add it to the repository or copy its contents into tracked documents.

The live database must never be overwritten by generated sample data or tests.

Before entering real financial data, establish a proper Alembic migration baseline and a tested backup/restore process. SQLAlchemy `create_all()` does not alter existing tables.

Before the first public push, inspect Git history for secrets and private data. Removing a secret from the current working tree does not remove it from earlier commits.

## 10. Immediate next step

1. No Stage 4 code work remains; visually review phone/desktop screenshots and interactive browser flows if manual UX verification is required.
2. Keep loans, exports, and other later phases out of scope until the developer approves and scopes them explicitly.
3. Maintain the verified status in this handoff and `PROJECT_CHECKLIST.md` if later changes affect analytics fields, financial rules, or browser behaviour.

## 11. Handoff update protocol

Update this document when a meaningful project decision or verified state changes.

Each update should distinguish:
- **Implemented:** code exists.
- **Tested:** a specific check was run and passed.
- **Manually verified:** a human completed a stated workflow.
- **Not verified:** code exists but no suitable check has been run.
- **Blocked:** a dependency or decision prevents progress.

Do not write “completed” when the work is only drafted or generated.

## 12. Code organisation and comments

The developer's preferred style follows the supplied analytical script: numbered, descriptive section headings make the order of work visible at a glance. Apply this across languages using each language's normal comment syntax. Substantial files should show their actual sequence (for example setup, validation, processing, and output); short single-purpose modules should use a concise purpose comment rather than artificial sections. Comments should explain intent, constraints, assumptions, and non-obvious decisions instead of restating code. `AGENTS.md` and `CONTRIBUTING.md` are the canonical detailed guidance.

## Historical handoff notes retained from the earlier Phase 1 record

The earlier handoff marked the foundation work complete and recorded the following historical checks: 17 standard-library tests for money/date/validation/environment loading, raw SQLite constraint checks, and Python compilation. SQLAlchemy-backed model/database checks, FastAPI startup, API/database tests, and launcher execution were not verified in that earlier environment. These reports describe prior work and are not current verification. The later Phase 2 record says selected JavaScript syntax/helper checks passed, while JSX parsing, the Vite build, application startup, and end-to-end workflows remained unverified.

The original Phase 1 and Phase 2 handoff sections are historical records. The current source includes the Phase 2 and Phase 3 implementations; Phase 3 backend tests and frontend build passed as recorded above. The checklist tracks implementation and verification separately.
