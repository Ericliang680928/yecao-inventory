Set-Location $PSScriptRoot
chcp 65001 | Out-Null

Write-Host "=== Git 初始化 ===" -ForegroundColor Cyan

# 1. 清除舊 .git
if (Test-Path ".git") {
    Write-Host "[1/5] 清除舊 .git..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".git"
}

# 2. git init
Write-Host "[2/5] git init -b main..." -ForegroundColor Yellow
& git init -b main
if ($LASTEXITCODE -ne 0) { Write-Host "git init 失敗！" -ForegroundColor Red; Read-Host "按 Enter 結束"; exit 1 }

# 3. 直接寫 config（繞過 lock 問題）
Write-Host "[3/5] 寫入 git config..." -ForegroundColor Yellow
$configContent = @"
[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
	symlinks = false
	ignorecase = true
[user]
	email = ericliang680928@gmail.com
	name = Liang
"@
[System.IO.File]::WriteAllText("$PSScriptRoot\.git\config", $configContent, [System.Text.Encoding]::UTF8)
Write-Host "config 寫入完成" -ForegroundColor Green

# 4. git add
Write-Host "[4/5] git add..." -ForegroundColor Yellow
& git add .
if ($LASTEXITCODE -ne 0) { Write-Host "git add 失敗！" -ForegroundColor Red; Read-Host "按 Enter 結束"; exit 1 }

# 5. git commit
Write-Host "[5/5] git commit..." -ForegroundColor Yellow
$env:GIT_AUTHOR_NAME = "Liang"
$env:GIT_AUTHOR_EMAIL = "ericliang680928@gmail.com"
$env:GIT_COMMITTER_NAME = "Liang"
$env:GIT_COMMITTER_EMAIL = "ericliang680928@gmail.com"
& git commit -m "初始提交：野草倉庫盤點系統"
if ($LASTEXITCODE -ne 0) { Write-Host "commit 失敗！" -ForegroundColor Red; Read-Host "按 Enter 結束"; exit 1 }

Write-Host ""
Write-Host "=== 完成！===" -ForegroundColor Green
& git log --oneline -3
Write-Host ""
Write-Host "接下來：到 https://github.com/new 建立 Private repo，再執行 git推送.bat" -ForegroundColor Cyan
Write-Host ""
Read-Host "按 Enter 結束"
