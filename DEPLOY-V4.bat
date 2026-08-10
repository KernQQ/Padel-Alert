@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo PadelAlert v4 - build + git deploy
echo ========================================

echo [1/4] Frontend build...
cd frontend
call npm run build
if errorlevel 1 goto :fail
cd ..

echo [2/4] Git status...
git status --short

echo [3/4] Commit...
git add frontend backend *.bat *.yml *.txt *.md .gitignore
 git diff --cached --quiet
if %errorlevel%==0 (
  echo Brak nowych zmian do commita.
) else (
  git commit -m "PadelAlert v4 Public Beta"
  if errorlevel 1 goto :fail
)

echo [4/4] Push...
git push origin main
if errorlevel 1 goto :fail

echo.
echo GOTOWE. Render powinien uruchomic Auto-Deploy.
pause
exit /b 0

:fail
echo.
echo BLAD - zatrzymano wdrozenie. Sprawdz komunikat wyzej.
pause
exit /b 1
