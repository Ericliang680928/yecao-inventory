@echo off
chcp 65001 >nul
cd /d "%~dp0"

set LOGFILE=%~dp0build_log.txt
echo Build started: %DATE% %TIME% > "%LOGFILE%"
set TMP_DIR=%TEMP%\build_fix_%RANDOM%
mkdir "%TMP_DIR%"

:: ============================================================
:: Step 1: rollup native binary (win32-x64-msvc)
:: ============================================================
echo === Step 1: rollup native binary ===
set ROLLUP_VER=4.60.4
echo Downloading @rollup/rollup-win32-x64-msvc@%ROLLUP_VER% ...
curl -sL "https://registry.npmjs.org/@rollup/rollup-win32-x64-msvc/-/rollup-win32-x64-msvc-%ROLLUP_VER%.tgz" -o "%TMP_DIR%\rollup.tgz"
if %ERRORLEVEL% NEQ 0 ( echo [FAIL] rollup download failed. >> "%LOGFILE%" & pause & exit /b 1 )
tar -xzf "%TMP_DIR%\rollup.tgz" -C "%TMP_DIR%" --wildcards "package/*.node" 2>nul
copy /Y "%TMP_DIR%\package\rollup.win32-x64-msvc.node" "node_modules\rollup\dist\rollup.win32-x64-msvc.node" >nul
if %ERRORLEVEL% NEQ 0 ( echo [FAIL] rollup copy failed. >> "%LOGFILE%" & pause & exit /b 1 )
echo [OK] rollup binary placed.

:: ============================================================
:: Step 2: esbuild native binary (win32-x64)
:: ============================================================
echo === Step 2: esbuild native binary ===
set ESBUILD_VER=0.21.5
echo Downloading @esbuild/win32-x64@%ESBUILD_VER% ...
curl -sL "https://registry.npmjs.org/@esbuild/win32-x64/-/win32-x64-%ESBUILD_VER%.tgz" -o "%TMP_DIR%\esbuild.tgz"
if %ERRORLEVEL% NEQ 0 ( echo [FAIL] esbuild download failed. >> "%LOGFILE%" & pause & exit /b 1 )
mkdir "%TMP_DIR%\esbuild" 2>nul
tar -xzf "%TMP_DIR%\esbuild.tgz" -C "%TMP_DIR%\esbuild" 2>nul
if not exist "node_modules\@esbuild\win32-x64" mkdir "node_modules\@esbuild\win32-x64"
copy /Y "%TMP_DIR%\esbuild\package\esbuild.exe" "node_modules\@esbuild\win32-x64\esbuild.exe" >nul
copy /Y "%TMP_DIR%\esbuild\package\package.json" "node_modules\@esbuild\win32-x64\package.json" >nul
if %ERRORLEVEL% NEQ 0 ( echo [FAIL] esbuild copy failed. >> "%LOGFILE%" & pause & exit /b 1 )
echo [OK] esbuild binary placed.

:: ============================================================
:: Step 3: caniuse-lite data (both nested copies)
:: ============================================================
echo === Step 3: caniuse-lite data ===
echo Downloading caniuse-lite@1.0.30001792 ...
curl -sL "https://registry.npmjs.org/caniuse-lite/-/caniuse-lite-1.0.30001792.tgz" -o "%TMP_DIR%\caniuse.tgz"
if %ERRORLEVEL% NEQ 0 ( echo [FAIL] caniuse-lite download failed. >> "%LOGFILE%" & pause & exit /b 1 )
mkdir "%TMP_DIR%\caniuse" 2>nul
tar -xzf "%TMP_DIR%\caniuse.tgz" -C "%TMP_DIR%\caniuse" 2>nul

set CL_SRC=%TMP_DIR%\caniuse\package

:: Patch browserslist nested caniuse-lite
set BL_DEST=node_modules\browserslist\node_modules\caniuse-lite
if exist "%BL_DEST%" (
    xcopy /E /I /Y "%CL_SRC%\dist\lib" "%BL_DEST%\dist\lib\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\dist\unpacker" "%BL_DEST%\dist\unpacker\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\data\features" "%BL_DEST%\data\features\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\data\regions" "%BL_DEST%\data\regions\" >nul 2>&1
    copy /Y "%CL_SRC%\data\agents.js" "%BL_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\browsers.js" "%BL_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\browserVersions.js" "%BL_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\features.js" "%BL_DEST%\data\" >nul 2>&1
    echo [OK] browserslist caniuse-lite patched.
)

:: Patch autoprefixer nested caniuse-lite
set AP_DEST=node_modules\autoprefixer\node_modules\caniuse-lite
if exist "%AP_DEST%" (
    xcopy /E /I /Y "%CL_SRC%\dist\lib" "%AP_DEST%\dist\lib\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\dist\unpacker" "%AP_DEST%\dist\unpacker\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\data\features" "%AP_DEST%\data\features\" >nul 2>&1
    xcopy /E /I /Y "%CL_SRC%\data\regions" "%AP_DEST%\data\regions\" >nul 2>&1
    copy /Y "%CL_SRC%\data\agents.js" "%AP_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\browsers.js" "%AP_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\browserVersions.js" "%AP_DEST%\data\" >nul 2>&1
    copy /Y "%CL_SRC%\data\features.js" "%AP_DEST%\data\" >nul 2>&1
    echo [OK] autoprefixer caniuse-lite patched.
)

echo.
:: ============================================================
:: Step 4: npm run build
:: ============================================================
echo === Step 4: npm run build ===
call npm run build >> "%LOGFILE%" 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Build success! dist/ updated.
    echo [OK] Build success >> "%LOGFILE%"
) else (
    echo.
    echo [FAIL] Build failed. See build_log.txt for details.
    echo [FAIL] Build failed >> "%LOGFILE%"
)

rmdir /S /Q "%TMP_DIR%" 2>nul
echo.
echo Log saved to: %LOGFILE%
echo.
pause
