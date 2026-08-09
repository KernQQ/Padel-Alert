@echo off
cd /d C:\PROJEKTY\Padel-Alert
docker compose -f docker-compose.postgres.yml up -d
pause
