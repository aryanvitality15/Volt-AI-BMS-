"""
EV BATTERY INTELLIGENCE - WHAT-IF SIMULATOR ENGINE
Interactive sensitivity analysis and scenario simulation:
- Normal charging vs Fast charging vs High-power discharge
- Computes predicted thermal stress, voltage sag, degradation rate, and risk
"""

import math
from typing import Dict, Any
from formulas import calculate_voltage_sag, calculate_battery_risk_index
from config import settings

class WhatIfSimulator:
    def simulate(
        self,
        mode: str = "CHARGING",
        current_a: float = -15.0,
        temp_c: float = 28.0,
        soc_pct: float = 65.0,
        resistance_mohm: float = 34.0,
        current_soh: float = 87.4,
        current_cycle: int = 624
    ) -> Dict[str, Any]:
        """
        Runs sensitivity analysis for the user-defined parameters.
        """
        c_rate = abs(current_a) / settings.RATED_CAPACITY_AH
        
        # 1. Predicted Voltage Sag / Polarization
        pack_res_ohm = (resistance_mohm / 1000.0) * settings.NUM_CELLS
        pack_sag = round(abs(current_a) * pack_res_ohm, 3)
        cell_sag = round(pack_sag / settings.NUM_CELLS, 3)
        
        # 2. Predicted Steady-State Temperature
        # Joule heating: P = I^2 * R, Heat dissipation to ambient (25°C)
        p_joule = math.pow(current_a, 2) * pack_res_ohm
        delta_temp = (p_joule * 0.12)  # Thermal resistance proxy ~0.12 K/W
        pred_temp = round(temp_c + delta_temp, 1)
        
        # 3. Predicted Thermal Stress
        if pred_temp > 46.0 or c_rate > 2.0:
            thermal_stress = "HIGH"
        elif pred_temp > 36.0 or c_rate > 1.0:
            thermal_stress = "MEDIUM"
        else:
            thermal_stress = "LOW"
            
        # 4. Predicted Degradation Acceleration
        # Baseline Arrhenius thermal factor
        temp_factor = math.exp(max(0.0, (pred_temp - 25.0) / 18.0))
        # High C-rate mechanical factor
        c_rate_factor = 1.0 + (math.pow(c_rate, 1.6) * 0.5)
        # SOC stress factor
        soc_factor = 1.0 + (0.8 if soc_pct > 90 else 0.0)
        
        base_deg_per_100_cycles = 4.2  # % SOH per 100 cycles nominal
        accelerated_deg = round(base_deg_per_100_cycles * temp_factor * c_rate_factor * soc_factor, 1)
        
        # 5. Predicted Battery Risk Index
        pred_res_growth = ((resistance_mohm - settings.NOMINAL_CELL_RESISTANCE_MOHM) / settings.NOMINAL_CELL_RESISTANCE_MOHM) * 100.0
        risk_result = calculate_battery_risk_index(
            temp_c=pred_temp,
            resistance_growth_pct=pred_res_growth,
            max_cell_imbalance_v=0.035 if c_rate < 1.0 else 0.075,
            voltage_sag_v=cell_sag,
            current_cycle=current_cycle,
            soh_pct=current_soh,
            is_anomaly=(thermal_stress == "HIGH")
        )
        
        return {
            "parameters": {
                "mode": mode,
                "current_a": current_a,
                "temp_c": temp_c,
                "soc_pct": soc_pct,
                "resistance_mohm": resistance_mohm,
                "c_rate": round(c_rate, 2)
            },
            "predictions": {
                "predicted_temperature_c": pred_temp,
                "thermal_stress": thermal_stress,
                "pack_voltage_sag_v": pack_sag,
                "cell_voltage_sag_v": cell_sag,
                "predicted_degradation_per_100_cycles": accelerated_deg,
                "predicted_soh_after_100_cycles": round(max(50.0, current_soh - accelerated_deg), 1),
                "predicted_risk_score": risk_result["score"],
                "predicted_risk_status": risk_result["status"],
                "predicted_risk_level": risk_result["level"]
            },
            "disclaimer": "Simulated sensitivity output based on equivalent-circuit and Arrhenius thermal degradation models."
        }

whatif_simulator = WhatIfSimulator()
