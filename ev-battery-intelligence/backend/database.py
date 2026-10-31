"""
EV BATTERY INTELLIGENCE - DATABASE ENGINE
SQLite schema management, indexing, connection pooling, optimized queries,
real authentication persistence, user-scoped battery tracking, and migration runner.
"""

import sqlite3
import os
import json
import uuid
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from config import settings
from auth import hash_password

logger = logging.getLogger(__name__)

_tables_initialized_paths = set()

def get_db_connection() -> sqlite3.Connection:
    db_path = settings.DATABASE_PATH
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=20.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for concurrent read/write performance
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    
    if db_path not in _tables_initialized_paths:
        _run_migrations(conn)
        _tables_initialized_paths.add(db_path)
        
    return conn

def _run_migrations(conn: sqlite3.Connection):
    """Executes safe, non-destructive migrations preserving existing records."""
    cursor = conn.cursor()
    
    # --- 1. Base Core Tables (if starting from scratch) ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS battery_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        cell_id INTEGER NOT NULL,
        voltage REAL NOT NULL,
        current REAL NOT NULL,
        temperature REAL NOT NULL,
        soc REAL NOT NULL,
        cycle INTEGER NOT NULL,
        capacity REAL NOT NULL,
        internal_resistance REAL NOT NULL,
        ambient_temperature REAL NOT NULL,
        mode TEXT NOT NULL,
        c_rate REAL DEFAULT 0.0,
        voltage_sag REAL DEFAULT 0.0,
        temp_rise REAL DEFAULT 0.0,
        cell_voltage_diff REAL DEFAULT 0.0
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_battery_data_ts ON battery_data(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_battery_data_cell ON battery_data(battery_id, cell_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS pack_telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        pack_voltage REAL NOT NULL,
        pack_current REAL NOT NULL,
        avg_temperature REAL NOT NULL,
        max_temperature REAL NOT NULL,
        min_temperature REAL NOT NULL,
        soc REAL NOT NULL,
        soh REAL NOT NULL,
        cycle INTEGER NOT NULL,
        max_cell_imbalance REAL NOT NULL,
        mode TEXT NOT NULL,
        risk_score REAL DEFAULT 0.0,
        risk_level TEXT DEFAULT 'NORMAL'
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pack_ts ON pack_telemetry(timestamp);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        estimated_soh REAL NOT NULL,
        predicted_rul INTEGER NOT NULL,
        rul_uncertainty INTEGER NOT NULL,
        eol_cycle INTEGER NOT NULL,
        is_anomaly INTEGER NOT NULL,
        anomaly_score REAL NOT NULL,
        fault_class TEXT NOT NULL,
        fault_confidence REAL NOT NULL,
        probable_cause TEXT,
        evidence TEXT,
        affected_cell INTEGER
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_predictions_ts ON predictions(timestamp);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        cell_id INTEGER,
        level TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT,
        recommended_action TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        resolved_at TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, timestamp);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS battery_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        details TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_battery ON battery_events(battery_id, event_type);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clean_telemetry_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        voltage_mean REAL NOT NULL,
        voltage_diff REAL NOT NULL,
        voltage_std REAL NOT NULL,
        current REAL NOT NULL,
        temp_avg REAL NOT NULL,
        temp_max REAL NOT NULL,
        temp_rise REAL NOT NULL,
        soc REAL NOT NULL,
        cycle REAL NOT NULL,
        resistance_growth REAL NOT NULL,
        voltage_sag REAL NOT NULL,
        capacity_fade REAL NOT NULL,
        target_soh REAL NOT NULL,
        is_anomaly INTEGER NOT NULL,
        fault_class INTEGER NOT NULL
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_clean_samples_ts ON clean_telemetry_samples(timestamp);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS battery_metadata (
        battery_id TEXT PRIMARY KEY,
        chemistry TEXT NOT NULL,
        rated_capacity REAL NOT NULL,
        nominal_voltage REAL NOT NULL,
        num_cells INTEGER NOT NULL,
        manufactured_date TEXT NOT NULL,
        initial_resistance REAL NOT NULL,
        initial_soh REAL NOT NULL
    );
    """)

    # --- 2. Authentication & User Management Tables ---
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'BMS Engineer',
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        last_login_at TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_uid ON users(user_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sessions_uid ON user_sessions(user_id);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reset_token TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        used INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(reset_token);")

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_hash TEXT UNIQUE NOT NULL,
        key_prefix TEXT NOT NULL,
        name TEXT DEFAULT 'Master Admin Key',
        created_at TEXT NOT NULL,
        created_by TEXT DEFAULT 'system',
        expires_at TEXT,
        role TEXT DEFAULT 'Fleet Admin',
        is_active INTEGER DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        last_used_at TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_admin_keys_hash ON admin_keys(key_hash);")

    # --- 3. Dynamic Column Migration (Safely Add to Existing Tables) ---
    def _add_column(table: str, column_name: str, column_type: str):
        cursor.execute(f"PRAGMA table_info({table});")
        columns = [row[1] for row in cursor.fetchall()]
        if column_name not in columns:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type};")
            logger.info(f"Migration: Added {column_name} to {table}")

    # Battery Metadata Extensions
    _add_column("battery_metadata", "owner_user_id", "TEXT")
    _add_column("battery_metadata", "battery_name", "TEXT")
    _add_column("battery_metadata", "battery_specs", "TEXT")
    _add_column("battery_metadata", "battery_config", "TEXT")
    _add_column("battery_metadata", "created_at", "TEXT")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_metadata_owner ON battery_metadata(owner_user_id);")

    # Pack Telemetry Extensions
    _add_column("pack_telemetry", "data_source", "TEXT DEFAULT 'PHYSICAL'")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_pack_battery_ts ON pack_telemetry(battery_id, timestamp);")

    # Cell Telemetry Extensions
    _add_column("battery_data", "data_source", "TEXT DEFAULT 'PHYSICAL'")

    # Predictions Extensions
    _add_column("predictions", "model_version", "TEXT DEFAULT 'v1.0.0'")
    _add_column("predictions", "prediction_metadata", "TEXT")

    # Alerts Extensions
    _add_column("alerts", "category", "TEXT DEFAULT 'SYSTEM'")
    _add_column("alerts", "severity", "TEXT DEFAULT 'MEDIUM'")
    _add_column("alerts", "acknowledged_at", "TEXT")
    _add_column("alerts", "acknowledged_by", "TEXT")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_battery ON alerts(battery_id, timestamp);")

    # --- 4. Seed Default Operator & Connect to EV-001 ---
    cursor.execute("SELECT user_id FROM users WHERE email = 'operator@voltbms.io';")
    default_user = cursor.fetchone()
    if not default_user:
        default_uid = f"usr_{uuid.uuid4().hex[:12]}"
        default_hash = hash_password("VoltBms2026!")
        now_iso = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO users (user_id, name, email, password_hash, role, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (default_uid, "Aryan Chaudhary", "operator@voltbms.io", default_hash, "BMS Engineer", now_iso, "ACTIVE"))
        operator_uid = default_uid
    else:
        operator_uid = default_user[0]

    # Check if EV-001 exists in metadata
    cursor.execute("SELECT battery_id, owner_user_id FROM battery_metadata WHERE battery_id = ?", (settings.BATTERY_ID,))
    ev_row = cursor.fetchone()
    if not ev_row:
        cursor.execute("""
        INSERT INTO battery_metadata (
            battery_id, chemistry, rated_capacity, nominal_voltage, num_cells,
            manufactured_date, initial_resistance, initial_soh, owner_user_id,
            battery_name, battery_specs, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            settings.BATTERY_ID,
            settings.CHEMISTRY,
            settings.RATED_CAPACITY_AH,
            round(settings.NOMINAL_CELL_VOLTAGE * settings.NUM_CELLS, 1),
            settings.NUM_CELLS,
            "2024-03-15",
            settings.NOMINAL_CELL_RESISTANCE_MOHM,
            100.0,
            operator_uid,
            "LFP 8S Prototype Alpha",
            "8S1P Prism LFP High-Rate Cells",
            datetime.now().isoformat()
        ))
    else:
        if not ev_row[1]:
            cursor.execute("UPDATE battery_metadata SET owner_user_id = ?, battery_name = 'LFP 8S Prototype Alpha' WHERE battery_id = ?", (operator_uid, settings.BATTERY_ID))

    # Seed default Fleet Admin
    cursor.execute("SELECT user_id FROM users WHERE email = 'admin@voltbms.io'")
    admin_row = cursor.fetchone()
    if not admin_row:
        cursor.execute("""
        INSERT INTO users (user_id, name, email, password_hash, role, created_at, status)
        VALUES ('usr_admin_master', 'Fleet Administrator', 'admin@voltbms.io', ?, 'Fleet Admin', ?, 'ACTIVE')
        """, (hash_password("VoltAdmin2026!"), datetime.now().isoformat()))

    # Seed default Admin Master Key
    import hashlib
    default_key_hash = hashlib.sha256(settings.ADMIN_ACCESS_KEY.encode()).hexdigest()
    cursor.execute("SELECT id FROM admin_keys WHERE key_hash = ?", (default_key_hash,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO admin_keys (key_hash, key_prefix, name, created_at, created_by, role, is_active)
        VALUES (?, ?, 'Primary Master Admin Key', ?, 'system', 'Fleet Admin', 1)
        """, (default_key_hash, settings.ADMIN_ACCESS_KEY[:10], datetime.now().isoformat()))

    conn.commit()
    logger.info("SQLite Database migrations and verification complete.")

def init_database():
    """Initializes tables, executes migrations, and logs state."""
    conn = get_db_connection()
    conn.close()

# ==========================================
# AUTHENTICATION & USER MANAGEMENT
# ==========================================

def create_user(name: str, email: str, password_hash: str, role: str = "BMS Engineer") -> Dict[str, Any]:
    """Creates a new registered user in persistent database and provisions default battery pack."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        clean_email = email.strip().lower()
        cursor.execute("SELECT user_id FROM users WHERE email = ?", (clean_email,))
        if cursor.fetchone():
            raise ValueError("An account with this email address already exists.")

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO users (user_id, name, email, password_hash, role, created_at, status)
        VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
        """, (user_id, name.strip(), clean_email, password_hash, role, now_iso))

        # Provision a primary battery pack for this user
        primary_battery_id = f"EV-{user_id[-4:].upper()}"
        cursor.execute("""
        INSERT INTO battery_metadata (
            battery_id, chemistry, rated_capacity, nominal_voltage, num_cells,
            manufactured_date, initial_resistance, initial_soh, owner_user_id,
            battery_name, battery_specs, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            primary_battery_id,
            settings.CHEMISTRY,
            settings.RATED_CAPACITY_AH,
            round(settings.NOMINAL_CELL_VOLTAGE * settings.NUM_CELLS, 1),
            settings.NUM_CELLS,
            now_iso[:10],
            settings.NOMINAL_CELL_RESISTANCE_MOHM,
            100.0,
            user_id,
            f"{name.split()[0]}'s Pack 01",
            f"Standard {settings.NUM_CELLS}S {settings.CHEMISTRY} Modular Pack",
            now_iso
        ))

        conn.commit()
        return {
            "user_id": user_id,
            "name": name.strip(),
            "email": clean_email,
            "role": role,
            "created_at": now_iso,
            "status": "ACTIVE",
            "primary_battery_id": primary_battery_id
        }
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by email."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves a user by unique user_id."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def update_user_password(user_id: str, new_password_hash: str) -> bool:
    """Updates user password hash and invalidates previous password reset requests."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (new_password_hash, user_id))
        cursor.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def update_user_last_login(user_id: str):
    """Updates timestamp of most recent successful login."""
    conn = get_db_connection()
    try:
        conn.execute("UPDATE users SET last_login_at = ? WHERE user_id = ?", (datetime.now().isoformat(), user_id))
        conn.commit()
    finally:
        conn.close()

# ==========================================
# SESSION MANAGEMENT
# ==========================================

def create_session(user_id: str, duration_days: int = 30, user_agent: Optional[str] = None, ip_address: Optional[str] = None) -> str:
    """Creates a persistent session token in the database."""
    conn = get_db_connection()
    try:
        from auth import generate_session_token
        token = generate_session_token()
        now = datetime.now()
        expires = now + timedelta(days=duration_days)
        conn.execute("""
        INSERT INTO user_sessions (session_token, user_id, created_at, expires_at, user_agent, ip_address)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (token, user_id, now.isoformat(), expires.isoformat(), user_agent, ip_address))
        conn.commit()
        return token
    finally:
        conn.close()

