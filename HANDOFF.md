# FinLog HANDOFF — Historical Phase 1 notes (superseded)

> The current status is the Phase 2 HANDOFF section later in this file.

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


# FinLog HANDOFF — Current Phase 2 status (update at the end of every phase)

**Last updated:** Phase 2 written (see "Verified vs NOT verified"). **Next:** Phase 3 (dashboard + budgets).
**Rule for any model continuing this project:** the architecture and the folder tree below are LOCKED by the user. Do not change the stack, layers or tree without asking. Do not add features outside scope. Do not claim anything works unless it was actually run.

## Product
Personal finance tracker for a Windows laptop; web-first (React) so it can later be wrapped with Capacitor for Android/Play Store. Premium/payments, voice, AI assistant, login, cloud deployment are OUT of scope now. Default currency NGN, shown ₦15,000.00. Mobile-first responsive UI (bottom nav on phones, sidebar on desktop; tables become cards on phones).
Reference prototype "Paycheck Peace Tracker" (single HTML file) is inspiration only; do not copy its extra features.

## Locked project tree (from the user)
```
FinLog/
  run_finlog.bat  README.md  HANDOFF.md  .gitignore  .env.example
  .venv/                      <- Python venv at project ROOT
  data/            finlog.db, backups/
  backend/
    requirements.txt
    app/  main.py config.py database.py  models/ schemas/ repositories/ services/ routers/ exports/ migrations/
    tests/
  frontend/
    index.html package.json package-lock.json vite.config.js
    src/ main.jsx App.jsx  api/ pages/ components/ hooks/ utils/ styles/
```
Consequences: there is NO backend `utils/` folder and NO `init_db.py` or `pytest.ini`. Money/date helpers live in `services/money.py` and `services/dates.py`; `init_db()` and `seed_default_categories()` live in `database.py`. `package-lock.json` is created by `npm install` on the user's laptop (not shipped).

## Stack and layers (locked)
React + Vite (5173, proxies /api to 127.0.0.1:8000) -> FastAPI (8000) -> SQLite (`data/finlog.db`).
Backend: `routers` -> `services` (calculations, rules) -> `repositories` (only place with queries) -> SQLAlchemy 2.0 `models`. `schemas/` = Pydantic request/response shapes. Frontend only displays API data: no money maths and no hardcoded figures in React.

