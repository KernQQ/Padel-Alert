@echo off
setlocal
cd /d %~dp0
echo =========================================
echo PadelAlert - RELEASE CLEANUP
echo =========================================
echo.
cd frontend
call npm run build
if errorlevel 1 (
  cd ..
  echo [BLAD] Build nie przeszedl. Nic nie wyslano.
  pause
  exit /b 1
)
cd ..
git add frontend/src/App.jsx
git commit -m "Remove BO5 test controls for release"
if errorlevel 1 echo [INFO] Brak nowych zmian albo commit juz istnieje.
git push origin main
if errorlevel 1 (
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)
echo.
echo GOTOWE - wersja premierowa wyslana.
pause
