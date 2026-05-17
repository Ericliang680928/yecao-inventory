# Fix missing rollup native binary
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== Installing @rollup/rollup-win32-x64-msvc ==="

# Get rollup version
$rollupPkg = Get-Content "node_modules\rollup\package.json" | ConvertFrom-Json
$rollupVersion = $rollupPkg.version
Write-Host "Rollup version: $rollupVersion"

# Install the native package via npm
npm install "@rollup/rollup-win32-x64-msvc@$rollupVersion" --no-save --prefer-offline 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Preferred offline failed, trying online..."
    npm install "@rollup/rollup-win32-x64-msvc@$rollupVersion" --no-save 2>&1
}

# Verify
$nativePkg = "node_modules\@rollup\rollup-win32-x64-msvc"
if (Test-Path $nativePkg) {
    Write-Host "Package installed at: $nativePkg"
    Get-ChildItem $nativePkg | Select-Object Name
} else {
    Write-Host "Package not found at $nativePkg, trying alternative..."
    # Copy .node file directly
    $nodeFile = Get-ChildItem "node_modules\@rollup" -Recurse -Filter "*.node" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($nodeFile) {
        Write-Host "Found .node file: $($nodeFile.FullName)"
    }
}

Write-Host ""
Write-Host "=== Building ==="
npm run build
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Build success!"
} else {
    Write-Host "[FAIL] Build failed."
}

Read-Host "Press Enter to close"
