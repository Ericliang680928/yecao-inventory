@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Deleting temporary/obsolete files...
del /Q "server\seed_products.js" 2>nul && echo [OK] server\seed_products.js deleted || echo (not found)
del /Q "寫入範例商品.bat" 2>nul && echo [OK] 寫入範例商品.bat deleted || echo (not found)
del /Q "fix_rollup.ps1" 2>nul && echo [OK] fix_rollup.ps1 deleted || echo (not found)
del /Q "清理暫存檔.bat" 2>nul

echo Done.
