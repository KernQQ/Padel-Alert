@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert Premium B v12 - TEST
echo =========================================
echo.
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Build nie przeszedl. Nic nie zostalo wyslane.
  pause
  exit /b 1
)
cd ..
echo.
echo [OK] Frontend build przeszedl.
echo Backend / BO5 nie byly modyfikowane.
pause
