@echo off
setlocal
cd /d %~dp0

echo =========================================
echo PadelAlert ADMIN v1 - DEPLOY
echo =========================================
echo.

call TEST-ADMIN-v1.bat
if errorlevel 1 (
  echo Deploy anulowany.
  pause
  exit /b 1
)

git add .
git commit -m "PadelAlert Admin v1"
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
echo Pamietaj o ustawieniu ADMIN_EMAILS w Render Environment.
pause
