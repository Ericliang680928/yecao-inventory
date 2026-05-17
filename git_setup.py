import subprocess, os, shutil, sys

project = r'D:\米樂家\野草\盤點系統'
log_path = os.path.join(project, 'git_log.txt')

def log(msg):
    print(msg)
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def run(cmd, cwd=project, env=None):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', env=env)
    out = (r.stdout + r.stderr).strip()
    log(f'$ {" ".join(cmd)}\n{out}')
    return r.returncode

# 初始化 log
with open(log_path, 'w', encoding='utf-8') as f:
    f.write('=== git 初始化開始 ===\n\n')

log(f'工作目錄: {project}')
log(f'存在: {os.path.exists(project)}')

# 清除舊 .git
git_dir = os.path.join(project, '.git')
if os.path.exists(git_dir):
    log('[1] 清除舊 .git...')
    shutil.rmtree(git_dir, ignore_errors=True)
    if os.path.exists(git_dir):
        log('警告：.git 未完全清除，嘗試繼續')
    else:
        log('.git 清除成功')

# git init
log('\n[2] git init -b main...')
rc = run(['git', 'init', '-b', 'main'])
if rc != 0:
    log('ERROR: git init 失敗')
    input('按 Enter 結束')
    sys.exit(1)

# 直接寫 git config
log('\n[3] 寫入 git config...')
config_content = (
    '[core]\n'
    '\trepositoryformatversion = 0\n'
    '\tfilemode = false\n'
    '\tbare = false\n'
    '\tlogallrefupdates = true\n'
    '\tsymlinks = false\n'
    '\tignorecase = true\n'
    '[user]\n'
    '\temail = ericliang680928@gmail.com\n'
    '\tname = Liang\n'
)
config_path = os.path.join(project, '.git', 'config')
try:
    with open(config_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(config_content)
    log('config 寫入成功')
    # 驗證
    with open(config_path, 'r', encoding='utf-8') as f:
        content = f.read()
    log(f'config 內容驗證: {repr(content[:50])}')
except Exception as e:
    log(f'ERROR 寫 config: {e}')

# 刪 config.lock
lock = os.path.join(project, '.git', 'config.lock')
if os.path.exists(lock):
    try:
        os.remove(lock)
        log('config.lock 刪除成功')
    except Exception as e:
        log(f'config.lock 刪除失敗: {e}')

# git add
log('\n[4] git add...')
rc = run(['git', 'add', '.'])
if rc != 0:
    log('ERROR: git add 失敗')
    input('按 Enter 結束')
    sys.exit(1)

# git commit
log('\n[5] git commit...')
env = os.environ.copy()
env['GIT_AUTHOR_NAME'] = 'Liang'
env['GIT_AUTHOR_EMAIL'] = 'ericliang680928@gmail.com'
env['GIT_COMMITTER_NAME'] = 'Liang'
env['GIT_COMMITTER_EMAIL'] = 'ericliang680928@gmail.com'
rc = run(['git', 'commit', '-m', '初始提交：野草倉庫盤點系統'], env=env)
if rc != 0:
    log('ERROR: commit 失敗')
    input('按 Enter 結束')
    sys.exit(1)

# git log
log('\n[完成]')
run(['git', 'log', '--oneline', '-3'])

log('\n=== 全部完成！請查看上面輸出並執行 git推送.bat ===')
input('\n按 Enter 結束...')
