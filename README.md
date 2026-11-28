# FinLog

FinLog is a local-first personal finance tracker for Windows. The current implementation provides transaction management, categories, an all-time financial dashboard, opening-balance editing, weekly/monthly category budgets, and date-filtered analytics with weekly, monthly, and yearly views. Loans, repayments, and reports remain planned; some have database models, but their APIs and user workflows are not implemented.

Check [HANDOFF.md](HANDOFF.md) and [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md) for the recorded implementation and verification status. See [PROJECT_DOC.md](PROJECT_DOC.md) for the detailed file map, technology explanations, domain conventions, API summary, and roadmap.

The current appearance options, browser tab icon, and instructions for updating the icon are documented in [doc/UI_DESIGN.md](doc/UI_DESIGN.md).

## Requirements

- Windows
- Python 3.11 or later, available through `py`
- Node.js and npm

## Run the application

The simplest option is to double-click `run_finlog.bat` from the repository root. It creates the project-root `.venv` if needed, installs backend dependencies and frontend packages if needed, then starts both servers.

To run the services manually, create the project-root virtual environment once with `py -m venv .venv`, then open two terminals from the repository root.

Backend terminal:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Frontend terminal:

```powershell
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The API health endpoint is `http://127.0.0.1:8000/api/health`, and interactive API documentation is at `http://127.0.0.1:8000/docs`.

The frontend development server proxies `/api` requests to the backend. The database is created at `data/finlog.db` when the backend starts. Startup creates missing tables and seeds default categories when the category table is empty; it does not migrate existing tables.

## Run backend tests

From the repository root:

```powershell
cd backend
..\.venv\Scripts\python.exe -m pytest test
```

The test fixtures use temporary SQLite databases. Do not point tests at `data/finlog.db`.

## Financial data and limitations

Money is stored as integer kobo; API inputs use naira amounts, with values beyond two decimal places rejected. Weeks run Sunday through Saturday. The opening balance is a setting and is edited on the Dashboard. Analytics provides date-range views with weekly, monthly, and yearly trend grouping.

There is no Alembic migration baseline or automated backup/restore routine yet. Do not enter real financial records until migration and backup/restore readiness has been established. See [SECURITY.md](SECURITY.md) for data handling requirements.

## Project guidance

- [AGENTS.md](AGENTS.md): canonical coding-agent instructions.
- [CLAUDE.md](CLAUDE.md): Claude pointer to the canonical instructions.
- [CONTRIBUTING.md](CONTRIBUTING.md): contribution workflow and coding conventions.
- [HANDOFF.md](HANDOFF.md): project decisions, status, and verification history.
- [PROJECT_CHECKLIST.md](PROJECT_CHECKLIST.md): phased progress tracker.
- [PROJECT_DOC.md](PROJECT_DOC.md): detailed technical documentation.
