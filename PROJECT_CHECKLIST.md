# FinLog Project Checklist

This is the project roadmap and progress tracker. It is not permission to start every phase automatically.

**Rule:** Work only on the phase/task the developer has approved. Before marking an item complete, verify it in the repository or record the evidence supplied by the developer. Do not mark work complete merely because files were generated.

## Project direction

FinLog is a local-first personal finance tracker, initially for Windows desktop use, with a web-first React frontend and a possible future Android wrapper using Capacitor.

**Code style:** Use descriptive numbered sections in substantial files to show the sequence of work, across languages. Comments should explain intent and non-obvious rules; keep short modules concise. See `AGENTS.md` and `CONTRIBUTING.md` for the full standard.

Current exclusions: premium/payments, voice, AI assistant, login/authentication, cloud deployment, and unrelated integrations.

## Phase 1 — Foundation

- [ ] Confirm repository structure and project configuration.
- [ ] Confirm Python environment and backend dependencies.
- [ ] Confirm FastAPI application entry point and configuration.
- [ ] Confirm SQLite connection and SQLAlchemy setup.
- [ ] Confirm models and default category seeding.
- [ ] Confirm money helpers use integer kobo.
- [ ] Confirm date helpers use Sunday–Saturday weeks.
- [ ] Confirm health endpoint.
- [ ] Confirm launcher script and setup documentation.
- [ ] Run and record foundation tests.
- [ ] Verify `.gitignore` excludes local/private data.

**Historical note:** Earlier work reported some standard-library checks and raw SQLite constraint checks passing. SQLAlchemy/FastAPI execution was not verified in the earlier sandbox because dependencies were unavailable. The developer later reported inspecting the local database with SQLite Browser. Re-run current checks before treating the phase as fully verified.

## Phase 2 — Transactions, categories, opening balance, and frontend foundation

### Backend
- [x] Health endpoint: `GET /api/health`.
- [x] Transaction listing with date/type/category/search/pagination filters.
- [x] Create transaction endpoint.
- [x] Read, update, and delete transaction endpoints.
- [x] Category listing and creation.
- [x] Category deletion restrictions (default or in-use categories).
- [x] Opening balance `GET` and `PUT` endpoints.
- [x] Pydantic validation and documented error responses.
- [x] Tests for transaction, category, and opening-balance behaviour.

### Frontend
- [x] React + Vite scaffold.
- [x] API request helper and error handling.
- [x] Responsive application shell and navigation.
- [x] Transaction form.
- [x] Transaction history.
- [x] Search and filters.
- [x] Pagination.
- [x] Edit and delete flows.
- [x] Opening balance UI (originally on Transactions; moved to Dashboard in Phase 3).

### Verification
- [ ] Backend tests run in the actual project environment.
- [ ] Frontend dependencies install successfully.
- [ ] Vite production build succeeds.
- [ ] Frontend and backend run together locally.
- [ ] Create, view, edit, delete, filter, and pagination flows tested.
- [ ] Data persists after application restart.
- [ ] No real database or private data is included in Git.

**Historical note:** Phase 2 implementation was reported as written. Earlier sandbox checks covered selected JavaScript syntax/helpers with mocked fetch. FastAPI/SQLAlchemy tests, JSX/Vite build, launcher execution, and full end-to-end flows remained unverified at that point. Confirm current state before changing these boxes.

**Verification update 2026-11-27:** The full isolated backend suite passed 79 tests and 59 subtests. The frontend production build passed. These checks verify backend/API behavior and frontend compilation; they do not verify manual browser CRUD, filtering, pagination, restart persistence, or phone layouts. A live smoke-test attempt encountered an already-running server on port 8000, so no end-to-end or real-data safety claim is made for that attempt. See the latest HANDOFF entry.

## Phase 3 — Dashboard and budgets

- [x] Define and approve dashboard metrics and calculation contracts.
- [x] Implement dashboard repository aggregate query.
- [x] Implement dashboard service calculations.
- [x] Implement dashboard API endpoint and response schema.
- [x] Add dashboard page and connect it to API data.
- [x] Display opening balance on the Dashboard.
- [x] Move opening-balance UI from Transactions page to Dashboard.
- [x] Implement weekly budgets.
- [x] Implement monthly budgets.
- [x] Add calendar/period selection.
- [x] Ensure weekly periods run Sunday–Saturday.
- [x] Ensure monthly periods start on day one.
- [x] Ensure budgets are not counted as expenditure.
- [ ] Add calculation, API, and UI tests.

**Verified 2026-11-26:** Backend suite passed (55 tests); Vite production build passed; four JavaScript assertions verified Sunday and first-of-month boundaries. Headless Chrome screenshots exercised the dashboard and budget pages at 390px and 1440px widths against a temporary backend/database containing synthetic records. Chrome reported a 390px document width at the phone viewport. API tests cover budget create/read/update/delete, validation, and dashboard formulas. Interactive budget-form and opening-balance save flows have not been manually exercised in a browser, so the combined UI-test item remains unchecked.

## Phase 4 — Analytics

- [x] Agree on analytical questions and define each chart's purpose.
- [x] Define the date-filtered analytics API response contract.
- [x] Implement analytics repository aggregates and service calculations.
- [x] Implement `GET /api/analytics` with weekly, monthly, and yearly grouping.
- [x] Add eight Recharts visualisations with responsive chart cards.
- [x] Keep financial aggregation in the backend and render API-provided chart data.
- [x] Handle empty ranges, date filters, and responsive layouts.
- [x] Add tests for analytics calculations and endpoint responses.

