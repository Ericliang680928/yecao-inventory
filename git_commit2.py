import subprocess, os, sys

project = r'D:\米樂家\野草\盤點系統'
log_path = os.path.join(project, 'git_log2.txt')

def log(msg):
    print(msg)
    with open(log_path, 'a', encoding='utf-8') as f:
        f.write(msg + '\n')

def run(cmd, env=None):
    r = subprocess.run(cmd, cwd=project, capture_output=True, text=True,
                       encoding='utf-8', errors='replace', env=env)
    out = (r.stdout + r.stderr).strip()
    log(f'$ {" ".join(cmd)}\n{out}')
    return r.returncode, out

with open(log_path, 'w', encoding='utf-8') as f:
    f.write('=== git commit 雙向同步功能 ===\n\n')

log(f'工作目錄: {project}')

# 確認 git 狀態
rc, out = run(['git', 'status', '--short'])
log(f'\n變更的檔案:\n{out}')

# git add
log('\n[1] git add -A...')
rc, out = run(['git', 'add', '-A'])
if rc != 0:
    log(f'ERROR: git add 失敗\n{out}')
    input('按 Enter 結束')
    sys.exit(1)

# git commit
log('\n[2] git commit...')
env = os.environ.copy()
env['GIT_AUTHOR_NAME'] = 'Liang'
env['GIT_AUTHOR_EMAIL'] = 'ericliang680928@gmail.com'
env['GIT_COMMITTER_NAME'] = 'Liang'
env['GIT_COMMITTER_EMAIL'] = 'ericliang680928@gmail.com'
rc, out = run(['git', 'commit', '-m', 'feat: 雙向同步 - 單位欄位 + 結案寫回庫存現況工作表'], env=env)
if rc != 0:
    log(f'ERROR: commit 失敗\n{out}')
    input('按 Enter 結束')
    sys.exit(1)

# git log
log('\n[完成] 最近提交:')
run(['git', 'log', '--oneline', '-3'])

log('\n=== 完成！接下來可以推送到 GitHub ===')
input('\n按 Enter 結束...')
