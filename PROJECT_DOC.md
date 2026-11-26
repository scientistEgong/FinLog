# FinLog — Project Guide and Model Handoff

> Copy the section **Current progress handoff** at the end of this document into the brainstorming model. This guide reflects the files currently present in the repository and the verification claims recorded in `HANDOFF.md`; it does not claim an unrun build or test passed.

## What FinLog is

FinLog is a local-first, personal finance tracker for a Windows laptop. It is a web application designed so that a mobile shell such as Capacitor could be considered later. The current product scope includes recording income and expenses, managing categories, setting an opening balance, viewing an all-time dashboard, managing weekly/monthly budgets, and exploring date-filtered financial analytics. Loans and reports remain planned.

The project is intentionally single-user and local at this stage. Login, cloud hosting, payments, voice features and an AI assistant are outside the current scope. The database is intended to hold the user's actual financial records; tests should use isolated temporary databases.

## Technology stack, in plain language

| Technology | What it is | What it does in FinLog |
|---|---|---|
| Python | Backend programming language | Implements API rules, validation, database access and money/date helpers. |
| FastAPI | Python web API framework | Exposes HTTP endpoints, validates incoming request shapes, and produces the API docs at `/docs`. Runs on port 8000. |
| Pydantic 2 | Python data validation and serialization library | Defines request/response schemas and turns invalid user input into structured API errors. |
| SQLAlchemy 2 | Python database toolkit and ORM | Maps Python model classes to relational tables and runs queries through the repository layer. |
| SQLite | Embedded relational database | Stores data locally in `data/finlog.db`; no separate database server is needed. |
| React 18 | JavaScript UI library | Builds the interactive forms, navigation and transaction history in the browser. JSX is JavaScript with HTML-like UI syntax. |
| Vite 5 | Frontend development server and build tool | Serves the React app on port 5173 and bundles it for production. Its development proxy forwards `/api` calls to FastAPI. |
| React Router 6 | Client-side navigation library | Maps URLs such as `/transactions` and `/budgets` to React page components without a full page reload. |
| Recharts 3 | React chart library | Renders the analytics visuals from API-provided data; loaded only when the Analytics page opens. |
| CSS | Browser styling language | Sets responsive layout, colors, controls and the mobile table-to-card presentation. |
| pytest / unittest | Python test tools | pytest runs the integration/database tests; several pure helper tests use Python's built-in unittest style and can also be collected by pytest. |
| httpx | HTTP client library | Supports FastAPI's test client in API tests. |
| npm / Node.js | JavaScript package manager/runtime | Installs frontend dependencies and runs Vite scripts. |
| Windows batch (`.bat`) | Windows command script | `run_finlog.bat` checks prerequisites, installs missing dependencies, starts backend and frontend terminals, then opens the app. |

The app's intended request path is:

```text
Browser (React) → Vite proxy (/api) → FastAPI router → service rules → repository queries → SQLAlchemy model → SQLite
```

Each backend layer has a narrow responsibility. Routers translate HTTP into service calls. Services own business rules and calculations. Repositories are the only layer that constructs database queries. Models define persisted table structure. Pydantic schemas define the external API contract. The frontend presents server data and sends user input; financial arithmetic belongs on the backend.

## Where things live

