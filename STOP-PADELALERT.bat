@echo off
title Stop PadelAlert

echo Zatrzymywanie PadelAlert...

taskkill /FI "WINDOWTITLE eq PadelAlert Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PadelAlert Frontend*" /T /F >nul 2>&1

echo.
echo PadelAlert zatrzymany.
timeout /t 2 /nobreak >nul
exit
