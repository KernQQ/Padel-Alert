@echo off
taskkill /FI "WINDOWTITLE eq PadelAlert Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PadelAlert Frontend*" /T /F >nul 2>&1
exit
