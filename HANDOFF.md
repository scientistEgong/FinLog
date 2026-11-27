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

## 9. Data safety and Git

Never commit:
- `data/finlog.db`;
- `data/backups/`;
- real financial exports;
- `.env`;
- `.venv/`;
- `node_modules/`;
- secrets, credentials, tokens, or private keys.

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
