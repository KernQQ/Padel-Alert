@echo off
setlocal
cd /d %~dp0
echo ============================================
echo PadelAlert v8 - Fresh Desktop Mobile
echo ============================================
cd frontend
call npm run build
if errorlevel 1 (echo [BLAD] Frontend build nie przeszedl.& pause & exit /b 1)
cd ..
node --check backend\src\server.js
if errorlevel 1 (echo [BLAD] Backend ma blad skladni.& pause & exit /b 1)
git status --short
git add .
git commit -m "PadelAlert v8 fresh desktop mobile"
git push origin main
if errorlevel 1 (echo [BLAD] Push nie przeszedl.& pause & exit /b 1)
echo GOTOWE - Render powinien rozpoczac auto-deploy.
pause
