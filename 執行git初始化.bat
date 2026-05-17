@echo off
chcp 65001 >nul
echo === 執行 git 初始化 ===
cd /d "D:\米樂家\野草\盤點系統"
echo 目前目錄: %CD%

where python >nul 2>&1
if errorlevel 1 (
    echo Python 未找到！嘗試 py 指令...
    where py >nul 2>&1
    if errorlevel 1 (
        echo py 也未找到！請確認 Python 已安裝。
        pause
        exit /b 1
    )
    py git_setup.py
) else (
    python git_setup.py
)

if errorlevel 1 (
    echo.
    echo Python 腳本執行失敗！
)
pause
