@echo off
setlocal
cd /d %~dp0
echo ============================================
echo PadelAlert v9 - Desktop Full Scale
echo ============================================
cd frontend
call npm run build
if errorlevel 1 (
 echo [BLAD] Frontend build nie przeszedl.
 pause
 exit /b 1
)
cd ..
node --check backend\src\server.js
if errorlevel 1 (
 echo [BLAD] Backend syntax.
 pause
 exit /b 1
)
git add .
git commit -m "PadelAlert v9 desktop full scale"
git push origin main
if errorlevel 1 (
 echo [BLAD] Push nie przeszedl.
 pause
 exit /b 1
)
echo.
echo GOTOWE - Render powinien rozpoczac auto-deploy.
pause
