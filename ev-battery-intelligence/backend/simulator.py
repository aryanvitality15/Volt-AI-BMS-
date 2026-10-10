"""
EV BATTERY INTELLIGENCE - REALISTIC PHYSICS-INSPIRED SYNTHETIC SIMULATOR
Generates physically grounded EV battery telemetry adhering to LFP chemistry:
- OCV-SOC mapping
- Joule heating & Newton cooling thermal dynamics
- Coulomb counting
- Realistic cycle-dependent degradation (Capacity fade & Resistance growth)
- 13 Controlled Safe Simulation Scenarios
"""

import math
import random
import time
from datetime import datetime
from typing import Dict, Any, List
from config import settings
from formulas import (
    calculate_soh,
    calculate_soc_coulomb_counting,
    calculate_c_rate,
    calculate_voltage_sag,
    calculate_temperature_rise,
    calculate_cell_voltage_difference,
    calculate_resistance_growth,
    calculate_capacity_fade
)

def lfp_ocv(soc: float) -> float:
    """
    Standard Lithium Iron Phosphate (LFP) 3.2V Open-Circuit Voltage curve.
    LFP has a flat plateau between 20% and 80% SOC (~3.28V - 3.32V)
    with steep knee at discharge (<15%) and steep rise at top (>90%).
    """
    s = max(0.0, min(100.0, soc)) / 100.0
    if s < 0.05:
        return 2.80 + (s / 0.05) * 0.25
    elif s < 0.15:
        return 3.05 + ((s - 0.05) / 0.10) * 0.15
    elif s < 0.85:
        # Flat plateau typical of LiFePO4
        return 3.20 + 0.10 * math.pow(s, 0.5) + 0.02 * math.log(s / (1.001 - s))
    elif s < 0.95:
        return 3.33 + ((s - 0.85) / 0.10) * 0.15
    else:
        return 3.48 + ((s - 0.95) / 0.05) * 0.17