def get_session_user(session_token: str) -> Optional[Dict[str, Any]]:
    """Validates session token and returns user profile if session is active and unexpired."""
    if not session_token:
        return None
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT s.session_token, s.expires_at, u.user_id, u.name, u.email, u.role, u.status, u.created_at
        FROM user_sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.session_token = ?
        """, (session_token,))
        row = cursor.fetchone()
        if not row:
            return None

        # Check expiration
        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > expires_at:
            # Delete expired session
            conn.execute("DELETE FROM user_sessions WHERE session_token = ?", (session_token,))
            conn.commit()
            return None

        return {
            "session_token": row["session_token"],
            "user_id": row["user_id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "status": row["status"],
            "created_at": row["created_at"],
            "expires_at": row["expires_at"]
        }
    finally:
        conn.close()

def delete_session(session_token: str) -> bool:
    """Invalidates an active session token."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE session_token = ?", (session_token,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def delete_user_sessions(user_id: str) -> bool:
    """Invalidates all sessions for a given user."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_sessions WHERE user_id = ?", (user_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

# ==========================================
# PASSWORD RESET WORKFLOW
# ==========================================

def create_password_reset(user_id: str, expiry_minutes: int = 15) -> str:
    """Generates and records a cryptographically secure password reset token."""
    conn = get_db_connection()
    try:
        from auth import generate_reset_token
        token = generate_reset_token()
        now = datetime.now()
        expires = now + timedelta(minutes=expiry_minutes)
        # Invalidate any pending unused resets for this user
        conn.execute("UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0", (user_id,))
        conn.execute("""
        INSERT INTO password_resets (reset_token, user_id, created_at, expires_at, used)
        VALUES (?, ?, ?, ?, 0)
        """, (token, user_id, now.isoformat(), expires.isoformat()))
        conn.commit()
        return token
    finally:
        conn.close()

def verify_password_reset_token(reset_token: str) -> Optional[Dict[str, Any]]:
    """Checks validity of password reset token."""
    if not reset_token:
        return None
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT r.*, u.email, u.name
        FROM password_resets r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.reset_token = ? AND r.used = 0
        """, (reset_token,))
        row = cursor.fetchone()
        if not row:
            return None
        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now() > expires_at:
            return None
        return dict(row)
    finally:
        conn.close()

