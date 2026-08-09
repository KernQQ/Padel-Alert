@echo off
title Restart PadelAlert

set ROOT=C:\PROJEKTY\Padel-Alert

echo Restartowanie PadelAlert...

taskkill /FI "WINDOWTITLE eq PadelAlert Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PadelAlert Frontend*" /T /F >nul 2>&1

timeout /t 2 /nobreak >nul

start "PadelAlert Backend" cmd /k "cd /d %ROOT%\backend && npm run dev"
timeout /t 2 /nobreak >nul
start "PadelAlert Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev -- --host"

timeout /t 3 /nobreak >nul
start "" http://localhost:5173

exit
