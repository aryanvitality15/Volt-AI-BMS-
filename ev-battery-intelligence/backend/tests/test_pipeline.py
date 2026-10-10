"""
End-to-End Pipeline Smoke Test
Verifies the complete analytical data flow:
Simulator -> Preprocessing -> DB -> AI -> Risk -> RCA -> XAI -> Alerts
"""
import sys
import os
import sqlite3
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import settings
# Override db path for test
settings.DATABASE_PATH = os.path.join(os.path.dirname(__file__), "test_battery.db")

from database import init_database, get_latest_pack_telemetry, get_alerts
from simulator import simulator
from preprocessing import pipeline
from ai_models import ai_engine
from rca_engine import rca_engine
from xai_engine import xai_engine
from alert_engine import alert_engine
from recommendation_engine import recommendation_engine
from app import process_incoming_telemetry, latest_state_cache

# Initialize database for test environment
init_database()

def test_full_pipeline_normal():
    # 1. Init DB
    init_database()
    
    # 2. Set NORMAL scenario
    simulator.set_scenario("NORMAL")
    step_data = simulator.step(dt=1.0)
    assert step_data["pack_voltage"] > 20.0
    assert len(step_data["cells"]) == settings.NUM_CELLS
    
    # 3. Process pipeline
    process_incoming_telemetry(step_data)
    
    # 4. Verify AI & Risk outputs in cache
    assert latest_state_cache["ai"]["soh"] > 70.0
    assert latest_state_cache["ai"]["fault_class"] == "NORMAL"
    assert latest_state_cache["risk"]["score"] < 45.0
    assert latest_state_cache["rca"]["probable_cause"] == "Nominal Operating State"
    assert len(latest_state_cache["xai"]["factors"]) == 6
    
    print("Normal pipeline test: PASSED")

def test_full_pipeline_cell_imbalance():
    # 1. Trigger CELL_IMBALANCE scenario
    simulator.set_scenario("CELL_IMBALANCE")
    for _ in range(5):
        step_data = simulator.step(dt=1.0)
    
    # Process through pipeline
    process_incoming_telemetry(step_data)
    
    # Verify Anomaly & Fault diagnosis
    assert latest_state_cache["ai"]["is_anomaly"] is True
    assert latest_state_cache["ai"]["fault_class"] == "CELL IMBALANCE"
    assert "Cell" in latest_state_cache["rca"]["probable_cause"] or "Imbalance" in latest_state_cache["rca"]["probable_cause"]
    assert latest_state_cache["rca"]["affected_cell"] is not None
    assert latest_state_cache["recommendation"]["action_level"] in ["WARNING", "CRITICAL"]
    
    print("Cell imbalance pipeline test: PASSED")

def test_full_pipeline_high_temperature():
    # 1. Trigger HIGH_TEMPERATURE scenario
    simulator.set_scenario("HIGH_TEMPERATURE")
    for _ in range(40):
        step_data = simulator.step(dt=1.0)
        
    process_incoming_telemetry(step_data)
    
    # Verify Thermal Anomaly
    assert latest_state_cache["ai"]["is_anomaly"] is True
    assert latest_state_cache["ai"]["fault_class"] == "THERMAL ANOMALY"
    assert "Thermal" in latest_state_cache["rca"]["probable_cause"] or "Resistance" in latest_state_cache["rca"]["probable_cause"]
    assert latest_state_cache["risk"]["score"] > 50.0
    assert len(latest_state_cache["alerts"]) > 0
    
    print("High temperature pipeline test: PASSED")

if __name__ == "__main__":
    try:
        test_full_pipeline_normal()
        test_full_pipeline_cell_imbalance()
        test_full_pipeline_high_temperature()
        print("\n>>> ALL END-TO-END PIPELINE TESTS PASSED SUCCESSFULLY! <<<")
    finally:
        # Cleanup test db
        if os.path.exists(settings.DATABASE_PATH):
            os.remove(settings.DATABASE_PATH)
