@echo off
chcp 65001 >nul
echo ========================================
echo  野草盤點系統 - Git 初始化 (v2)
echo ========================================
cd /d "%~dp0"

echo [1/5] 清除舊的 .git 目錄...
if exist ".git" (
    attrib -r -s -h .git /s /d >nul 2>&1
    rmdir /s /q .git
    if exist ".git" echo 警告：.git 仍存在，嘗試繼續...
)

echo [2/5] 執行 git init...
git init -b main
if errorlevel 1 (
    echo 錯誤：git init 失敗！請確認 git 已安裝。
    pause & exit /b 1
)

echo [3/5] 直接寫入 git config（繞過鎖定問題）...
del /f /q .git\config.lock >nul 2>&1
(
echo [core]
echo 	repositoryformatversion = 0
echo 	filemode = false
echo 	bare = false
echo 	logallrefupdates = true
echo 	symlinks = false
echo 	ignorecase = true
echo [user]
echo 	email = ericliang680928@gmail.com
echo 	name = Liang
) > .git\config

echo [4/5] git add...
git add .
if errorlevel 1 ( echo 錯誤：git add 失敗！ & pause & exit /b 1 )

echo [5/5] git commit...
git -c user.email="ericliang680928@gmail.com" -c user.name="Liang" commit -m "初始提交：野草倉庫盤點系統"
if errorlevel 1 ( echo 錯誤：commit 失敗！ & pause & exit /b 1 )

echo.
echo ========================================
echo  Git 初始化完成！
echo  接下來請到 https://github.com/new 建立 repo
echo  然後執行 git推送.bat
echo ========================================
echo.
git log --oneline -3
echo.
pause
