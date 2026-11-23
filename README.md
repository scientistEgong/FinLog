# FinLog
Finlog is a finacial assistant, designed to help track one's financial decisions.


# FinLog

Personal finance tracker: React frontend + FastAPI backend + SQLite. Web-first, designed to be wrapped for Android later (Capacitor).

> **Status: Phase 1 (backend foundation).** The frontend, transactions, dashboard, budgets, analytics, loans and reports come in later phases. See `HANDOFF.md`.

## Prerequisites (Windows)
- Python 3.11 or 3.12 (tick "Add Python to PATH"). Check: `py --version`
- Node.js LTS (needed from Phase 2). Check: `node --version`

## Run the backend (Command Prompt)
```
cd FinLog\backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Or just double-click `run_finlog.bat` in the FinLog folder.

Then open:
- http://localhost:8000/api/health  -> should show `{"status":"ok", ...}`
- http://localhost:8000/docs  -> interactive API docs

Your database is created automatically at `data\finlog.db` the first time the backend starts. It is never overwritten or reset on later starts.

## Run the tests
```
cd FinLog\backend
.venv\Scripts\activate
pytest
```
Tests use temporary databases and never touch `data\finlog.db`.

## Important notes
- All money is stored as integer kobo (1 naira = 100 kobo) and shown as e.g. ₦15,000.00.
- Weeks run Sunday to Saturday.
- Do not enter real financial data until the build is declared ready (see "Known limitations" in `HANDOFF.md`).
