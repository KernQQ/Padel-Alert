@echo off
setlocal
cd /d "%~dp0"
set "ROOT=C:\PROJEKTY\Padel-Alert"
if not exist "%ROOT%\frontend\src\App.jsx" (
  echo [BLAD] Nie znaleziono projektu: %ROOT%
  pause
  exit /b 1
)
set "BACKUP=%ROOT%\_backup-padletic-rebrand"
if exist "%BACKUP%" rmdir /s /q "%BACKUP%"
mkdir "%BACKUP%\frontend\src\services"
mkdir "%BACKUP%\frontend\src\components\matches"
mkdir "%BACKUP%\frontend\public\icons"
copy /y "%ROOT%\frontend\src\App.jsx" "%BACKUP%\frontend\src\App.jsx" >nul
copy /y "%ROOT%\frontend\src\services\api.js" "%BACKUP%\frontend\src\services\api.js" >nul
for %%F in (AdminPanel.jsx AccountPanel.jsx InstallAppButton.jsx ErrorBoundary.jsx ConnectionBanner.jsx MatchmakerPanel.jsx) do copy /y "%ROOT%\frontend\src\components\%%F" "%BACKUP%\frontend\src\components\%%F" >nul
copy /y "%ROOT%\frontend\src\components\matches\MatchCenter.jsx" "%BACKUP%\frontend\src\components\matches\MatchCenter.jsx" >nul
copy /y "%ROOT%\frontend\public\manifest.webmanifest" "%BACKUP%\frontend\public\manifest.webmanifest" >nul
copy /y "%ROOT%\frontend\public\favicon.svg" "%BACKUP%\frontend\public\favicon.svg" >nul
for %%F in (icon-192.png icon-512.png icon-512-maskable.png) do copy /y "%ROOT%\frontend\public\icons\%%F" "%BACKUP%\frontend\public\icons\%%F" >nul
copy /y "%ROOT%\frontend\index.html" "%BACKUP%\frontend\index.html" >nul

xcopy /e /i /y "%~dp0frontend" "%ROOT%\frontend" >nul

echo.
echo [OK] Rebranding PADLETIC wgrany. Uruchamiam build...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Build nie przeszedl. Przywracam backup...
  xcopy /e /i /y "%BACKUP%\frontend" "%ROOT%\frontend" >nul
  echo [OK] Przywrocono poprzednia wersje.
  pause
  exit /b 1
)

echo.
echo [OK] Build przeszedl. PADLETIC gotowy do deployu.
echo.
set /p DEPLOY="Wykonac git add/commit/push teraz? [T/N]: "
if /I "%DEPLOY%"=="T" (
  cd /d "%ROOT%"
  git add frontend
  git commit -m "Rebrand PadelAlert to PADLETIC"
  git push origin main
)
echo.
echo Gotowe.
pause
