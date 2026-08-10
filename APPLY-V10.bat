@echo off
setlocal
cd /d %~dp0

echo ============================================
echo PadelAlert v10 - Desktop A + Mobile B
echo ============================================
echo.

cd frontend
call npm run build
if errorlevel 1 (
  echo.
  echo [BLAD] Frontend build nie przeszedl. Nic nie wyslano.
  pause
  exit /b 1
)
cd ..

node --check backend\src\server.js
if errorlevel 1 (
  echo [BLAD] Backend ma blad skladni.
  pause
  exit /b 1
)

git add .
git commit -m "PadelAlert v10 desktop A mobile B"
if errorlevel 1 (
  echo [INFO] Brak nowych zmian albo commit juz istnieje.
)

git push origin main
if errorlevel 1 (
  echo [BLAD] Push nie przeszedl.
  pause
  exit /b 1
)

echo.
echo GOTOWE - Render powinien rozpoczac auto-deploy.
pause
