@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert Premium B v12 - DEPLOY
echo =========================================
echo.
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Build nie przeszedl. Push anulowany.
  pause
  exit /b 1
)
cd ..

node --check backend\src\server.js
if errorlevel 1 (
  echo [BLAD] Backend ma blad skladni. Push anulowany.
  pause
  exit /b 1
)

git add .
git commit -m "PadelAlert Premium B v12"
if errorlevel 1 (
  echo [INFO] Brak nowych zmian albo commit juz istnieje.
)

git push origin main
if errorlevel 1 (
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)

echo.
echo GOTOWE - Render powinien rozpoczac auto-deploy.
pause
