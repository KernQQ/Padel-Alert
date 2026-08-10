@echo off
setlocal
cd /d %~dp0

echo ============================================
echo PadelAlert v5 - build + Git deploy
echo ============================================
echo.

if not exist frontend\package.json (
  echo [INFO] Ta paczka jest nakladka na aktualny projekt.
  echo Rozpakuj jej zawartosc do C:\PROJEKTY\Padel-Alert
  echo i uruchom APPLY-V5.bat ponownie z tego folderu.
  pause
  exit /b 1
)

echo [1/4] Build frontendu...
cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Build nie przeszedl. Nic nie zostalo wyslane do GitHub.
  pause
  exit /b 1
)

cd ..

echo.
echo [2/4] Git status...
git status --short

echo.
echo [3/4] Commit...
git add frontend/src/App.jsx frontend/src/components/HomeDashboard.jsx frontend/src/config/app.js frontend/src/styles/app.css README-V5.txt VERSION.json
git commit -m "PadelAlert v5 consumer sports UI"
if errorlevel 1 (
  echo [INFO] Brak nowych zmian do commita albo commit juz istnieje.
)

echo.
echo [4/4] Push...
git push origin main
if errorlevel 1 (
  echo [BLAD] Git push nie przeszedl.
  pause
  exit /b 1
)

echo.
echo ============================================
echo GOTOWE. Render powinien rozpoczac auto-deploy.
echo ============================================
pause
