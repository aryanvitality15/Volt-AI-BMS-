"""
EV BATTERY INTELLIGENCE - PERMANENT PROCESS WATCHDOG
Monitors and runs both Backend (FastAPI :8000) and Frontend (Vite :5173).
Automatically restarts any service if it exits or crashes.
"""

import subprocess
import sys
import time
import os
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

processes = {}

def start_backend():
    print("[WATCHDOG] Starting FastAPI Backend on http://0.0.0.0:8000...")
    p = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR
    )
    return p

def start_frontend():
    print("[WATCHDOG] Starting Vite Frontend on http://localhost:5173...")
    shell_cmd = "npm run dev"
    p = subprocess.Popen(shell_cmd, shell=True, cwd=FRONTEND_DIR)
    return p

def main():
    print("=" * 65)
    print("   EV BATTERY INTELLIGENCE - PERMANENT 24/7 WATCHDOG RUNNER")
    print("=" * 65)
    print(f"Project Directory: {ROOT_DIR}")
    print("Dashboard URLs:")
    print("  - Frontend (Dev Mode):      http://localhost:5173/")
    print("  - Backend & Dashboard:      http://localhost:8000/")
    print("  - Swagger API Docs:         http://localhost:8000/docs")
    print("=" * 65)

    processes["backend"] = start_backend()
    processes["frontend"] = start_frontend()

    try:
        while True:
            time.sleep(3)
            # Check backend health
            if processes["backend"].poll() is not None:
                print(f"[WATCHDOG] Backend exited with code {processes['backend'].returncode}. Restarting immediately...")
                processes["backend"] = start_backend()

            # Check frontend health
            if processes["frontend"].poll() is not None:
                print(f"[WATCHDOG] Frontend exited with code {processes['frontend'].returncode}. Restarting immediately...")
                processes["frontend"] = start_frontend()

    except KeyboardInterrupt:
        print("\n[WATCHDOG] Stopping services gracefully...")
        for name, p in processes.items():
            try:
                p.terminate()
            except Exception:
                pass
        print("[WATCHDOG] All services stopped.")

if __name__ == "__main__":
    main()
