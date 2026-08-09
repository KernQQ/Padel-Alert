@echo off
title PadelAlert Launcher

set ROOT=C:\PROJEKTY\Padel-Alert

start "PadelAlert Backend" cmd /k "cd /d %ROOT%\backend && npm run dev"

timeout /t 2 /nobreak >nul

start "PadelAlert Frontend" cmd /k "cd /d %ROOT%\frontend && npm run dev -- --host"

timeout /t 3 /nobreak >nul

start "" http://localhost:5173

echo.
echo ==========================================
echo   PadelAlert uruchomiony
echo ==========================================
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Telefon: uzyj adresu Network z okna Frontend.
echo.
timeout /t 3 /nobreak >nul
exit
