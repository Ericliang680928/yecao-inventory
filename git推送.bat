@echo off
chcp 65001 >nul
echo ========================================
echo  野草盤點系統 - 推送到 GitHub
echo ========================================

cd /d "%~dp0"

set /p REPO_URL="請貼上 GitHub Repo 的 HTTPS 網址: "

if "%REPO_URL%"=="" (
    echo 未輸入網址，結束。
    pause
    exit /b
)

echo.
echo [1/2] 設定遠端 origin...
git remote remove origin 2>nul
git remote add origin %REPO_URL%

echo [2/2] 推送到 GitHub...
git push -u origin main

echo.
echo ========================================
echo  推送完成！
echo.
echo  接下來請到 https://railway.app 部署：
echo  1. 登入 Railway（用 GitHub 帳號）
echo  2. New Project → Deploy from GitHub repo
echo  3. 選擇剛推送的 repo
echo  4. 等系統偵測，點 Deploy
echo  5. 完成後到 Variables 設定環境變數
echo     （詳見 RAILWAY_ENV.txt）
echo ========================================
echo.
pause
