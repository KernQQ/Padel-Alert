@echo off
title PadelAlert Public Beta Check
set ROOT=C:\PROJEKTY\Padel-Alert

echo ==========================================
echo   PadelAlert v2.3 - Public Beta Check
echo ==========================================
echo.

echo [1] Backend health...
powershell -NoProfile -Command "try { $r=Invoke-RestMethod http://localhost:3000/health; Write-Host ('OK - API ' + $r.version) -ForegroundColor Green } catch { Write-Host 'BLAD - /health' -ForegroundColor Red }"

echo.
echo [2] Backend readiness...
powershell -NoProfile -Command "try { $r=Invoke-RestMethod http://localhost:3000/ready; if($r.ok){Write-Host ('OK - DB ' + $r.database.provider) -ForegroundColor Green}else{Write-Host 'BLAD - API niegotowe' -ForegroundColor Red} } catch { Write-Host 'BLAD - /ready' -ForegroundColor Red }"

echo.
echo [3] PostgreSQL...
docker ps --filter "name=padelalert-postgres" --format "table {{.Names}}\t{{.Status}}"

echo.
echo [4] Plik backend\.env...
if exist "%ROOT%\backend\.env" (
  echo OK - istnieje
) else (
  echo BLAD - brak backend\.env
)

echo.
echo Gotowe.
pause