def mark_password_reset_used(reset_token: str) -> bool:
    """Marks a password reset token as used."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE password_resets SET used = 1 WHERE reset_token = ?", (reset_token,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

# ==========================================
# ADMIN ACCESS KEY MANAGEMENT
# ==========================================

def verify_admin_key(raw_key: str) -> Optional[Dict[str, Any]]:
    """Validates an Admin Key against the configured secret and admin_keys registry."""
    if not raw_key:
        return None
    clean_key = raw_key.strip()

    # Check master environment key
    if clean_key == settings.ADMIN_ACCESS_KEY:
        return {
            "key_prefix": clean_key[:10],
            "name": "Master Environment Admin Key",
            "role": "Fleet Admin",
            "is_active": 1
        }

    import hashlib
    key_hash = hashlib.sha256(clean_key.encode()).hexdigest()
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admin_keys WHERE key_hash = ? AND is_active = 1", (key_hash,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        if d.get("expires_at"):
            if datetime.now() > datetime.fromisoformat(d["expires_at"]):
                return None
        return d
    finally:
        conn.close()

def generate_new_admin_key(name: str = "Admin Key", created_by: str = "system", expires_days: Optional[int] = None) -> str:
    """Generates a cryptographically strong, formatted Admin Key and records its hash in DB."""
    import secrets
    import hashlib
    # Format: VOLT-ADM-XXXX-XXXX-XXXX-XXXX (24 alphanumeric random chars)
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    blocks = ["".join(secrets.choice(chars) for _ in range(4)) for _ in range(4)]
    key = f"VOLT-ADM-{'-'.join(blocks)}"

    key_hash = hashlib.sha256(key.encode()).hexdigest()
    expires_at = (datetime.now() + timedelta(days=expires_days)).isoformat() if expires_days else None

    conn = get_db_connection()
    try:
        conn.execute("""
        INSERT INTO admin_keys (key_hash, key_prefix, name, created_at, created_by, expires_at, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 'Fleet Admin', 1)
        """, (key_hash, key[:10], name, datetime.now().isoformat(), created_by, expires_at))
        conn.commit()
        return key
    finally:
        conn.close()

def login_with_admin_key(raw_key: str, ip_address: Optional[str] = None, user_agent: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Authenticates an admin using a verified Admin Key and returns session credentials."""
    key_info = verify_admin_key(raw_key)
    if not key_info:
        return None

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Ensure the master Fleet Admin user exists
        cursor.execute("SELECT * FROM users WHERE email = 'admin@voltbms.io'")
        admin_row = cursor.fetchone()
        if not admin_row:
            admin_uid = "usr_admin_master"
            now_iso = datetime.now().isoformat()
            cursor.execute("""
            INSERT INTO users (user_id, name, email, password_hash, role, created_at, status)
            VALUES (?, 'Fleet Administrator', 'admin@voltbms.io', ?, 'Fleet Admin', ?, 'ACTIVE')
            """, (admin_uid, hash_password("VoltAdmin2026!"), now_iso))
            conn.commit()
            admin_user = {
                "user_id": admin_uid,
                "name": "Fleet Administrator",
                "email": "admin@voltbms.io",
                "role": "Fleet Admin",
                "status": "ACTIVE"
            }
        else:
            admin_user = dict(admin_row)

        # Update admin key usage stats if stored in DB
        import hashlib
        key_hash = hashlib.sha256(raw_key.strip().encode()).hexdigest()
        cursor.execute("""
        UPDATE admin_keys SET usage_count = usage_count + 1, last_used_at = ? WHERE key_hash = ?
        """, (datetime.now().isoformat(), key_hash))
        conn.commit()
    finally:
        conn.close()

    # Create persistent session
    token = create_session(admin_user["user_id"], duration_days=30, user_agent=user_agent, ip_address=ip_address)
    return {
        "session_token": token,
        "user": {
            "user_id": admin_user["user_id"],
            "name": admin_user["name"],
            "email": admin_user["email"],
            "role": admin_user["role"]
        },
        "key_info": key_info
    }

