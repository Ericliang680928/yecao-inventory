@echo off
cd /d "%~dp0"
if not exist node_modules (
    echo Installing packages...
    npm install
)
echo Running init...
node init-only.js
pause
