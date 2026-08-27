@echo off
setlocal
cd /d %~dp0

echo =========================================
echo PadelAlert RELEASE CANDIDATE 1 - TEST
echo =========================================
echo.

cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo.
  echo [BLAD] Frontend build nie przeszedl.
  echo Nic nie zostalo wyslane.
  pause
  exit /b 1
)
cd ..

echo.
echo [OK] RC1 przeszedl build.
echo Nic nie zostalo wyslane na GitHub.
pause
