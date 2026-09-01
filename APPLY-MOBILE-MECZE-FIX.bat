@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY-MOBILE-MECZE-FIX.ps1"
pause
