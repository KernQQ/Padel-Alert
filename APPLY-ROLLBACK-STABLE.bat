@echo off
setlocal
cd /d %~dp0

echo ============================================
echo PadelAlert - ROLLBACK do stabilnej wersji v7
echo ============================================
echo.

echo [1/5] Build frontendu...
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Frontend build nie przeszedl.
  echo Nic nie zostalo wyslane do GitHub.
  pause
  exit /b 1
)
cd ..

echo.
echo [2/5] Sprawdzenie backendu...
node --check backend\src\server.js
if errorlevel 1 (
  echo [BLAD] Backend ma blad skladni.
  pause
  exit /b 1
)

echo.
echo [3/5] Git status...
git status --short

echo.
echo [4/5] Commit rollback...
git add .
git commit -m "Rollback PadelAlert to stable v7"
if errorlevel 1 (
  echo [INFO] Brak nowych zmian albo commit juz istnieje.
)

echo.
echo [5/5] Push...
git push origin main
if errorlevel 1 (
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)

echo.
echo ============================================
echo GOTOWE - Render powinien rozpoczac auto-deploy.
echo ============================================
pause