# ==========================================
# BATTERY OWNERSHIP & SCOPED ACCESS
# ==========================================

def get_user_batteries(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all battery packs owned by or shared with a user."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Returns user-owned batteries and default EV-001 prototype
        cursor.execute("""
        SELECT * FROM battery_metadata
        WHERE owner_user_id = ? OR battery_id = ?
        ORDER BY CASE WHEN owner_user_id = ? THEN 0 ELSE 1 END, battery_id ASC
        """, (user_id, settings.BATTERY_ID, user_id))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

def verify_battery_ownership(user_id: str, battery_id: str) -> bool:
    """Checks if the user owns or has access to the specified battery pack."""
    if battery_id == settings.BATTERY_ID:
        return True  # Shared prototype pack is accessible for all verified operators
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT battery_id FROM battery_metadata WHERE battery_id = ? AND owner_user_id = ?", (battery_id, user_id))
        return cursor.fetchone() is not None
    finally:
        conn.close()

def create_user_battery(
    user_id: str,
    battery_id: str,
    battery_name: Optional[str] = None,
    chemistry: str = "LFP",
    rated_capacity: float = 40.0,
    nominal_voltage: float = 25.6,
    num_cells: int = 8,
    specs: Optional[str] = None,
    config: Optional[str] = None
) -> Dict[str, Any]:
    """Registers a new battery pack owned by the authenticated user."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        clean_bid = battery_id.strip().upper()
        cursor.execute("SELECT battery_id FROM battery_metadata WHERE battery_id = ?", (clean_bid,))
        if cursor.fetchone():
            raise ValueError(f"Battery ID '{clean_bid}' already exists in registry.")

        now_iso = datetime.now().isoformat()
        cursor.execute("""
        INSERT INTO battery_metadata (
            battery_id, chemistry, rated_capacity, nominal_voltage, num_cells,
            manufactured_date, initial_resistance, initial_soh, owner_user_id,
            battery_name, battery_specs, battery_config, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            clean_bid,
            chemistry,
            rated_capacity,
            nominal_voltage,
            num_cells,
            now_iso[:10],
            settings.NOMINAL_CELL_RESISTANCE_MOHM,
            100.0,
            user_id,
            battery_name or f"Pack {clean_bid}",
            specs or f"{num_cells}S {chemistry} pack",
            config,
            now_iso
        ))
        conn.commit()
        return {
            "battery_id": clean_bid,
            "owner_user_id": user_id,
            "battery_name": battery_name or f"Pack {clean_bid}",
            "chemistry": chemistry,
            "rated_capacity": rated_capacity,
            "nominal_voltage": nominal_voltage,
            "num_cells": num_cells,
            "created_at": now_iso
        }
    finally:
        conn.close()

