@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert ADMIN v1.1 - FIX LOGIN DEPLOY
echo =========================================
echo.

cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo [BLAD] Build nie przeszedl. Push anulowany.
  pause
  exit /b 1
)
cd ..

git add frontend/src/components/AccountPanel.jsx
git commit -m "Fix account login modal closing"
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
