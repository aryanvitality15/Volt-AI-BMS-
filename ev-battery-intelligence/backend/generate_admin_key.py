#!/usr/bin/env python3
"""
VOLT AI - ADMIN KEY GENERATOR CLI
Generates cryptographically secure 256-bit Admin Access Keys,
registers their cryptographic hashes in the SQLite database,
and outputs credentials for Fleet Administrators.
"""

import sys
import os

# Ensure backend directory is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from config import settings
import database as db

def main():
    print("=" * 70)
    print("VOLT AI - NEURAL BATTERY LAB : ADMIN ACCESS KEY GENERATOR")
    print("=" * 70)

    # 1. Ensure migrations and schema exist
    conn = db.get_db_connection()
    conn.close()

    # 2. Show Master Key from Config
    master_key = settings.ADMIN_ACCESS_KEY
    print("\n[+] PRIMARY MASTER ADMIN KEY (From Environment):")
    print(f"    Key:   {master_key}")
    print(f"    Role:  Fleet Admin")
    print(f"    Scope: Full System & Multi-Battery Authority")

    # 3. Generate a Fresh Dedicated Admin Key
    new_key = db.generate_new_admin_key(
        name="CLI Generated Fleet Admin Key",
        created_by="cli-operator",
        expires_days=365
    )

    print("\n[+] NEW DEDICATED ADMIN KEY GENERATED & REGISTERED IN DB:")
    print(f"    Key:        {new_key}")
    print(f"    Role:       Fleet Admin")
    print(f"    Validity:   365 Days")
    print(f"    Algorithm:  SHA-256 Registered Hash")

    print("\n" + "-" * 70)
    print("HOW TO LOGIN WITH THIS KEY:")
    print("  1. Open Volt AI Login Gateway: https://ev-battery-intelligence-rose.vercel.app")
    print("  2. Select the 'Admin Key' tab (Shield Icon)")
    print(f"  3. Paste either Key: {master_key} or {new_key}")
    print("  4. Click 'Authenticate with Admin Key'")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