# ==========================================
# TELEMETRY & PERSISTENCE WRITES
# ==========================================

def insert_cell_telemetry(records: List[Dict[str, Any]], data_source: str = "PHYSICAL"):
    if not records:
        return
    conn = get_db_connection()
    try:
        # Normalize and include data_source
        formatted = []
        for r in records:
            d = dict(r)
            if "data_source" not in d:
                d["data_source"] = data_source
            for key in ["c_rate", "voltage_sag", "temp_rise", "cell_voltage_diff"]:
                if key not in d:
                    d[key] = 0.0
            formatted.append(d)

        conn.executemany("""
        INSERT INTO battery_data (
            timestamp, battery_id, cell_id, voltage, current, temperature,
            soc, cycle, capacity, internal_resistance, ambient_temperature,
            mode, c_rate, voltage_sag, temp_rise, cell_voltage_diff, data_source
        ) VALUES (
            :timestamp, :battery_id, :cell_id, :voltage, :current, :temperature,
            :soc, :cycle, :capacity, :internal_resistance, :ambient_temperature,
            :mode, :c_rate, :voltage_sag, :temp_rise, :cell_voltage_diff, :data_source
        )
        """, formatted)
        conn.commit()
    finally:
        conn.close()

def insert_pack_telemetry(record: Dict[str, Any], data_source: str = "PHYSICAL") -> int:
    conn = get_db_connection()
    try:
        rec = dict(record)
        if "data_source" not in rec:
            rec["data_source"] = data_source
        if "soh" not in rec:
            rec["soh"] = rec.get("predicted_soh", 100.0)
        if "cycle" not in rec:
            rec["cycle"] = rec.get("cycle_count", 0)
        if "mode" not in rec:
            rec["mode"] = "DISCHARGING"
        if "max_cell_imbalance" not in rec:
            rec["max_cell_imbalance"] = 0.012
        for key in ["risk_score", "c_rate", "capacity_fade", "voltage_sag", "temp_rise", "resistance_growth"]:
            if key not in rec:
                rec[key] = 0.0
        if "risk_level" not in rec:
            rec["risk_level"] = "NORMAL"

        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO pack_telemetry (
            timestamp, battery_id, pack_voltage, pack_current, avg_temperature,
            max_temperature, min_temperature, soc, soh, cycle, max_cell_imbalance,
            mode, risk_score, risk_level, data_source
        ) VALUES (
            :timestamp, :battery_id, :pack_voltage, :pack_current, :avg_temperature,
            :max_temperature, :min_temperature, :soc, :soh, :cycle, :max_cell_imbalance,
            :mode, :risk_score, :risk_level, :data_source
        )
        """, rec)
        conn.commit()
        return cursor.lastrowid or 1
    finally:
        conn.close()

def insert_prediction(record: Dict[str, Any]) -> int:
    conn = get_db_connection()
    try:
        rec = dict(record)
        if "estimated_soh" not in rec:
            rec["estimated_soh"] = rec.get("predicted_soh", rec.get("soh", 100.0))
        if "predicted_rul" not in rec:
            rec["predicted_rul"] = rec.get("rul_cycles", 280)
        if "rul_uncertainty" not in rec:
            rec["rul_uncertainty"] = 25
        if "eol_cycle" not in rec:
            rec["eol_cycle"] = rec.get("cycle", 0) + rec["predicted_rul"]
        if "is_anomaly" not in rec:
            rec["is_anomaly"] = False
        if "anomaly_score" not in rec:
            rec["anomaly_score"] = 0.0
        if "fault_class" not in rec:
            rec["fault_class"] = "NORMAL"
        if "fault_confidence" not in rec:
            rec["fault_confidence"] = 95.0
        if "probable_cause" not in rec:
            rec["probable_cause"] = "Nominal Operating State"
        if "evidence" not in rec:
            rec["evidence"] = "[]"
        if "affected_cell" not in rec:
            rec["affected_cell"] = None
        if "model_version" not in rec:
            rec["model_version"] = "v1.0.0"
        if "prediction_metadata" not in rec:
            rec["prediction_metadata"] = None

        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO predictions (
            timestamp, battery_id, estimated_soh, predicted_rul, rul_uncertainty,
            eol_cycle, is_anomaly, anomaly_score, fault_class, fault_confidence,
            probable_cause, evidence, affected_cell, model_version, prediction_metadata
        ) VALUES (
            :timestamp, :battery_id, :estimated_soh, :predicted_rul, :rul_uncertainty,
            :eol_cycle, :is_anomaly, :anomaly_score, :fault_class, :fault_confidence,
            :probable_cause, :evidence, :affected_cell, :model_version, :prediction_metadata
        )
        """, rec)
        conn.commit()
        return cursor.lastrowid or 1
    finally:
        conn.close()

