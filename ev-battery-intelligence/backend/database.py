"""
EV BATTERY INTELLIGENCE - DATABASE ENGINE
SQLite schema management, indexing, connection pooling, and optimized queries.
"""

import sqlite3
import os
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from config import settings

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
    
    if db_path not in _tables_initialized_paths:
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='battery_data';")
        if not cur.fetchone():
            _create_schema(conn)
        _tables_initialized_paths.add(db_path)
        
    return conn

def _create_schema(conn: sqlite3.Connection):
    cursor = conn.cursor()
    
    # 1. Individual Cell Telemetry Table
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

    # 2. Pack Aggregated Telemetry Table
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

    # 3. Model Predictions & Diagnostics Table
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

    # 4. Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        battery_id TEXT NOT NULL,
        cell_id INTEGER,
        level TEXT NOT NULL, -- 'NORMAL', 'WARNING', 'CRITICAL'
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT,
        recommended_action TEXT,
        status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED'
        resolved_at TEXT
    );
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, timestamp);")

    # 5. Battery Operational Events
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

    # 6. Clean Telemetry Samples for Autonomous Self-Learning
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

    # 7. Battery Metadata (Passport Identity)
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

    # Seed Initial Metadata if missing
    cursor.execute("SELECT battery_id FROM battery_metadata WHERE battery_id = ?", (settings.BATTERY_ID,))
    if not cursor.fetchone():
        cursor.execute("""
        INSERT INTO battery_metadata (battery_id, chemistry, rated_capacity, nominal_voltage, num_cells, manufactured_date, initial_resistance, initial_soh)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            settings.BATTERY_ID,
            settings.CHEMISTRY,
            settings.RATED_CAPACITY_AH,
            round(settings.NOMINAL_CELL_VOLTAGE * settings.NUM_CELLS, 1),
            settings.NUM_CELLS,
            "2024-03-15",
            settings.NOMINAL_CELL_RESISTANCE_MOHM,
            100.0
        ))

    conn.commit()
    logger.info("SQLite Database schema verified and initialized.")

def init_database():
    """Initializes tables and indices explicitly."""
    conn = get_db_connection()
    conn.close()

def insert_cell_telemetry(records: List[Dict[str, Any]]):
    if not records:
        return
    conn = get_db_connection()
    try:
        conn.executemany("""
        INSERT INTO battery_data (
            timestamp, battery_id, cell_id, voltage, current, temperature,
            soc, cycle, capacity, internal_resistance, ambient_temperature,
            mode, c_rate, voltage_sag, temp_rise, cell_voltage_diff
        ) VALUES (
            :timestamp, :battery_id, :cell_id, :voltage, :current, :temperature,
            :soc, :cycle, :capacity, :internal_resistance, :ambient_temperature,
            :mode, :c_rate, :voltage_sag, :temp_rise, :cell_voltage_diff
        )
        """, records)
        conn.commit()
    finally:
        conn.close()

def insert_pack_telemetry(record: Dict[str, Any]):
    conn = get_db_connection()
    try:
        conn.execute("""
        INSERT INTO pack_telemetry (
            timestamp, battery_id, pack_voltage, pack_current, avg_temperature,
            max_temperature, min_temperature, soc, soh, cycle, max_cell_imbalance,
            mode, risk_score, risk_level
        ) VALUES (
            :timestamp, :battery_id, :pack_voltage, :pack_current, :avg_temperature,
            :max_temperature, :min_temperature, :soc, :soh, :cycle, :max_cell_imbalance,
            :mode, :risk_score, :risk_level
        )
        """, record)
        conn.commit()
    finally:
        conn.close()

def insert_prediction(record: Dict[str, Any]):
    conn = get_db_connection()
    try:
        conn.execute("""
        INSERT INTO predictions (
            timestamp, battery_id, estimated_soh, predicted_rul, rul_uncertainty,
            eol_cycle, is_anomaly, anomaly_score, fault_class, fault_confidence,
            probable_cause, evidence, affected_cell
        ) VALUES (
            :timestamp, :battery_id, :estimated_soh, :predicted_rul, :rul_uncertainty,
            :eol_cycle, :is_anomaly, :anomaly_score, :fault_class, :fault_confidence,
            :probable_cause, :evidence, :affected_cell
        )
        """, record)
        conn.commit()
    finally:
        conn.close()

def insert_alert(alert: Dict[str, Any]) -> int:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO alerts (
            timestamp, battery_id, cell_id, level, title, description, evidence, recommended_action, status
        ) VALUES (
            :timestamp, :battery_id, :cell_id, :level, :title, :description, :evidence, :recommended_action, 'ACTIVE'
        )
        """, alert)
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
        # Fetch the latest reading for each cell
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
        # Return in ascending chronological order for charts
        return [dict(r) for r in reversed(rows)]
    finally:
        conn.close()

def get_alerts(status: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        if status:
            cursor.execute("SELECT * FROM alerts WHERE status = ? ORDER BY id DESC LIMIT ?", (status, limit))
        else:
            cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,))
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
    """Inserts a single verified clean telemetry sample."""
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
    """Bulk inserts validated clean telemetry samples."""
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
    """Fetches high-fidelity clean samples from SQLite for ML training."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM clean_telemetry_samples ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cursor.fetchall()]
    finally:
        conn.close()

def get_clean_samples_count() -> int:
    """Returns total number of clean training samples accumulated in SQLite."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM clean_telemetry_samples")
        row = cursor.fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()