- `run_finlog.bat`: Windows startup helper; uses the project-root `.venv` and frontend `node_modules`.
- `README.md`: short setup/run guidance.
- `HANDOFF.md`: project decisions, historical verification notes and current Phase 4 status.
- `backend/requirements.txt`: Python dependencies.
- `backend/app/config.py`: app constants, local paths, defaults, validation limits and `.env`/environment configuration.
- `backend/app/database.py`: SQLAlchemy base/engine/session, request-scoped sessions, table initialization and default-category seeding.
- `backend/app/main.py`: FastAPI app, startup lifecycle, CORS policy, router registration, health check and domain-error-to-HTTP mapping.
- `backend/app/models/`: SQLAlchemy table definitions for transactions, categories, settings, budgets, loans and repayments.
- `backend/app/schemas/`: Pydantic request and response formats; these are API data contracts, not database tables.
- `backend/app/schemas/analytics.py`: validated analytics filters and chart response shapes.
- `backend/app/routers/`: HTTP endpoints for transactions, categories, opening balance, dashboard summary and budgets.
- `backend/app/routers/analytics.py`: date-filtered analytics endpoint.
- `backend/app/services/`: business logic, money/date/text validation and domain errors.
- `backend/app/services/analytics_service.py`: weekly/monthly/yearly trend, category, and weekday calculations.
- `backend/app/repositories/`: database reads/writes; SQL queries should stay here.
- `backend/app/repositories/analytics_repository.py`: date-range transaction aggregates for analytics.
- `backend/app/exports/`: reserved for future CSV/PDF export implementation.
- `backend/app/migrations/`: currently contains migration guidance only; Alembic baseline is a future requirement.
- `backend/test/`: temporary-database fixtures and unit/API/database tests. The directory is named `test` (not the historical `tests`).
- `frontend/index.html`: browser entry document with the React mount point.
- `frontend/src/main.jsx`: mounts React and browser routing.
- `frontend/src/App.jsx`: URL-to-page routing; unfinished sections currently show “Coming soon”.
- `frontend/src/api/`: API request wrapper and endpoint-specific functions, including analytics.
- `frontend/src/pages/`: page-level state and coordination for Dashboard, Analytics, Budgets and Transactions.
- `frontend/src/components/`: reusable UI elements and forms.
- `frontend/src/hooks/`: reusable React state/effect logic, currently category loading.
- `frontend/src/utils/`: small display/input helpers, currently local date formatting.
- `frontend/src/styles/main.css`: responsive visual system.
- `frontend/vite.config.js`: React plugin, frontend port and local API proxy.
- `frontend/package.json` / `package-lock.json`: frontend dependency declarations and resolved npm dependency tree.
- `data/`: local database location; `export_output/` exists for future generated files.

## Domain and data rules

- **Currency:** NGN, displayed with the naira symbol. One naira equals 100 kobo.
- **Money precision:** the backend persists money as integer kobo (for example, ₦1,500.50 is `150050` kobo). User-entered naira amounts are converted at the API edge. Inputs with more than two decimal places are rejected, not rounded. The configured maximum transaction amount is NGN 1 trillion.
- **Transaction types:** `income` and `expense`. Each transaction has a date, category, description, optional payment method and optional notes.
- **Categories:** one shared list for both income and expenses. Default categories are seeded only when the category table is empty. Names are unique case-insensitively. Defaults cannot be deleted; custom categories in use by a transaction or budget cannot be deleted.
- **Savings:** a category marked `is_savings=True` (the seeded “Savings” category) represents an expense that is excluded from expenditure totals and counted separately as savings. The dashboard service applies this rule.
- **Opening balance:** stored in the key/value settings table as `opening_balance_kobo`. It represents money held before using FinLog and must never be recorded as income. It is editable from the Dashboard.
- **Calendar:** weeks run Sunday through Saturday. Budget period start dates are the Sunday for a week or first day of a month.
- **Loans:** planned loans are not transactions. Borrowing must not appear as income and lending must not appear as spending. Outstanding is derived as principal + flat interest − repayments rather than stored as a second, potentially stale balance.
- **Budgets:** allocations are not expenses. Weekly/monthly totals are the sum of category allocations for that period.
- **Safety of real records:** current table setup uses SQLAlchemy `create_all`, which creates missing tables but does not migrate existing tables. The handoff calls for an Alembic baseline before real financial records are entered. No automated backup routine is implemented yet.

## Current functionality and API

Implemented source currently contains:

- `GET /api/health` to verify FastAPI and its database connection.
- `GET /api/transactions` with date range, type, category, text search, page size and offset filters; results are newest first.
- `POST /api/transactions`, `GET /api/transactions/{id}`, `PUT /api/transactions/{id}`, and `DELETE /api/transactions/{id}`.
- `GET /api/categories`, `POST /api/categories`, and `DELETE /api/categories/{id}`. UI supports listing/adding; deleting is API-only for now.
- `GET /api/settings/opening-balance` and `PUT /api/settings/opening-balance`.
- `GET /api/dashboard` returns all-time opening balance, income, ordinary expenditure, savings, available balance and total wallet. Monetary values are returned as integer kobo and formatted display strings.
- `GET /api/analytics?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&group_by=week|month|year` returns backend-aggregated trend, category, and weekday data for the selected range.
- `GET /api/budgets?period_type=week|month&period_start=YYYY-MM-DD`, `POST /api/budgets`, `PUT /api/budgets/{id}`, and `DELETE /api/budgets/{id}` manage category allocations for canonical Sunday or first-of-month period starts.
- API error conventions: 404 for missing records, 409 for conflicts (such as deleting a protected category), and 422 for invalid input. Transaction amounts return `amount_kobo`, `amount_input` for editing, and `amount_display` for display.
- React transaction page: add/edit/delete, category selection and quick category creation, filters/search, and pagination.
- React dashboard page: API-provided all-time financial cards and opening balance editor.
- React analytics page: eight Recharts views for period cash flow, available-balance movement, top spending categories, category trends, savings, income sources, weekday averages, and expense frequency/size. Trend charts use lines, category segmentation uses horizontal bars, and chart gridlines are omitted. Date range and weekly/monthly/yearly grouping controls are available; chart calculations come from the backend.
- Dashboard spending trend: a weekly/monthly line chart over the trailing 12 months, with the highest-spending period returned by the backend and highlighted in the chart.
- React budget page: week/month selection, calendar date input, category allocation CRUD and backend-provided period total.
- Stub navigation routes remain for loans and reports.