**Implemented:** Eight views cover period income/ordinary spending/savings, available-balance change, highest spending categories, top-category trends, savings trends, income sources, weekday averages, and ordinary-expense frequency versus average size. Date inputs filter every view; period trends can be grouped weekly, monthly, or yearly.

Trend charts use lines, category segmentation uses horizontal bars, chart gridlines are removed, and the Dashboard highlights the highest ordinary-spending week or month in its trailing-year line chart.

## Dashboard and analytics enhancement — approved 2026-11-26

### Stage 3 — Dashboard
- [x] Extend `GET /api/dashboard` with optional `date_from` and `date_to` while preserving all-time fields.
- [x] Return period income, ordinary expenditure, savings, available change, and savings rate from the backend.
- [x] Return ranked ordinary-spending categories and factual observations from the backend.
- [x] Validate incomplete and reversed date ranges.
- [x] Add dashboard preset/custom period controls with explicit all-time and period labels.
- [x] Add income/expenditure/savings/retained comparison and category bar charts.
- [x] Add recent transactions and navigation to full Transactions and Analytics pages.
- [x] Add isolated tests for period totals, savings exclusion, savings rate, categories, observations, and validation.

**Verified 2026-11-26:** Dashboard tests passed 8 cases; full backend suite passed 60 tests and 21 subtests; Vite production build passed. Temporary test databases were used. Browser interaction and responsive layout have not been manually checked.

### Stage 4 — Analytics
- [x] Add backend savings-rate trend, category percentages, top individual expenses, and budget-vs-actual aggregates.
- [x] Return and display the remaining budget per category, including clear over-budget amounts.
- [x] Add preset reporting periods and the new analytical charts to the Analytics page.
- [x] Add isolated backend tests for the new analytics fields and boundary cases.
- [x] Confirm the rendered Analytics page and budget comparison rows in headless Chrome at 1440px using synthetic data.
- [ ] Visually inspect phone/desktop screenshots and manually exercise tooltips, preset clicks, and top-expense links.

**Verified 2026-11-26:** `..\.venv\Scripts\python.exe -m pytest test\test_analytics.py -q` passed 6 tests from `backend`. The full backend suite passed 66 tests and 21 subtests. `npm.cmd run build` passed from `frontend`. A headless Chrome DOM render on a temporary database and ports confirmed the new chart sections and budget rows; temporary artifacts were removed.

## Phase 5 — Loans and repayments

- [ ] Confirm loan and repayment workflows.
- [ ] Define schemas and database relationships.
- [ ] Implement loan creation/list/detail/update behaviour as approved.
- [ ] Implement repayments.
- [ ] Calculate outstanding balance as principal + flat interest − repayments.
- [ ] Ensure creating a loan does not create a transaction.
- [ ] Define how repayments appear in financial summaries, if applicable, before implementing.
- [ ] Add tests for repayment totals, edge cases, and outstanding balances.
- [ ] Add the approved frontend screens and forms.

## Phase 6 — Exports

- [ ] Confirm CSV export fields and filters.
- [ ] Mitigate CSV formula injection where applicable.
- [ ] Confirm PDF report content and layout.
- [ ] Implement PDF generation using the approved ReportLab approach.
- [ ] Ensure exports contain only requested records.
- [ ] Test empty exports, large exports, and date filters.
- [ ] Verify generated files do not enter source control accidentally.

## Phase 7 — Database migrations, security, backups, and quality assurance

- [ ] Establish an Alembic migration baseline.
- [ ] Test migrations on a copy or temporary database.
- [ ] Confirm upgrade and recovery procedures.
- [ ] Implement a documented backup routine.
- [ ] Test restoration from backup.
- [ ] Review CORS and local network binding.
- [ ] Review API validation and error handling.
- [ ] Review file handling and export security.
- [ ] Review logging for private data exposure.
- [ ] Review dependencies and configuration.
- [ ] Run backend tests.
- [ ] Run frontend tests/build.
- [ ] Run end-to-end workflows.
- [ ] Test persistence after restart.
- [ ] Produce a factual verification report.
- [ ] Confirm real financial data can be entered safely only after migration and backup readiness.

## Phase 8 — Release readiness and future Android preparation

- [ ] Confirm supported Windows setup workflow.
- [ ] Review `run_finlog.bat` on a clean or documented environment.
- [ ] Review README and troubleshooting instructions.
- [ ] Confirm production build and local run instructions.
- [ ] Review responsive behaviour across phone/tablet/desktop sizes.
- [ ] Review accessibility and keyboard interaction.
- [ ] Confirm backup/export documentation.
- [ ] Record known limitations.
- [ ] Assess Capacitor compatibility as a separate planned task.
- [ ] Do not implement Android packaging until explicitly approved.

## Current phase and next approved task

**Current phase:** Stage 3 Dashboard and Stage 4 Analytics enhancements are implemented. Analytics backend tests, the full backend suite, and the frontend production build passed; desktop DOM rendering was confirmed with synthetic data. Manual visual/interactive browser verification remains outstanding.

**Next logical action:** Visually inspect phone and desktop screenshots and manually exercise chart tooltips, preset buttons, and top-expense links if UX sign-off is required. Do not begin later phases without explicit approval.

## Progress recording rules

For every completed checklist item, record evidence in the task report or `HANDOFF.md`:
- command or manual workflow used;
- result;
- environment;
- date if useful;
- known limitations.

Keep unchecked items unchecked when not verified. Do not convert historical reports into current verification.
