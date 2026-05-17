@echo off
cd /d "%~dp0"
echo Stopping any existing serve on port 4173...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":4173" ^| find "LISTENING" 2^>nul') do (
    taskkill /F /PID %%a 2>nul
)
echo Starting frontend (production build)...
npx --yes serve dist -p 4173 -s
pause
