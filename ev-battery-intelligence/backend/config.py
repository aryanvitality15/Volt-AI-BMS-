import os

def _load_env_file():
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", ".env"),
        os.path.join(os.path.dirname(__file__), ".env"),
        ".env"
    ]
    for p in candidates:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k, v = k.strip(), v.strip()
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass
            break

_load_env_file()

def _resolve_database_path() -> str:
    db_env = os.getenv("DATABASE_PATH")
    if not db_env:
        return os.path.join(os.path.dirname(__file__), "battery_intelligence.db")
    if os.path.isabs(db_env):
        return db_env
    # Check if relative path was given like 'backend/battery_intelligence.db'
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    candidate = os.path.normpath(os.path.join(base_dir, db_env))
    return candidate

class Settings:
    # Service and Host Config
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Database
    DATABASE_PATH: str = _resolve_database_path()
    
    # HiveMQ Broker Configuration
    HIVEMQ_HOST: str = os.getenv("HIVEMQ_HOST", "broker.hivemq.com")
    HIVEMQ_PORT: int = int(os.getenv("HIVEMQ_PORT", "1883"))
    HIVEMQ_USERNAME: str = os.getenv("HIVEMQ_USERNAME", "")
    HIVEMQ_PASSWORD: str = os.getenv("HIVEMQ_PASSWORD", "")
    MQTT_TOPIC_BASE: str = os.getenv("MQTT_TOPIC_BASE", "ev/battery")
    
    # Battery Pack Specifications (LFP Architecture based on PDF)
    BATTERY_ID: str = os.getenv("BATTERY_ID", "EV-001")
    CHEMISTRY: str = "LFP"
    NUM_CELLS: int = int(os.getenv("NUM_CELLS", "8"))
    RATED_CAPACITY_AH: float = float(os.getenv("RATED_CAPACITY_AH", "40.0"))
    NOMINAL_CELL_VOLTAGE: float = 3.2
    MAX_CELL_VOLTAGE: float = 3.65
    MIN_CELL_VOLTAGE: float = 2.80
    NOMINAL_CELL_RESISTANCE_MOHM: float = 32.0  # mΩ
    BASELINE_TEMP_C: float = 25.0  # °C
    EOL_SOH_PERCENT: float = 70.0  # %
    WARNING_SOH_PERCENT: float = 80.0  # %
    
    # BRI (Battery Risk Index) Weights
    BRI_WEIGHT_TEMP: float = 0.25
    BRI_WEIGHT_RESISTANCE: float = 0.20
    BRI_WEIGHT_IMBALANCE: float = 0.20
    BRI_WEIGHT_VOLTAGE: float = 0.15
    BRI_WEIGHT_CYCLE: float = 0.10
    BRI_WEIGHT_SOH: float = 0.05
    BRI_WEIGHT_ANOMALY: float = 0.05
    
    # Simulation & Telemetry Rate
    SIMULATION_INTERVAL_SEC: float = 1.0

settings = Settings()
