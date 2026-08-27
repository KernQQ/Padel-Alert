@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert ADMIN v1.1 - FIX LOGIN TEST
echo =========================================
echo.
cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo.
  echo [BLAD] Frontend build nie przeszedl.
  pause
  exit /b 1
)
cd ..
echo.
echo [OK] FIX LOGIN przeszedl build.
echo Nic nie zostalo wyslane na GitHub.
pause
