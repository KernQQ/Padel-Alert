@echo off
setlocal
chcp 65001 >nul
set "ROOT=C:\PROJEKTY\Padel-Alert"
set "PATCH=%~dp0"
set "BACKUP=%ROOT%\_backup-mobile-mecze-fix-v3"

echo === PadelAlert - MOBILE MECZE FIX V3 ===
if not exist "%ROOT%\frontend\src\components\MyMatchesPanel.jsx" (
  echo BLAD: Nie znaleziono projektu: %ROOT%
  pause
  exit /b 1
)

if exist "%BACKUP%" rmdir /s /q "%BACKUP%"
mkdir "%BACKUP%\frontend\src\components" >nul
mkdir "%BACKUP%\frontend\src\styles" >nul

copy /y "%ROOT%\frontend\src\components\MyMatchesPanel.jsx" "%BACKUP%\frontend\src\components\MyMatchesPanel.jsx" >nul
copy /y "%ROOT%\frontend\src\styles\app.css" "%BACKUP%\frontend\src\styles\app.css" >nul

copy /y "%PATCH%frontend\src\components\MyMatchesPanel.jsx" "%ROOT%\frontend\src\components\MyMatchesPanel.jsx" >nul
copy /y "%PATCH%frontend\src\styles\app.css" "%ROOT%\frontend\src\styles\app.css" >nul

echo Buduje frontend...
cd /d "%ROOT%\frontend"
call npm run build
if errorlevel 1 goto rollback

echo.
echo BUILD OK.
echo Sprawdz na mobile: polskie znaki, naglowek Mecze i brak zielonego 0.
echo.
set /p DEPLOY=Wdrozyc poprawke do GitHub teraz? [T/N]:
if /I not "%DEPLOY%"=="T" goto done

cd /d "%ROOT%"
git add frontend/src/components/MyMatchesPanel.jsx frontend/src/styles/app.css
git commit -m "Fix mobile matches layout and UTF-8"
if errorlevel 1 (
  echo Commit nie zostal utworzony lub nie bylo zmian.
)
git push origin main
if errorlevel 1 (
  echo UWAGA: push nie przeszedl. Poprawka zostaje lokalnie.
  echo Sprobuj pozniej: git push origin main
)
goto done

:rollback
echo.
echo BLAD: Build nie przeszedl. Przywracam pliki sprzed V3...
copy /y "%BACKUP%\frontend\src\components\MyMatchesPanel.jsx" "%ROOT%\frontend\src\components\MyMatchesPanel.jsx" >nul
copy /y "%BACKUP%\frontend\src\styles\app.css" "%ROOT%\frontend\src\styles\app.css" >nul
echo Rollback zakonczony. Nic nie wdrozono.
pause
exit /b 1

:done
echo.
echo Gotowe.
pause
