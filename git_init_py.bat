@echo off
chcp 65001 >nul
cd /d "D:\米樂家\野草\盤點系統"
python -c "
import subprocess, os, shutil, sys

project = r'D:\米樂家\野草\盤點系統'
log_path = os.path.join(project, 'git_log.txt')

def run(cmd, cwd=project):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    out = r.stdout + r.stderr
    print(out)
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(f'CMD: {cmd}\n{out}\n---\n')
    return r.returncode

with open(log_path, 'w', encoding='utf-8') as f:
    f.write('=== git 初始化 ===\n')

# 清除舊 .git
git_dir = os.path.join(project, '.git')
if os.path.exists(git_dir):
    print('清除舊 .git...')
    shutil.rmtree(git_dir, ignore_errors=True)
    if os.path.exists(git_dir):
        print('警告：.git 未能完全清除，嘗試繼續...')

# git init
rc = run(['git', 'init', '-b', 'main'])
if rc != 0: sys.exit(1)

# 直接寫 git config（用 Python 確保正確編碼）
config_content = '''[core]
\trepositoryformatversion = 0
\tfilemode = false
\tbare = false
\tlogallrefupdates = true
\tsymlinks = false
\tignorecase = true
[user]
\temail = ericliang680928@gmail.com
\tname = Liang
'''
config_path = os.path.join(git_dir, 'config')
with open(config_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(config_content)
print('config 寫入完成')

# git add
rc = run(['git', 'add', '.'])
if rc != 0: sys.exit(1)

# git commit
env = os.environ.copy()
env['GIT_AUTHOR_NAME'] = 'Liang'
env['GIT_AUTHOR_EMAIL'] = 'ericliang680928@gmail.com'
env['GIT_COMMITTER_NAME'] = 'Liang'
env['GIT_COMMITTER_EMAIL'] = 'ericliang680928@gmail.com'
r = subprocess.run(['git', 'commit', '-m', '初始提交：野草倉庫盤點系統'],
    cwd=project, capture_output=True, text=True, encoding='utf-8', errors='replace', env=env)
print(r.stdout + r.stderr)
with open(log_path, 'a', encoding='utf-8') as f:
    f.write(f'COMMIT:\n{r.stdout}{r.stderr}\n---\n')

# git log
run(['git', 'log', '--oneline', '-3'])
print('=== 完成！請查看 git_log.txt ===')
"
echo.
echo 完成！請看 git_log.txt 的結果。
pause
