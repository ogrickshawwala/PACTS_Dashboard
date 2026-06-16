@echo off
rem ============================================================
rem  PACTS Dashboard dev server (Vite).
rem
rem  Double-click this, or run it from a terminal, to start the
rem  dashboard in its OWN window. It then runs independently -
rem  closing this window stops it; nothing else will.
rem
rem  URLs:  http://localhost:5173   (this machine)
rem         http://10.1.75.10:5173  (other machines on the LAN)
rem
rem  The API endpoint is read from .env.local (VITE_PACTS_API_URL).
rem ============================================================
setlocal
set "ROOT=%~dp0"

rem Node is not on the persistent PATH; add it for this session.
set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "%ROOT%"

if not exist "%ROOT%node_modules" (
    echo [PACTS] node_modules missing - installing dependencies first ...
    call npm install
)

echo [PACTS] Starting dashboard dev server ...
echo [PACTS] Local:   http://localhost:5173
echo [PACTS] Network: http://10.1.75.10:5173
echo [PACTS] Leave this window open. Close it to stop the dashboard.
echo.
call npm run dev
