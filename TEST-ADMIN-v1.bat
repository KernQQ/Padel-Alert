@echo off
setlocal
cd /d %~dp0

echo =========================================
echo PadelAlert ADMIN v1 - TEST
echo =========================================
echo.

echo [1/4] Backend auth...
node --check backend\src\routes\auth.js
if errorlevel 1 goto :error

echo [2/4] Backend admin...
node --check backend\src\routes\admin.js
if errorlevel 1 goto :error

echo [3/4] Backend server...
node --check backend\src\server.js
if errorlevel 1 goto :error

echo [4/4] Frontend build...
cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  goto :error
)
cd ..

echo.
echo [OK] ADMIN v1 przeszedl test.
echo Nic nie zostalo wyslane na GitHub.
pause
exit /b 0

:error
echo.
echo [BLAD] Test nie przeszedl. Nie uruchamiaj deploy.
pause
exit /b 1
