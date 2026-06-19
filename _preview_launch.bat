@echo off
REM Wrapper so the preview tool can launch the dashboard with Node on PATH.
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "G:\Automation\PACTS\PACTS_Dashboard"
npm run preview -- --port 5173 --host