class BatterySimulator:
    def __init__(self, battery_id: str = settings.BATTERY_ID, num_cells: int = settings.NUM_CELLS):
        self.battery_id = battery_id
        self.num_cells = num_cells
        self.rated_capacity = settings.RATED_CAPACITY_AH
        self.ambient_temp = 25.0
        
        # State Variables
        self.cycle = 624  # Matched to baseline scenario in PDF
        self.soh = 87.4   # Matched to PDF baseline SOH
        self.soc = 64.8   # Matched to PDF baseline SOC
        self.pack_current = 14.5  # Positive = Discharge (A)
        self.mode = "DISCHARGING"  # "CHARGING", "DISCHARGING", "IDLE"
        
        # Active Scenario
        self.active_scenario = "NORMAL"
        
        # Individual Cell Internal States
        self.cells = []
        for i in range(1, self.num_cells + 1):
            # Minor manufacturing variances (± 0.5% resistance, ± 0.2% capacity)
            r_init = settings.NOMINAL_CELL_RESISTANCE_MOHM * (1.0 + random.uniform(-0.01, 0.01))
            self.cells.append({
                "cell_id": i,
                "resistance_mohm": r_init * (1.0 + (100.0 - self.soh) * 0.01),  # Nominal degradation resistance
                "capacity_ah": self.rated_capacity * (self.soh / 100.0),
                "soc": self.soc + random.uniform(-0.5, 0.5),
                "temp_c": self.ambient_temp + 3.0,
                "voltage": 3.28
            })
            
        self.last_update = time.time()

    def set_scenario(self, scenario: str):
        valid = [
            "NORMAL", "HIGH_TEMPERATURE", "CELL_IMBALANCE", "HIGH_RESISTANCE",
            "OVERCURRENT", "UNDERVOLTAGE", "SELF_DISCHARGE", "CAPACITY_DEGRADATION",
            "SENSOR_ANOMALY", "FAST_CHARGING", "HIGH_C_RATE", "DEEP_DISCHARGE",
            "LONG_HIGH_SOC_OPERATION"
        ]
        sc_upper = scenario.upper().replace(" ", "_")
        if sc_upper in valid:
            self.active_scenario = sc_upper
            # Cleanly isolate cell states across scenario switches
            if self.active_scenario not in ["CELL_IMBALANCE", "SELF_DISCHARGE"]:
                for c in self.cells:
                    c["soc"] = self.soc
            if self.active_scenario not in ["HIGH_RESISTANCE", "HIGH_TEMPERATURE"]:
                for c in self.cells:
                    c["resistance_mohm"] = settings.NOMINAL_CELL_RESISTANCE_MOHM * (1.0 + (100.0 - self.soh) * 0.01)
            if self.active_scenario != "HIGH_TEMPERATURE":
                for c in self.cells:
                    c["temp_c"] = self.ambient_temp + 3.0

            # Apply immediate scenario parameter adjustments
            if self.active_scenario == "FAST_CHARGING":
                self.mode = "CHARGING"
                self.pack_current = -50.0  # Fast charging current
            elif self.active_scenario == "OVERCURRENT":
                self.pack_current = 85.0   # Extreme current
            elif self.active_scenario == "HIGH_C_RATE":
                self.pack_current = 90.0
            elif self.active_scenario == "DEEP_DISCHARGE":
                self.soc = 8.5
                self.pack_current = 20.0
            elif self.active_scenario == "LONG_HIGH_SOC_OPERATION":
                self.soc = 98.5
                self.mode = "IDLE"
                self.pack_current = 0.5
            elif self.active_scenario == "HIGH_TEMPERATURE":
                for c in self.cells:
                    c["temp_c"] = max(c["temp_c"], 48.0)
                    c["resistance_mohm"] = 43.5 + random.uniform(-0.5, 0.5)
            elif self.active_scenario == "NORMAL":
                if self.mode == "CHARGING":
                    self.pack_current = -15.0
                else:
                    self.pack_current = 14.5
            return True
        return False

    def step(self, dt: float = 1.0) -> Dict[str, Any]:
        """Advances physical state by dt seconds."""
        now = datetime.now().isoformat()
        
        # 1. Update cycle and degradation trend
        if self.mode in ["CHARGING", "DISCHARGING"]:
            self.cycle += 0.0001 * dt  # Fractional cycle advancement
            
        # Scenario-specific dynamic overrides
        target_cell_id = 4 if self.num_cells >= 4 else 1  # Standard fault cell for demonstration
        
        # Pack current adjustment by scenario
        if self.active_scenario == "OVERCURRENT":
            current_target = 88.0 + random.uniform(-2.0, 3.0)
        elif self.active_scenario == "FAST_CHARGING":
            current_target = -52.0 + random.uniform(-1.0, 1.0)
        elif self.active_scenario == "HIGH_C_RATE":
            current_target = 92.0 + random.uniform(-1.5, 2.5)
        elif self.active_scenario == "DEEP_DISCHARGE":
            current_target = 22.0
        elif self.active_scenario == "LONG_HIGH_SOC_OPERATION":
            current_target = 0.2
        else:
            # Normal realistic cycling fluctuations
            current_target = self.pack_current + random.uniform(-0.4, 0.4)
            if self.soc > 90 and current_target < 0:
                current_target *= 0.5 # Taper charge
            elif self.soc < 15 and current_target > 0:
                current_target *= 0.8
                
        self.pack_current = round(current_target, 2)
        
        # 2. Update Pack SOH
        if self.active_scenario == "CAPACITY_DEGRADATION":
            self.soh = max(70.5, self.soh - 0.05 * dt)
        else:
            self.soh = max(70.0, self.soh - 0.00002 * dt)
            
        # 3. Process Individual Cells
        cell_records = []
        cell_voltages = []
        cell_temps = []
        
        for c in self.cells:
            cid = c["cell_id"]
            
            # Scenario-specific cell adjustments
            # High Resistance Scenario
            if self.active_scenario == "HIGH_RESISTANCE" and cid == target_cell_id:
                c["resistance_mohm"] = 46.5 + random.uniform(-0.5, 0.5)
            elif self.active_scenario == "HIGH_TEMPERATURE":
                c["resistance_mohm"] = 43.5 + random.uniform(-0.2, 0.2)
            elif self.active_scenario == "NORMAL":
                # Gradual baseline resistance
                c["resistance_mohm"] = settings.NOMINAL_CELL_RESISTANCE_MOHM * (1.0 + (100.0 - self.soh) * 0.01)
                
            # Cell Imbalance Scenario
            if self.active_scenario == "CELL_IMBALANCE" and cid == target_cell_id:
                # Cell deviates downwards
                c["soc"] = max(10.0, c["soc"] - 0.3 * dt)
            elif self.active_scenario == "SELF_DISCHARGE" and cid == target_cell_id:
                c["soc"] = max(5.0, c["soc"] - 0.45 * dt)
            else:
                # Normal Coulomb Counting
                c["soc"] = calculate_soc_coulomb_counting(c["soc"], self.pack_current, dt, self.rated_capacity)
                
            # Thermal dynamics: Joule heating (I^2 * R) + heat dissipation
            # Series cell resistance in Ohms = (R_pack / num_cells) / 1000
            r_cell_ohm = (c["resistance_mohm"] / max(1, self.num_cells)) / 1000.0
            p_joule = math.pow(self.pack_current, 2) * r_cell_ohm
            # Heat capacity ~ 45 J/K per cell, heat transfer coeff ~ 0.8 W/K
            thermal_gain = (p_joule * 0.02) * dt
            thermal_loss = 0.03 * (c["temp_c"] - self.ambient_temp) * dt
            c["temp_c"] += (thermal_gain - thermal_loss)
            
            # High Temperature Scenario injection
            if self.active_scenario == "HIGH_TEMPERATURE":
                c["temp_c"] = min(62.0, c["temp_c"] + 1.25 * dt)
            elif self.active_scenario == "HIGH_RESISTANCE" and cid == target_cell_id:
                c["temp_c"] = min(56.0, c["temp_c"] + 0.85 * dt)
            elif self.active_scenario == "FAST_CHARGING":
                c["temp_c"] = min(46.0, c["temp_c"] + 0.65 * dt)
                
            # Compute cell terminal voltage: V = OCV(SOC) - I * R_cell
            v_ocv = lfp_ocv(c["soc"])
            v_ir_drop = self.pack_current * r_cell_ohm
            v_term = v_ocv - v_ir_drop + random.uniform(-0.003, 0.003)
            
            # Undervoltage Scenario
            if self.active_scenario == "UNDERVOLTAGE":
                v_term = min(v_term, 2.72 + random.uniform(-0.02, 0.02))
                
            # Cell Imbalance Scenario
            if self.active_scenario == "CELL_IMBALANCE" and cid == target_cell_id:
                v_term = max(2.5, v_term - 0.18 + random.uniform(-0.005, 0.005))

            # Sensor Anomaly Scenario
            if self.active_scenario == "SENSOR_ANOMALY" and cid == target_cell_id:
                # Impossible spikes / noisy glitch
                v_term = 4.85 if random.random() > 0.5 else 1.20
                c["temp_c"] = 89.4
                
            c["voltage"] = round(v_term, 3)
            c["temp_c"] = round(c["temp_c"], 2)
            c["capacity_ah"] = round(self.rated_capacity * (self.soh / 100.0), 2)
            
            cell_voltages.append(c["voltage"])
            cell_temps.append(c["temp_c"])

        # Pack aggregated statistics
        pack_voltage = round(sum(cell_voltages), 2)
        mean_voltage = sum(cell_voltages) / len(cell_voltages)
        max_voltage = max(cell_voltages)
        min_voltage = min(cell_voltages)
        max_imbalance = round(max_voltage - min_voltage, 3)
        avg_temp = round(sum(cell_temps) / len(cell_temps), 2)
        max_temp = round(max(cell_temps), 2)
        min_temp = round(min(cell_temps), 2)
        
        # Average pack SOC
        self.soc = round(sum(c["soc"] for c in self.cells) / len(self.cells), 2)
        
        # Determine battery state mode
        if self.pack_current < -1.0:
            self.mode = "CHARGING"
        elif self.pack_current > 1.0:
            self.mode = "DISCHARGING"
        else:
            self.mode = "IDLE"
            
        c_rate = calculate_c_rate(self.pack_current, self.rated_capacity)
        
        # Create individual records for DB & MQTT
        for c in self.cells:
            # Baseline rest voltage for cell ~ 3.30V
            v_sag = calculate_voltage_sag(3.30, c["voltage"])
            t_rise = calculate_temperature_rise(c["temp_c"], self.ambient_temp)
            v_diff = calculate_cell_voltage_difference(c["voltage"], mean_voltage)
            
            cell_records.append({
                "timestamp": now,
                "battery_id": self.battery_id,
                "cell_id": c["cell_id"],
                "voltage": c["voltage"],
                "current": self.pack_current,
                "temperature": c["temp_c"],
                "temp_c": c["temp_c"],
                "soc": round(c["soc"], 2),
                "cycle": int(self.cycle),
                "capacity": c["capacity_ah"],
                "capacity_ah": c["capacity_ah"],
                "internal_resistance": round(c["resistance_mohm"], 2),
                "internal_resistance_mohm": round(c["resistance_mohm"], 2),
                "ambient_temperature": self.ambient_temp,
                "mode": self.mode,
                "c_rate": c_rate,
                "voltage_sag": v_sag,
                "temp_rise": t_rise,
                "cell_voltage_diff": v_diff
            })
            
        pack_summary = {
            "timestamp": now,
            "battery_id": self.battery_id,
            "pack_voltage": pack_voltage,
            "pack_current": self.pack_current,
            "avg_temperature": avg_temp,
            "max_temperature": max_temp,
            "min_temperature": min_temp,
            "soc": self.soc,
            "soh": round(self.soh, 2),
            "cycle": int(self.cycle),
            "max_cell_imbalance": max_imbalance,
            "mode": self.mode,
            "c_rate": c_rate,
            "active_scenario": self.active_scenario,
            "cells": cell_records
        }
        
        return pack_summary

# Singleton instance
simulator = BatterySimulator()
