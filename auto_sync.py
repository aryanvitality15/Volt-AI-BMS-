"""
Real-time Git Auto-Sync Watcher
Continuously monitors the workspace and automatically commits & pushes changes to GitHub.
"""

import os
import subprocess
import time
from datetime import datetime

# Workspace directory
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
# Check interval in seconds
CHECK_INTERVAL = 5
# Cooldown after push to prevent rapid loop (seconds)
DEBOUNCE_DELAY = 3

def run_git(cmd):
    try:
        res = subprocess.run(
            cmd,
            cwd=WORKSPACE_DIR,
            shell=True,
            capture_output=True,
            text=True
        )
        return res.returncode, res.stdout.strip(), res.stderr.strip()
    except Exception as e:
        return 1, "", str(e)

def has_changes():
    code, out, _ = run_git("git status --porcelain")
    return code == 0 and len(out) > 0

def sync():
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] 🔄 Changes detected! Syncing with GitHub...")
    
    # 1. Stage all changes
    code, _, err = run_git("git add .")
    if code != 0:
        print(f"[{timestamp}] ⚠️ git add failed: {err}")
        return

    # 2. Commit
    commit_msg = f"Auto-sync: update from Antigravity IDE ({timestamp})"
    code, out, err = run_git(f'git commit -m "{commit_msg}"')
    if code != 0:
        if "nothing to commit" not in (out + err):
            print(f"[{timestamp}] ⚠️ git commit failed: {err}")
        return

    # 3. Push to remote
    print(f"[{timestamp}] 🚀 Pushing to origin main...")
    code, out, err = run_git("git push origin main")
    if code == 0:
        print(f"[{timestamp}] ✅ Successfully pushed to GitHub!")
    else:
        print(f"[{timestamp}] ⚠️ Push failed: {err or out}")

def main():
    print("=" * 60)
    print("⚡ Auto-Sync Watcher Started for Antigravity IDE")
    print(f"📁 Monitoring: {WORKSPACE_DIR}")
    print(f"⏱️ Check interval: {CHECK_INTERVAL}s")
    print("Press Ctrl+C to stop at any time.")
    print("=" * 60)

    # Initial sync if there are pending uncommitted changes
    if has_changes():
        sync()

    while True:
        try:
            time.sleep(CHECK_INTERVAL)
            if has_changes():
                time.sleep(DEBOUNCE_DELAY)  # wait a moment for multiple file saves to settle
                if has_changes():
                    sync()
        except KeyboardInterrupt:
            print("\n🛑 Auto-sync stopped.")
            break
        except Exception as e:
            print(f"Unexpected error: {e}")
            time.sleep(CHECK_INTERVAL)

if __name__ == "__main__":
    main()
