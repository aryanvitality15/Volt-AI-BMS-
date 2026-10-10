"""
Unit tests for EV Battery Formulas
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from formulas import (
    calculate_soh,
    calculate_soc_coulomb_counting,
    calculate_c_rate,
    calculate_voltage_sag,
    calculate_temperature_rise,
    calculate_cell_voltage_difference,
    calculate_resistance_growth,
    calculate_capacity_fade,
    calculate_rul,
    calculate_battery_risk_index
)

def test_soh_calculation():
    # 40 Ah rated, 34.96 Ah current -> 87.4%
    soh = calculate_soh(34.96, 40.0)
    assert soh == 87.4, f"Expected 87.4, got {soh}"
    # Boundary conditions
    assert calculate_soh(0.0, 40.0) == 0.0
    assert calculate_soh(40.0, 40.0) == 100.0

def test_coulomb_counting_soc():
    # Discharge at 40A for 360s (0.1h = 4Ah = 10% of 40Ah) from 80%
    soc = calculate_soc_coulomb_counting(80.0, current_a=40.0, dt_seconds=360.0, q_nom_ah=40.0)
    assert round(soc, 1) == 70.0, f"Expected 70.0, got {soc}"
    # Charge at 20A for 180s from 50%
    soc_chg = calculate_soc_coulomb_counting(50.0, current_a=-20.0, dt_seconds=180.0, q_nom_ah=40.0)
    assert round(soc_chg, 1) == 52.5, f"Expected 52.5, got {soc_chg}"

def test_c_rate():
    assert calculate_c_rate(40.0, 40.0) == 1.0
    assert calculate_c_rate(-80.0, 40.0) == 2.0
    assert calculate_c_rate(14.5, 40.0) == 0.362 or calculate_c_rate(14.5, 40.0) == 0.363

def test_voltage_sag():
    sag = calculate_voltage_sag(3.30, 3.12)
    assert sag == 0.18

def test_temperature_rise():
    t_rise = calculate_temperature_rise(38.5, 25.0)
    assert t_rise == 13.5

def test_cell_voltage_difference():
    diff = calculate_cell_voltage_difference(3.18, 3.28)
    assert diff == -0.1

def test_resistance_growth():
    # Nominal 32 mΩ, current 41.6 mΩ -> +30%
    growth = calculate_resistance_growth(41.6, 32.0)
    assert growth == 30.0

def test_capacity_fade():
    fade = calculate_capacity_fade(34.0, 40.0)
    assert fade == 15.0

def test_rul():
    rul, uncert = calculate_rul(current_cycle=700, estimated_eol_cycle=980)
    assert rul == 280
    assert uncert == 35

def test_battery_risk_index():
    # Healthy scenario
    bri_healthy = calculate_battery_risk_index(
        temp_c=28.0,
        resistance_growth_pct=5.0,
        max_cell_imbalance_v=0.015,
        voltage_sag_v=0.08,
        current_cycle=200,
        soh_pct=95.0,
        is_anomaly=False
    )
    assert bri_healthy["status"] == "HEALTHY"
    assert bri_healthy["score"] < 35.0

    # High risk scenario
    bri_danger = calculate_battery_risk_index(
        temp_c=54.0,
        resistance_growth_pct=45.0,
        max_cell_imbalance_v=0.18,
        voltage_sag_v=0.55,
        current_cycle=1100,
        soh_pct=72.0,
        is_anomaly=True
    )
    assert bri_danger["status"] == "HIGH RISK"
    assert bri_danger["score"] > 65.0
    # Contributions should sum to ~100%
    contrib_sum = sum(bri_danger["contributions_pct"].values())
    assert 98.0 <= contrib_sum <= 102.0

if __name__ == "__main__":
    test_soh_calculation()
    test_coulomb_counting_soc()
    test_c_rate()
    test_voltage_sag()
    test_temperature_rise()
    test_cell_voltage_difference()
    test_resistance_growth()
    test_capacity_fade()
    test_rul()
    test_battery_risk_index()
    print("ALL FORMULA UNIT TESTS PASSED SUCCESSFULLY!")
