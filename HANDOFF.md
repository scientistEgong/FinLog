# FinLog HANDOFF (update at the end of every phase)

**Last updated:** Phase 1 complete. **Next:** Phase 2 (transactions: API + React).
**Rule for any model continuing this project:** the architecture below is LOCKED. Do not change the stack, layers or folder structure without asking the user. Do not add features outside scope. Do not claim anything works unless it was actually run.

## Product
Personal finance tracker for a Windows laptop; web-first (React) so it can later be wrapped with Capacitor for Android/Play Store. Premium/payments, voice, AI assistant, login, cloud deployment are OUT of scope for now. Default currency NGN, shown as ₦15,000.00. Mobile-first responsive UI (bottom nav on phones, sidebar on desktop; tables collapse to cards on narrow screens).
A reference prototype ("Paycheck Peace Tracker", single HTML file) exists; it is inspiration only. Do not copy its extra features.

## Stack and layers (locked)
React + Vite (port 5173, proxies /api to 8000) -> FastAPI (port 8000) -> SQLite (`data/finlog.db`).
Backend layers, each calling only the one below: `routers` -> `services` (all calculations/validation rules) -> `repositories` (only place with queries) -> SQLAlchemy 2.0 models. Frontend only displays API data; no money maths or hardcoded figures in React. `schemas/` = Pydantic request/response models.

## Locked rules
- Money = integer kobo everywhere in DB/backend (`amount_kobo`, `principal_kobo`, ...). Convert only at the edges with `naira_to_kobo` / `format_naira`. More than 2 decimals is rejected, not rounded.
- Weeks run Sunday-Saturday. Dashboard/Budgets get a calendar date picker + Week/Month toggle.
- Transaction types: `income` | `expense`. Categories are shared by both types.
- Savings: a transaction in a category with `is_savings=True` (default: "Savings") is an expense that is EXCLUDED from "Total expenditure" and counted as savings.
  - total_expenditure = sum(expenses where category not savings)
  - total_savings = sum(expenses where category is savings)
  - available_balance = opening_balance + income - total_expenditure - total_savings
  - total_wallet = available_balance + total_savings
  Dashboard shows all four. (User confirmed savings are excluded from expenditure but included in wallet total; exact formulas above are my interpretation: ask the user if unsure.)
- Opening balance: `settings` key `opening_balance_kobo`; absent = 0. Never counted as income; shown as its own line.
- Loans never create `transactions` rows. Borrowed money is not income; lent money is not spending.
- Loan outstanding = principal_kobo + interest_kobo - SUM(repayments). Derived, never stored. Interest is a flat amount.
- Budgets are never counted as expenditure. Weekly/monthly budget totals = SUM of category rows for that period. `period_start` = Sunday (week) or 1st of month.
- Default categories cannot be deleted; categories in use cannot be deleted (DB enforces RESTRICT).
- No sample/fabricated data in the real DB. Tests use temp DBs only.

## Database (SQLAlchemy models in `backend/app/models/`)
- `categories`(id, name [unique ignoring case], is_savings, is_default)
- `transactions`(id, type, amount_kobo>0, transaction_date, category_id FK RESTRICT, description, payment_method, notes, created_at, updated_at)
- `budgets`(id, period_type 'week'|'month', period_start, category_id FK RESTRICT, amount_kobo>=0; UNIQUE(period_type, period_start, category_id))
- `loans`(id, direction 'borrowed'|'lent', counterparty, principal_kobo>0, interest_kobo>=0, opened_date, due_date nullable (>= opened_date), notes)
- `loan_repayments`(id, loan_id FK CASCADE, amount_kobo>0, payment_date, notes)
- `settings`(key PK, value)
Foreign keys are switched on for SQLite in `database.make_engine`.

## Glossary (names to reuse, do not rename)
- config.py: `APP_NAME, APP_VERSION, BASE_DIR, DATA_DIR, DB_PATH, DATABASE_URL (env FINLOG_DATABASE_URL overrides), CURRENCY_CODE, CURRENCY_SYMBOL, WEEK_STARTS_ON, CORS_ORIGINS, DEFAULT_CATEGORIES, TRANSACTION_TYPES, PERIOD_TYPES, LOAN_DIRECTIONS, SETTING_OPENING_BALANCE`
- database.py: `Base, make_engine(url), engine, SessionLocal, ensure_data_dir(), get_db()`
- init_db.py: `init_db(engine)` (create missing tables + seed categories only if table empty), `seed_default_categories(session)`
- utils/money.py: `naira_to_kobo, kobo_to_decimal, format_naira, KOBO_PER_NAIRA`
- utils/dates.py: `week_start, week_range, month_range, year_range`
- main.py: FastAPI `app`, lifespan runs `ensure_data_dir()` + `init_db(engine)`, `GET /api/health`
- Model attribute names: `Transaction.transaction_date`, `Loan.opened_date`, `Loan.due_date`, `LoanRepayment.payment_date`, `Budget.period_start` (avoid an attribute called `date`).

## Status
- [x] Phase 1: skeleton, config, DB layer, models, seed, money/date utils, health endpoint, tests written, launcher, README
- [ ] Phase 2: transaction repo/service/router/schemas + validation; React (Vite) scaffold, layout/navigation, transaction form/table/filters; opening-balance setting
- [ ] Phase 3: dashboard service/endpoint + page; budgets (week/month, calendar picker)
- [ ] Phase 4: analytics endpoints + 6 Recharts visuals; loans + repayments
- [ ] Phase 5: CSV + PDF (reportlab) exports; full test pass; persistence-after-restart check; testing report

## Verified vs NOT verified (Phase 1)
Verified (run in the sandbox): all Python files compile; 8 unit tests for money and date utils pass; the SQL constraint semantics (case-insensitive unique name, CHECKs, FK RESTRICT/CASCADE, due>=opened) behave as intended in raw SQLite.
NOT verified (sandbox has no internet, so FastAPI/SQLAlchemy/pytest/npm could not be installed): the SQLAlchemy models, `init_db`, `main.py`, `tests/test_database.py`, `run_finlog.bat`. These must be run on the user's laptop first: `pytest` in `backend`, then start uvicorn and open /api/health.

## Known limitations / open items
- Tables are created with `create_all`, which cannot alter existing tables. An Alembic baseline migration must be set up BEFORE the user enters real data (Phase 5 gate); until then tell the user not to enter real data.
- No database backup routine yet (`data/backups/` exists, unused).
- Income and expense share one category list (the user's 12 categories). Revisit only if the user asks.
