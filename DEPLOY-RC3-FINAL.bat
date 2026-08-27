@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert RC3 FINAL
echo =========================================
echo.
cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo.
  echo [BLAD] Build nie przeszedl. Nic nie wyslano.
  pause
  exit /b 1
)
cd ..
git add frontend/src/styles/app.css frontend/public/sw.js
git commit -m "PadelAlert RC3 final mobile and desktop polish"
if errorlevel 1 echo [INFO] Brak nowych zmian albo commit juz istnieje.
git push origin main
if errorlevel 1 (
  echo.
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)
echo.
echo GOTOWE - Render powinien rozpoczac auto-deploy.
echo Po deployu odswiez strone na telefonie.
pause
