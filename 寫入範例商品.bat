@echo off
cd /d "%~dp0server"
echo 寫入範例商品至來源試算表...
node seed_products.js
echo.
echo 完成！請回到盤點系統執行「立即同步產品清單」
pause
