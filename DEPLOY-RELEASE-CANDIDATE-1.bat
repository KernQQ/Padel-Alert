@echo off
setlocal
cd /d %~dp0

echo =========================================
echo PadelAlert RELEASE CANDIDATE 1 - DEPLOY
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

git add frontend/src/components/HomeDashboard.jsx frontend/src/styles/app.css frontend/public/sw.js
git commit -m "PadelAlert release candidate 1 UI"
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
echo Po deployu zrob pelne odswiezenie strony.
pause