## Progress and verification

Phase 3 implementation is present. On 2026-11-26, the full backend suite passed (55 tests), the frontend production build passed, four Node assertions checked Sunday/month period-start conversion, and headless Chrome screenshots inspected the Dashboard and Budgets pages at 390px and 1440px viewport widths using a disposable database with synthetic records. Interactive budget-form and opening-balance save flows have not been manually exercised in a browser. These checks do not verify the launcher or a production deployment.

Phase 4 analytics implementation is present. The backend imports and exposes the expected OpenAPI query parameters, and the frontend production build passed. Analytics data calculations and browser chart/responsive behavior remain unverified. See `HANDOFF.md` for the chart list, dependency review, and next verification steps.

## Planned phases from the handoff

1. **Phase 1 — foundation (marked complete):** configuration, local DB, models, category seeding, helpers, health route, initial test setup and launcher.
2. **Phase 2 — transactions (marked written):** transaction CRUD/filter API, validation, categories, opening balance, React scaffold/navigation and transaction UI.
3. **Phase 3 — dashboard and budgets:** implemented; interactive browser form verification remains outstanding.
4. **Phase 4 — analytics:** API, repository/service calculations, and eight approved Recharts views implemented; tests and browser review remain.
5. **Phase 5 — loans and repayments:** workflows and API; no work started.
6. **Phase 6 — exports:** CSV/PDF exports; no work started.
7. **Phase 7 — migrations, security, backups and quality assurance:** Alembic baseline, backup/restore, and broader review. The migration and tested backup baseline remain gates before real data use.
8. **Phase 8 — release readiness and future Android preparation:** no work started.

## Guidance for the next model / developer

- Treat the architecture, phase scope, folder responsibilities and domain rules in `HANDOFF.md` as locked unless the user changes them.
- Read `HANDOFF.md` before making architectural decisions; update its current status and verified/not-verified section at the end of each phase.
- Do not add loans or report features until their planned phase. Do not represent planned model tables as implemented UI/API features.
- Keep financial calculations in backend services, query construction in repositories, API validation shapes in schemas and display/state logic in React.
- Preserve integer-kobo storage and Sunday-start weeks. Never use floating-point arithmetic for stored money.
- Do not put sample data in the real database. Continue using temporary DB fixtures for tests.
- Explain business intent and non-obvious choices in code comments/docstrings. Avoid comments that merely narrate each obvious line.
- Do not claim verification that was not actually run. Record exact commands and results in the handoff.

---

## Current progress handoff

FinLog is a Windows-first local personal finance tracker with a React 18 + Vite frontend, FastAPI/Python backend, Pydantic 2 request/response validation, SQLAlchemy 2 ORM and SQLite local database. The frontend dev server is intended for port 5173 and proxies `/api` to FastAPI on port 8000. Backend structure is routers → services → repositories → SQLAlchemy models. React displays API data and should not calculate financial totals.

The project has completed the foundation phase and implements transaction management, the Phase 3 dashboard/budgets, and Phase 4 analytics. Analytics provides a date range with weekly/monthly/yearly trend grouping and eight Recharts views; all monetary aggregation is performed in the backend. The API import/OpenAPI contract and frontend production build were checked. Analytics calculations and browser chart behavior remain unverified. Loans/repayments and exports remain planned.

Core rules: persist all money as integer kobo (₦1 = 100 kobo), reject precision beyond two decimals, use shared categories, treat Savings-category expenses separately from ordinary expenditure, keep opening balance out of income, and use Sunday–Saturday weeks. Loans must never create transaction rows. No fabricated financial data in the real DB. The database currently uses `create_all` and has no Alembic migration baseline or backup routine; the handoff says not to enter real records until migrations are handled.

Current Phase 3 and Phase 4 status and verification are recorded above. Earlier Phase 1 and Phase 2 check results are historical, not current claims. See this guide for technology explanations and the file map; see `HANDOFF.md` for locked rules and the verification ledger. Next, test analytics calculations and inspect charts at phone and desktop widths using synthetic records.
