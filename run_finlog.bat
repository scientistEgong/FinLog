@echo off
REM FinLog launcher: starts the FastAPI backend and the React frontend in two windows.
REM Python virtual environment lives in the project root (FinLog\.venv).
set "ROOT=%~dp0"
cd /d "%ROOT%"

where py >nul 2>&1
if errorlevel 1 (
    echo Python launcher was not found. Install Python 3.11 or later and select "Add Python to PATH".
    pause
    exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js was not found. Install the current Node.js LTS release, then run this launcher again.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm was not found. Reinstall Node.js LTS, then run this launcher again.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating Python virtual environment in %ROOT%.venv ...
    py -m venv .venv
    if errorlevel 1 (
        echo Could not create the virtual environment. Is Python installed and on PATH?
        pause
        exit /b 1
    )
)

".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r backend\requirements.txt
if errorlevel 1 (
    echo Backend dependency installation failed. Check your internet connection.
    pause
    exit /b 1
)

if not exist "frontend\node_modules\vite\bin\vite.js" (
    echo Installing frontend packages...
    pushd frontend
    if exist "package-lock.json" (
        call npm.cmd ci
    ) else (
        call npm.cmd install
    )
    if errorlevel 1 (
        echo Frontend dependency installation failed. Check your internet connection and try again.
        popd
        pause
        exit /b 1
    )
    popd
)

start "FinLog Backend" /d "%ROOT%backend" cmd /d /k call "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
start "FinLog Frontend" /d "%ROOT%frontend" cmd /d /k call npm.cmd run dev

echo.
echo FinLog is starting. Your browser should open in a few seconds.
echo   App:      http://localhost:5173
echo   API docs: http://127.0.0.1:8000/docs
echo Close the two FinLog windows to stop.
timeout /t 8 >nul
start http://localhost:5173
