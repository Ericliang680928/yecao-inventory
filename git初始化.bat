@echo off
chcp 65001 >nul
echo ========================================
echo  野草盤點系統 - Git 初始化
echo ========================================

cd /d "%~dp0"

:: 清除剛才破損的 .git（如果存在）
if exist ".git" (
    echo 清除舊的 .git 目錄...
    rmdir /s /q .git
)

:: 初始化 git
echo.
echo [1/4] 初始化 git 儲存庫...
git init -b main

:: 設定使用者
git config user.email "ericliang680928@gmail.com"
git config user.name "Liang"

:: 加入所有檔案
echo.
echo [2/4] 加入所有檔案...
git add .

:: 第一次 commit
echo.
echo [3/4] 建立初始 commit...
git commit -m "初始提交：野草倉庫盤點系統"

echo.
echo [4/4] 完成！
echo.
echo ========================================
echo  接下來請：
echo  1. 到 https://github.com/new 建立新 repo
echo     名稱建議：yecao-inventory
echo     選 Private（私有）
echo     不要勾選任何初始檔案
echo  2. 複製 repo 的 HTTPS 網址，執行 git推送.bat
echo ========================================
echo.
pause
