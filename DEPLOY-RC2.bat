@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert RC2 - REAL CLUB PHOTOS
echo =========================================
cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo [BLAD] Build nie przeszedl. Nic nie wyslano.
  pause
  exit /b 1
)
cd ..
git add frontend/src/components/HomeDashboard.jsx frontend/src/styles/app.css frontend/public/sw.js frontend/public/premium/club-1.jpg frontend/public/premium/club-2.jpg frontend/public/premium/club-3.jpg
git commit -m "PadelAlert RC2 real club photos"
git push origin main
if errorlevel 1 (
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)
echo.
echo GOTOWE - Render powinien rozpoczac auto-deploy.
pause
