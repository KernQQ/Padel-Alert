@echo off
setlocal
cd /d %~dp0

echo ===============================================
echo PadelAlert PREMIUM B - frontend only
echo Backend / BO5 / API nie sa ruszane.
echo ===============================================

if not exist frontend\src\App.jsx (
  echo [BLAD] Rozpakuj paczke do katalogu glownego Padel-Alert.
  pause
  exit /b 1
)

if not exist _backup-premium-b mkdir _backup-premium-b
copy /Y frontend\src\App.jsx _backup-premium-b\App.jsx >nul
copy /Y frontend\src\components\HomeDashboard.jsx _backup-premium-b\HomeDashboard.jsx >nul
copy /Y frontend\src\styles\app.css _backup-premium-b\app.css >nul

echo [1/3] Pliki sa na miejscu. Backend pozostaje bez zmian.
echo [2/3] Test build...
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Build nie przeszedl. NIE robie commita ani push.
  pause
  exit /b 1
)
cd ..

echo [3/3] Build OK.
echo.
echo Teraz mozesz sprawdzic git diff i wdrozyc swoim dotychczasowym sposobem.
echo Paczka celowo NIE robi automatycznego push, zeby niczego nie zepsuc.
pause