def insert_alert(alert: Dict[str, Any]) -> int:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        rec = dict(alert)
        if "category" not in rec:
            rec["category"] = "SYSTEM"
        if "severity" not in rec:
            rec["severity"] = "MEDIUM"
        cursor.execute("""
        INSERT INTO alerts (
            timestamp, battery_id, cell_id, level, title, description, evidence,
            recommended_action, status, category, severity
        ) VALUES (
            :timestamp, :battery_id, :cell_id, :level, :title, :description, :evidence,
            :recommended_action, 'ACTIVE', :category, :severity
        )
        """, rec)
        alert_id = cursor.lastrowid
        conn.commit()
        return alert_id
    finally:
        conn.close()

def insert_event(event_type: str, details: str, battery_id: str = settings.BATTERY_ID):
    conn = get_db_connection()
    try:
        conn.execute("""
        INSERT INTO battery_events (timestamp, battery_id, event_type, details)
        VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), battery_id, event_type, details))
        conn.commit()
    finally:
        conn.close()

# ==========================================
# SCOPED TELEMETRY QUERIES
# ==========================================

def get_latest_pack_telemetry(battery_id: str = settings.BATTERY_ID) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM pack_telemetry WHERE battery_id = ? ORDER BY id DESC LIMIT 1
        """, (battery_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_latest_cells_telemetry(battery_id: str = settings.BATTERY_ID) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT bd.* FROM battery_data bd
        INNER JOIN (
            SELECT cell_id, MAX(id) as max_id
            FROM battery_data
            WHERE battery_id = ?
            GROUP BY cell_id
        ) latest ON bd.cell_id = latest.cell_id AND bd.id = latest.max_id
        ORDER BY bd.cell_id ASC
        """, (battery_id,))
        results = []
        for row in cursor.fetchall():
            d = dict(row)
            d["temp_c"] = d.get("temperature", 25.0)
            d["internal_resistance_mohm"] = d.get("internal_resistance", 32.0)
            d["capacity_ah"] = d.get("capacity", 35.0)
            results.append(d)
        return results
    finally:
        conn.close()

def get_recent_history(battery_id: str = settings.BATTERY_ID, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT * FROM pack_telemetry WHERE battery_id = ? ORDER BY id DESC LIMIT ?
        """, (battery_id, limit))
        rows = cursor.fetchall()
        return [dict(r) for r in reversed(rows)]
    finally:
        conn.close()

def get_battery_history_filtered(
    battery_id: str = settings.BATTERY_ID,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Queries persistent historical telemetry with optional date range and pagination."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM pack_telemetry WHERE battery_id = ?"
        params: List[Any] = [battery_id]

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)
        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        results = []
        for r in reversed(rows):
            d = dict(r)
            d["voltage"] = d.get("pack_voltage", 0.0)
            d["current"] = d.get("pack_current", 0.0)
            d["temp"] = d.get("avg_temperature", 25.0)
            results.append(d)
        return results
    finally:
        conn.close()

def get_latest_prediction(battery_id: str = settings.BATTERY_ID) -> Optional[Dict[str, Any]]:
    """Retrieves most recent AI prediction record for battery."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions WHERE battery_id = ? ORDER BY id DESC LIMIT 1", (battery_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["predicted_soh"] = d.get("estimated_soh", 100.0)
        return d
    finally:
        conn.close()

def get_alerts(status: Optional[str] = None, limit: int = 50, battery_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM alerts WHERE 1=1"
        params: List[Any] = []
        if battery_id:
            query += " AND battery_id = ?"
            params.append(battery_id)
        if status:
            query += " AND status = ?"
            params.append(status)
        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)
        cursor.execute(query, tuple(params))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

def resolve_alert(alert_id: int):
    conn = get_db_connection()
    try:
        conn.execute("""
        UPDATE alerts SET status = 'RESOLVED', resolved_at = ? WHERE id = ?
        """, (datetime.now().isoformat(), alert_id))
        conn.commit()
    finally:
        conn.close()

def acknowledge_alert(alert_id: int, user_id: Optional[str] = None) -> bool:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        UPDATE alerts SET acknowledged_at = ?, acknowledged_by = ? WHERE id = ?
        """, (datetime.now().isoformat(), user_id or "operator", alert_id))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()

