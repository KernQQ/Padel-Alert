@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "PROJECT=C:\PROJEKTY\Padel-Alert"
set "PATCH=%~dp0"
set "BACKUP=%PROJECT%\_backup-1.1-chat"

echo ==========================================
echo PadelAlert 1.1 - CHAT MECZU
echo ==========================================

if not exist "%PROJECT%\frontend\src\App.jsx" (
  echo BLAD: Nie znaleziono projektu: %PROJECT%
  pause
  exit /b 1
)

if not exist "%BACKUP%" mkdir "%BACKUP%\frontend\src\components\matches" >nul 2>&1
if not exist "%BACKUP%\frontend\src\components" mkdir "%BACKUP%\frontend\src\components" >nul 2>&1
if not exist "%BACKUP%\frontend\src\styles" mkdir "%BACKUP%\frontend\src\styles" >nul 2>&1
if not exist "%BACKUP%\backend\src\routes" mkdir "%BACKUP%\backend\src\routes" >nul 2>&1
if not exist "%BACKUP%\backend\src\services" mkdir "%BACKUP%\backend\src\services" >nul 2>&1

copy /Y "%PROJECT%\frontend\src\components\matches\MatchCenter.jsx" "%BACKUP%\frontend\src\components\matches\MatchCenter.jsx" >nul
copy /Y "%PROJECT%\frontend\src\components\MatchPage.jsx" "%BACKUP%\frontend\src\components\MatchPage.jsx" >nul
copy /Y "%PROJECT%\frontend\src\styles\app.css" "%BACKUP%\frontend\src\styles\app.css" >nul
copy /Y "%PROJECT%\backend\src\routes\matches.js" "%BACKUP%\backend\src\routes\matches.js" >nul
copy /Y "%PROJECT%\backend\src\routes\admin.js" "%BACKUP%\backend\src\routes\admin.js" >nul
copy /Y "%PROJECT%\backend\src\services\communityStore.js" "%BACKUP%\backend\src\services\communityStore.js" >nul

echo [1/4] Kopia bezpieczenstwa gotowa.

copy /Y "%PATCH%frontend\src\components\matches\MatchCenter.jsx" "%PROJECT%\frontend\src\components\matches\MatchCenter.jsx" >nul
copy /Y "%PATCH%frontend\src\components\MatchPage.jsx" "%PROJECT%\frontend\src\components\MatchPage.jsx" >nul
copy /Y "%PATCH%frontend\src\styles\app.css" "%PROJECT%\frontend\src\styles\app.css" >nul
copy /Y "%PATCH%backend\src\routes\matches.js" "%PROJECT%\backend\src\routes\matches.js" >nul
copy /Y "%PATCH%backend\src\routes\admin.js" "%PROJECT%\backend\src\routes\admin.js" >nul
copy /Y "%PATCH%backend\src\services\communityStore.js" "%PROJECT%\backend\src\services\communityStore.js" >nul

echo [2/4] Pliki 1.1 podmienione.

cd /d "%PROJECT%\backend"
node --check src\routes\matches.js || goto :fail
node --check src\routes\admin.js || goto :fail
node --check src\services\communityStore.js || goto :fail

cd /d "%PROJECT%\frontend"
call npm run build || goto :fail

echo [3/4] Build OK.
echo.
choice /C TN /M "Wdrozyc PadelAlert 1.1 do GitHub teraz? [T/N]"
if errorlevel 2 goto :done

cd /d "%PROJECT%"
git add frontend/src/components/matches/MatchCenter.jsx frontend/src/components/MatchPage.jsx frontend/src/styles/app.css backend/src/routes/matches.js backend/src/routes/admin.js backend/src/services/communityStore.js
git commit -m "PadelAlert 1.1 match chat"
git push origin main
if errorlevel 1 goto :pushfail

echo [4/4] Wyslano. Render moze teraz wdrozyc frontend i backend.
goto :done

:fail
echo.
echo BLAD BUILD. Przywracam pliki sprzed instalacji...
copy /Y "%BACKUP%\frontend\src\components\matches\MatchCenter.jsx" "%PROJECT%\frontend\src\components\matches\MatchCenter.jsx" >nul
copy /Y "%BACKUP%\frontend\src\components\MatchPage.jsx" "%PROJECT%\frontend\src\components\MatchPage.jsx" >nul
copy /Y "%BACKUP%\frontend\src\styles\app.css" "%PROJECT%\frontend\src\styles\app.css" >nul
copy /Y "%BACKUP%\backend\src\routes\matches.js" "%PROJECT%\backend\src\routes\matches.js" >nul
copy /Y "%BACKUP%\backend\src\routes\admin.js" "%PROJECT%\backend\src\routes\admin.js" >nul
copy /Y "%BACKUP%\backend\src\services\communityStore.js" "%PROJECT%\backend\src\services\communityStore.js" >nul
echo Przywrocono wersje 1.0. Nic nie wyslano.
pause
exit /b 1

:pushfail
echo.
echo Build byl OK, ale push sie nie udal. Pliki lokalne pozostaja w wersji 1.1.
echo Mozesz wyslac recznie: git push origin main
pause
exit /b 1

:done
echo.
echo GOTOWE.
echo Test: Mecze - Centrum meczu - Czat.
pause