## Locked rules
- Money is integer kobo in DB/backend. The client sends `amount` as a naira string; the API returns `amount_kobo`, `amount_input` ("1500.50", for edit forms) and `amount_display` ("₦1,500.50"). More than 2 decimals is rejected, not rounded. Max amount NGN 1 trillion.
- Weeks Sunday-Saturday. Dashboard/Budgets get a calendar date picker + Week/Month toggle.
- Types: `income` | `expense`. One shared category list.
- Savings: category with `is_savings=True` (default "Savings") holds expenses that are EXCLUDED from total expenditure and counted as savings:
  total_expenditure = expenses in non-savings categories; total_savings = expenses in savings categories;
  available_balance = opening_balance + income - total_expenditure - total_savings; total_wallet = available_balance + total_savings.
  (My interpretation of the user's answer; the user was asked to confirm and has not objected. Re-ask if unsure.)
- Opening balance: `settings` key `opening_balance_kobo` (absent = 0), never income. API: GET/PUT `/api/settings/opening-balance`. UI currently sits on the Transactions page; move it to the Dashboard in Phase 3.
- Loans never create `transactions`. Loan outstanding = principal_kobo + interest_kobo - SUM(repayments), derived not stored. Interest = flat amount.
- Budgets never count as expenditure. Weekly/monthly budget totals = SUM of category rows; `period_start` = Sunday (week) or 1st of month.
- Default categories cannot be deleted; categories in use cannot be deleted.
- No sample data in the real DB. Tests use temp DBs and never start the app lifespan (so `data/finlog.db` is untouched).

## Database (models in backend/app/models/)
categories(id, name [unique ignoring case], is_savings, is_default) | transactions(id, type, amount_kobo>0, transaction_date, category_id FK RESTRICT, description, payment_method, notes, created_at, updated_at) | budgets(id, period_type 'week'|'month', period_start, category_id FK RESTRICT, amount_kobo>=0; UNIQUE(period_type, period_start, category_id)) | loans(id, direction 'borrowed'|'lent', counterparty, principal_kobo>0, interest_kobo>=0, opened_date, due_date (>= opened_date), notes) | loan_repayments(id, loan_id FK CASCADE, amount_kobo>0, payment_date, notes) | settings(key PK, value).
SQLite foreign keys are enabled in `database.make_engine`.

## API (Phase 2)
- `GET /api/health`
- `GET /api/transactions?date_from&date_to&type&category_id&q&limit(1-200,default 25)&offset` -> `{items,total,limit,offset}`, newest first
- `POST /api/transactions` (201), `GET|PUT|DELETE /api/transactions/{id}` (DELETE 204)
- `GET|POST /api/categories`, `DELETE /api/categories/{id}` (409 if default or in use)
- `GET|PUT /api/settings/opening-balance`
Errors: 404 `{"detail": "text"}`, 409 same, 422 `{"detail":[{"loc":["body","field"],"msg":"..."}]}` (the frontend maps these to per-field messages).

## Glossary (reuse these names)
- config.py: `APP_NAME, APP_VERSION, BASE_DIR, DATA_DIR, DB_PATH, DATABASE_URL (env FINLOG_DATABASE_URL or .env), CURRENCY_CODE, CURRENCY_SYMBOL, WEEK_STARTS_ON, CORS_ORIGINS, DEFAULT_CATEGORIES, TRANSACTION_TYPES, PERIOD_TYPES, LOAN_DIRECTIONS, SETTING_OPENING_BALANCE, MAX_*_LENGTH, MAX_AMOUNT_KOBO, MIN_DATE, MAX_DATE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, _load_dotenv`
- database.py: `Base, make_engine, engine, SessionLocal, ensure_data_dir, get_db, seed_default_categories, init_db(target_engine=None)`
- services/money.py: `naira_to_kobo, kobo_to_decimal, format_naira, KOBO_PER_NAIRA`; services/dates.py: `week_start, week_range, month_range, year_range`
- services/validation.py (stdlib only): `clean_required_text, clean_optional_text, parse_positive_amount, parse_non_negative_amount, check_date_in_range, check_date_order`
- services/errors.py: `DomainError, NotFoundError, ConflictError, DomainValidationError(message, field=None)`
- services: `transaction_service` (create/update/delete/get/list_transactions, to_out), `category_service`, `settings_service` (get_opening_balance_kobo!, get/set_opening_balance). repositories: `transaction_repository, category_repository, setting_repository`.
- schemas: `TransactionIn (field amount_kobo, alias "amount"), TransactionOut, TransactionPage, CategoryIn/Out, OpeningBalanceIn/Out`.
- Attribute names: `Transaction.transaction_date`, `Loan.opened_date/due_date`, `LoanRepayment.payment_date`, `Budget.period_start`.
- Frontend: `api/client.js (request, ApiError, parseErrorDetail)`, `api/transactions|categories|settings.js`, `hooks/useCategories.js`, `components/ (Layout, ComingSoon, OpeningBalanceCard, TransactionForm, TransactionList, TransactionFilters)`, `pages/Transactions.jsx`, `utils/dates.js (todayISO)`.

## Status
- [x] Phase 1: skeleton, config, DB layer, models, seeding, utilities
- [x] Phase 2 (written): transactions API + validation, categories (list/add/delete API; add in UI), opening balance, React/Vite scaffold, layout/nav, form, history with filters/search/pagination, edit/delete, root-venv launcher
- [ ] Phase 3: dashboard service/endpoint/page (use `settings_service.get_opening_balance_kobo`); budgets with Week/Month toggle and calendar picker; move opening balance UI to dashboard; change `/` redirect to `/dashboard`
- [ ] Phase 4: analytics endpoints + 6 Recharts charts (add `recharts` to package.json); loans + repayments
- [ ] Phase 5: CSV + PDF (reportlab) in `exports/`; Alembic baseline in `app/migrations/`; full test pass; restart-persistence check; testing report

## Verified vs NOT verified
Verified in the sandbox (no internet; only Python stdlib + Node available): all Python compiles; 17 stdlib unit tests pass (money, dates, validation, .env loader); SQL constraint semantics checked in raw SQLite (Phase 1); frontend `.js` files pass `node --check`; `parseErrorDetail`, `todayISO` and `request()` (with a mocked fetch) pass.
NOT run anywhere yet: SQLAlchemy models/repositories/services/routers, FastAPI app, `tests/test_database.py`, `tests/test_api.py` (needs `pytest`), all `.jsx` files, Vite build/dev server, `run_finlog.bat`. The user must run these first; fix whatever they report before starting Phase 3.

## Known limitations / open items
- Tables come from `create_all` (cannot alter existing tables). Alembic baseline in `backend/app/migrations/` must be done BEFORE the user enters real data; tell the user not to enter real data until then.
- No backup routine yet (`data/backups/` unused).
- UI can add custom categories but not delete them (API supports delete).
- Opening-balance card is temporarily on the Transactions page.
