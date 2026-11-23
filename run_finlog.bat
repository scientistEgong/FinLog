@echo off
REM FinLog launcher (Phase 1: backend only; the frontend is added in Phase 2).
cd /d "%~dp0backend"

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment...
    py -m venv .venv
    if errorlevel 1 (
        echo Could not create the virtual environment. Is Python installed and on PATH?
        pause
        exit /b 1
    )
)

call ".venv\Scripts\activate.bat"
pip install -q -r requirements.txt
if errorlevel 1 (
    echo Dependency installation failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo FinLog API starting at http://localhost:8000  (API docs: http://localhost:8000/docs)
echo Press Ctrl+C to stop.
uvicorn app.main:app --reload --port 8000
pause
