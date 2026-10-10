"""
EV BATTERY INTELLIGENCE - AGEING ANALYSIS & ABUSE DETECTION ENGINE
Quantifies long-term degradation mechanisms and flags high-stress battery abuse patterns:
- Ageing Cause Decomposition (Calendar ageing, High temp, Fast charging, High C-rate, Deep discharge)
- Real-time Abuse & Stress Pattern Monitoring
"""

from typing import Dict, Any, List

class AbuseEngine:
    def analyze_ageing(
        self,
        soh: float,
        cycle: int,
        temp_max: float,
        fast_charge_events: int = 83,
        deep_discharge_events: int = 2,
        overcurrent_events: int = 7
    ) -> Dict[str, Any]:
        """
        Decomposes total degradation into physical mechanisms.
        """
        total_degradation = round(max(0.0, 100.0 - soh), 1)
        
        # Relative weights for decomposition based on operational history
        w_calendar = 15.0
        w_temp = 27.0 if temp_max > 38.0 else 18.0
        w_fast = min(35.0, 12.0 + (fast_charge_events / 100.0) * 15.0)
        w_crate = min(30.0, 14.0 + (overcurrent_events / 10.0) * 12.0)
        w_deep = min(20.0, 8.0 + (deep_discharge_events / 5.0) * 8.0)
        
        total_w = w_calendar + w_temp + w_fast + w_crate + w_deep
        
        pct_calendar = round((w_calendar / total_w) * 100.0, 1)
        pct_temp = round((w_temp / total_w) * 100.0, 1)
        pct_fast = round((w_fast / total_w) * 100.0, 1)
        pct_crate = round((w_crate / total_w) * 100.0, 1)
        pct_deep = round(max(0.0, 100.0 - (pct_calendar + pct_temp + pct_fast + pct_crate)), 1)

        breakdown = [
            {"mechanism": "High temperature", "percentage": pct_temp, "description": "Thermal degradation accelerates SEI growth and electrolyte breakdown"},
            {"mechanism": "High C-rate", "percentage": pct_crate, "description": "Mechanical particle cracking during high current throughput"},
            {"mechanism": "Fast charging", "percentage": pct_fast, "description": "Lithium concentration gradients and localized overpotentials"},
            {"mechanism": "Calendar ageing", "percentage": pct_calendar, "description": "Spontaneous chemical decay and solvent co-intercalation over time"},
            {"mechanism": "Deep discharge", "percentage": pct_deep, "description": "Cathode dissolution stress during sustained low SOC operation"}
        ]
        breakdown.sort(key=lambda x: x["percentage"], reverse=True)

        return {
            "total_degradation_pct": total_degradation,
            "breakdown": breakdown
        }

    def detect_abuse(
        self,
        features: Dict[str, Any],
        soc: float,
        mode: str,
        events: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """
        Evaluates battery abuse patterns and returns stress levels (LOW, MEDIUM, HIGH).
        """
        cur = abs(features.get("Current_max", 0.0))
        temp = features.get("Temperature_max", 25.0)
        c_rate = features.get("C_rate", 0.0)
        
        # 1. Fast Charging stress
        if mode == "CHARGING" and c_rate > 1.0:
            stress_fast_charge = "HIGH"
        elif mode == "CHARGING" and c_rate > 0.6:
            stress_fast_charge = "MEDIUM"
        else:
            stress_fast_charge = "LOW"

        # 2. Temperature stress
        if temp >= 45.0 or temp < 5.0:
            stress_temp = "HIGH"
        elif temp >= 36.0 or temp < 15.0:
            stress_temp = "MEDIUM"
        else:
            stress_temp = "LOW"

        # 3. Deep discharge stress
        if soc <= 10.0:
            stress_deep = "HIGH"
        elif soc <= 20.0:
            stress_deep = "MEDIUM"
        else:
            stress_deep = "LOW"

        # 4. High C-rate stress
        if c_rate >= 2.0:
            stress_crate = "HIGH"
        elif c_rate >= 1.2:
            stress_crate = "MEDIUM"
        else:
            stress_crate = "LOW"

        # 5. Long High-SOC stress
        if soc >= 95.0 and temp > 32.0:
            stress_high_soc = "HIGH"
        elif soc >= 90.0:
            stress_high_soc = "MEDIUM"
        else:
            stress_high_soc = "LOW"

        # Overall abuse stress level
        levels = [stress_fast_charge, stress_temp, stress_deep, stress_crate, stress_high_soc]
        if "HIGH" in levels:
            overall = "HIGH"
        elif "MEDIUM" in levels:
            overall = "MEDIUM"
        else:
            overall = "LOW"

        patterns = [
            {"pattern": "Fast charging", "level": stress_fast_charge, "active": stress_fast_charge != "LOW"},
            {"pattern": "Temperature stress", "level": stress_temp, "active": stress_temp != "LOW"},
            {"pattern": "Deep discharge", "level": stress_deep, "active": stress_deep != "LOW"},
            {"pattern": "High C-rate", "level": stress_crate, "active": stress_crate != "LOW"},
            {"pattern": "Long high-SOC operation", "level": stress_high_soc, "active": stress_high_soc != "LOW"}
        ]

        return {
            "overall_stress": overall,
            "patterns": patterns,
            "is_abuse_detected": overall != "LOW"
        }

abuse_engine = AbuseEngine()