def get_event_counts(battery_id: str = settings.BATTERY_ID) -> Dict[str, int]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT event_type, COUNT(*) as cnt FROM battery_events WHERE battery_id = ? GROUP BY event_type
        """, (battery_id,))
        return {row["event_type"]: row["cnt"] for row in cursor.fetchall()}
    finally:
        conn.close()

def get_battery_metadata(battery_id: str = settings.BATTERY_ID) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM battery_metadata WHERE battery_id = ?", (battery_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def insert_clean_sample(sample: Dict[str, Any]):
    conn = get_db_connection()
    try:
        conn.execute("""
        INSERT INTO clean_telemetry_samples (
            timestamp, voltage_mean, voltage_diff, voltage_std, current,
            temp_avg, temp_max, temp_rise, soc, cycle,
            resistance_growth, voltage_sag, capacity_fade, target_soh,
            is_anomaly, fault_class
        ) VALUES (
            :timestamp, :voltage_mean, :voltage_diff, :voltage_std, :current,
            :temp_avg, :temp_max, :temp_rise, :soc, :cycle,
            :resistance_growth, :voltage_sag, :capacity_fade, :target_soh,
            :is_anomaly, :fault_class
        )
        """, sample)
        conn.commit()
    finally:
        conn.close()

def insert_clean_samples_bulk(samples: List[Dict[str, Any]]):
    if not samples:
        return
    conn = get_db_connection()
    try:
        conn.executemany("""
        INSERT INTO clean_telemetry_samples (
            timestamp, voltage_mean, voltage_diff, voltage_std, current,
            temp_avg, temp_max, temp_rise, soc, cycle,
            resistance_growth, voltage_sag, capacity_fade, target_soh,
            is_anomaly, fault_class
        ) VALUES (
            :timestamp, :voltage_mean, :voltage_diff, :voltage_std, :current,
            :temp_avg, :temp_max, :temp_rise, :soc, :cycle,
            :resistance_growth, :voltage_sag, :capacity_fade, :target_soh,
            :is_anomaly, :fault_class
        )
        """, samples)
        conn.commit()
    finally:
        conn.close()

def get_clean_samples_from_db(limit: int = 5000) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clean_telemetry_samples ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

def get_clean_samples_count() -> int:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM clean_telemetry_samples")
        row = cursor.fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()

def prune_historical_telemetry(days_to_keep: int = 90) -> int:
    """Retention management: Cleans raw cell telemetry older than threshold while keeping pack rollups."""
    conn = get_db_connection()
    try:
        cutoff = (datetime.now() - timedelta(days=days_to_keep)).isoformat()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM battery_data WHERE timestamp < ?", (cutoff,))
        pruned = cursor.rowcount
        conn.commit()
        return pruned
    finally:
        conn.close()
