@echo off
title PadelAlert PostgreSQL Setup
set ROOT=C:\PROJEKTY\Padel-Alert

echo.
echo ==========================================
echo  PadelAlert - instalacja PostgreSQL
echo ==========================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo [BLAD] Nie znaleziono Docker Desktop.
  echo Zainstaluj Docker Desktop i uruchom ten plik ponownie.
  pause
  exit /b 1
)

echo [1/3] Instalacja sterownika PostgreSQL dla Node...
cd /d %ROOT%\backend
call npm install pg
if errorlevel 1 goto error

echo [2/3] Uruchamianie PostgreSQL...
cd /d %ROOT%
docker compose -f docker-compose.postgres.yml up -d
if errorlevel 1 goto error

echo [3/3] Gotowe.
echo.
echo Teraz utworz lub uzupeln plik:
echo %ROOT%\backend\.env
echo.
echo Dodaj:
echo DATABASE_URL=postgresql://padelalert:padelalert_dev@localhost:5432/padelalert
echo PG_SSL=false
echo.
echo Przy pierwszym uruchomieniu obecne community.json zostanie
echo automatycznie zaimportowane do PostgreSQL.
echo.
pause
exit /b 0

:error
echo.
echo [BLAD] Instalacja nie powiodla sie.
pause
exit /b 1
