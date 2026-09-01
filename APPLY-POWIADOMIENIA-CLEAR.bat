@echo off
setlocal
set "PATCH=%~dp0"
set "PROJECT=C:\PROJEKTY\Padel-Alert"
set "BACKUP=%PROJECT%\_backup-1.1-notifications-clear"

if not exist "%PROJECT%\frontend\src\App.jsx" (
  echo [BLAD] Nie znaleziono projektu: %PROJECT%
  pause
  exit /b 1
)

if exist "%BACKUP%" rmdir /s /q "%BACKUP%"
mkdir "%BACKUP%\frontend\src" >nul
mkdir "%BACKUP%\backend\src\routes" >nul
copy /y "%PROJECT%\frontend\src\App.jsx" "%BACKUP%\frontend\src\App.jsx" >nul
copy /y "%PROJECT%\backend\src\routes\community.js" "%BACKUP%\backend\src\routes\community.js" >nul

copy /y "%PATCH%frontend\src\App.jsx" "%PROJECT%\frontend\src\App.jsx" >nul
copy /y "%PATCH%backend\src\routes\community.js" "%PROJECT%\backend\src\routes\community.js" >nul

echo [1/2] Sprawdzam backend...
cd /d "%PROJECT%\backend"
node --check src\routes\community.js
if errorlevel 1 goto rollback

echo [2/2] Buduje frontend...
cd /d "%PROJECT%\frontend"
call npm run build
if errorlevel 1 goto rollback

echo.
echo GOTOWE. Czyszczenie powiadomien zostalo dodane.
choice /C TN /N /M "Wdrozyc teraz do GitHub? [T/N] "
if errorlevel 2 goto done
cd /d "%PROJECT%"
git add frontend/src/App.jsx backend/src/routes/community.js
git commit -m "PadelAlert 1.1 clear notifications"
if errorlevel 1 echo Brak nowych zmian do commita lub commit nie udal sie.
git push origin main
if errorlevel 1 echo [UWAGA] Push nie udal sie. Zmiany sa lokalnie - uruchom pozniej: git push origin main
goto done

:rollback
echo.
echo [BLAD] Test/build nie przeszedl. Przywracam poprzednie pliki...
copy /y "%BACKUP%\frontend\src\App.jsx" "%PROJECT%\frontend\src\App.jsx" >nul
copy /y "%BACKUP%\backend\src\routes\community.js" "%PROJECT%\backend\src\routes\community.js" >nul
echo Przywrocono poprzednia wersje. Git nie zostal ruszony.
pause
exit /b 1

:done
echo.
echo Koniec.
pause
