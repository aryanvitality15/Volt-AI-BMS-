"""
EV BATTERY INTELLIGENCE - DATA PREPROCESSING & FEATURE ENGINEERING
Cleanses raw sensor inputs, handles outliers, computes rolling metrics,
and derives physical/statistical features for the AI inference pipeline.
"""

import numpy as np
from typing import Dict, Any, List
from config import settings
from formulas import (
    calculate_c_rate,
    calculate_voltage_sag,
    calculate_temperature_rise,
    calculate_resistance_growth,
    calculate_capacity_fade,
    calculate_cell_voltage_difference
)

class FeaturePipeline:
    def __init__(self, window_size: int = 10):
        self.window_size = window_size
        self.voltage_history = []
        self.current_history = []
        self.temp_history = []

    def clean_record(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Handles missing values, clamping, and sensor sanitation."""
        cleaned = dict(raw)
        
        # Default fallbacks for missing keys
        cleaned["voltage"] = float(cleaned.get("voltage", 3.2))
        cleaned["current"] = float(cleaned.get("current", 0.0))
        cleaned["temperature"] = float(cleaned.get("temperature", settings.BASELINE_TEMP_C))
        cleaned["soc"] = max(0.0, min(100.0, float(cleaned.get("soc", 50.0))))
        cleaned["capacity"] = max(0.1, float(cleaned.get("capacity", settings.RATED_CAPACITY_AH)))
        cleaned["internal_resistance"] = max(1.0, float(cleaned.get("internal_resistance", settings.NOMINAL_CELL_RESISTANCE_MOHM)))
        cleaned["cycle"] = int(cleaned.get("cycle", 1))
        
        # Outlier flag (e.g. physically impossible voltage or temp)
        is_sensor_glitch = (cleaned["voltage"] > 4.5 or cleaned["voltage"] < 1.5 or cleaned["temperature"] > 80.0)
        cleaned["is_sensor_outlier"] = is_sensor_glitch
        
        return cleaned

    def extract_features(self, pack_summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        Derives all required features specified in Section 8:
        Voltage_mean, Voltage_min, Voltage_max, Voltage_std, Voltage_sag,
        Current_mean, Current_max, Temperature_mean, Temperature_max, Temperature_rise,
        Cell_voltage_difference, Resistance_growth, Capacity_fade, C_rate.
        """
        cells = pack_summary.get("cells", [])
        if not cells:
            return {}
            
        voltages = [float(c.get("voltage", 3.2)) for c in cells]
        temps = [float(c.get("temperature", c.get("temp_c", 25.0))) for c in cells]
        pack_curr = float(pack_summary.get("pack_current", pack_summary.get("current", 0.0)))
        currents = [float(c.get("current", pack_curr)) for c in cells]
        resistances = [float(c.get("internal_resistance", c.get("internal_resistance_mohm", settings.NOMINAL_CELL_RESISTANCE_MOHM))) for c in cells]
        
        # Historical buffer management for smoothing
        self.voltage_history.append(float(pack_summary.get("pack_voltage", sum(voltages))))
        self.current_history.append(float(pack_summary.get("pack_current", 0.0)))
        self.temp_history.append(float(pack_summary.get("avg_temperature", np.mean(temps))))
        
        if len(self.voltage_history) > self.window_size:
            self.voltage_history.pop(0)
            self.current_history.pop(0)
            self.temp_history.pop(0)
            
        v_mean = float(np.mean(voltages))
        v_min = float(np.min(voltages))
        v_max = float(np.max(voltages))
        v_std = float(np.std(voltages))
        
        # Cell voltage difference (maximum deviation from pack mean)
        v_diffs = [abs(v - v_mean) for v in voltages]
        max_v_diff = float(np.max(v_diffs))
        
        # Voltage sag (measured against nominal rest per cell 3.3V)
        v_sag = calculate_voltage_sag(3.30, v_min)
        
        # Current statistics
        cur_mean = float(np.mean(self.current_history))
        cur_max = float(np.max(np.abs(self.current_history)))
        
        # Temperature statistics
        t_mean = float(np.mean(temps))
        t_max = float(np.max(temps))
        t_rise = calculate_temperature_rise(t_max, settings.BASELINE_TEMP_C)
        
        # Degradation statistics
        avg_res = float(np.mean(resistances))
        res_growth = calculate_resistance_growth(avg_res, settings.NOMINAL_CELL_RESISTANCE_MOHM)
        cap_fade = calculate_capacity_fade(float(cells[0]["capacity"]), settings.RATED_CAPACITY_AH)
        c_rate = calculate_c_rate(pack_summary.get("pack_current", 0.0), settings.RATED_CAPACITY_AH)
        
        return {
            "Voltage_mean": round(v_mean, 3),
            "Voltage_min": round(v_min, 3),
            "Voltage_max": round(v_max, 3),
            "Voltage_std": round(v_std, 4),
            "Voltage_sag": round(v_sag, 3),
            "Current_mean": round(cur_mean, 2),
            "Current_max": round(cur_max, 2),
            "Temperature_mean": round(t_mean, 2),
            "Temperature_max": round(t_max, 2),
            "Temperature_rise": round(t_rise, 2),
            "Cell_voltage_difference": round(max_v_diff, 3),
            "Resistance_growth": round(res_growth, 2),
            "Capacity_fade": round(cap_fade, 2),
            "C_rate": round(c_rate, 3),
            "soc": round(float(pack_summary.get("soc", 50.0)), 2),
            "cycle": int(pack_summary.get("cycle", 1)),
            "capacity": round(float(cells[0].get("capacity", settings.RATED_CAPACITY_AH)), 2)
        }

pipeline = FeaturePipeline()
