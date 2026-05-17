#!/bin/bash
cd "$(dirname "$0")"
echo "=== git 初始化 ==="
echo "目錄: $(pwd)"

# 清除舊 .git
if [ -d ".git" ]; then
    echo "清除舊 .git..."
    rm -rf .git
fi

# git init
git init -b main
if [ $? -ne 0 ]; then echo "ERROR: git init 失敗"; read; exit 1; fi

# 設定 user
git config user.email "ericliang680928@gmail.com"
git config user.name "Liang"

echo "config 設定完成"
cat .git/config

# git add
echo ""
echo "=== git add ==="
git add .
if [ $? -ne 0 ]; then echo "ERROR: git add 失敗"; read; exit 1; fi

# git commit
echo ""
echo "=== git commit ==="
git commit -m "初始提交：野草倉庫盤點系統"
if [ $? -ne 0 ]; then echo "ERROR: commit 失敗"; read; exit 1; fi

echo ""
echo "=== 完成！==="
git log --oneline -3
echo ""
echo "請按 Enter 結束..."
read
