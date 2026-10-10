@echo off
title EV Battery Intelligence - Continuous Runner
color 0A
echo =====================================================================
echo       EV BATTERY INTELLIGENCE PLATFORM - PERMANENT LAUNCHER
echo =====================================================================
echo.
echo Starting Backend (FastAPI on Port 8000)...
start "EV Battery Backend" /min cmd /k "cd /d %~dp0backend && python -m uvicorn app:app --host 0.0.0.0 --port 8000"

echo Starting Frontend (Vite on Port 5173)...
start "EV Battery Frontend" /min cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =====================================================================
echo  Services are active:
echo   - Web Dashboard (Dev):       http://localhost:5173/
echo   - Web Dashboard (Prod/API):  http://localhost:8000/
echo   - API Documentation:         http://localhost:8000/docs
echo   - WebSocket Telemetry:       ws://localhost:8000/ws/telemetry
echo =====================================================================
echo.
pause
