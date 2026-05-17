@echo off
cd /d "%~dp0server"
echo Stopping all node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul
if not exist node_modules (
    echo Installing packages...
    npm install
)
echo Starting backend server...
node index.js
pause
