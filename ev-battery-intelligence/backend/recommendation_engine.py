"""
EV BATTERY INTELLIGENCE - RECOMMENDATION ENGINE
Generates deterministic, clear advisory operational guidance based on
active fault diagnostics, risk index, and thermal/electrical conditions.
"""

from typing import Dict, Any, List

class RecommendationEngine:
    def generate(
        self,
        fault_class: str,
        risk_score: float,
        features: Dict[str, Any],
        affected_cell: int = None
    ) -> Dict[str, Any]:
        """
        Synthesizes operational advisory recommendations.
        """
        rec_items = []
        action_level = "INFO"
        
        # 1. Condition-specific rules
        if fault_class == "THERMAL ANOMALY" or features.get("Temperature_max", 25.0) > 45.0:
            rec_items.append("Reduce high-current operation and allow the battery pack to cool before initiating another high-power cycle.")
            rec_items.append("Verify cooling loop flow rate and thermal interface integrity.")
            action_level = "CRITICAL" if features.get("Temperature_max", 25.0) > 52.0 else "WARNING"

        if fault_class == "CELL IMBALANCE" or features.get("Cell_voltage_difference", 0.0) > 0.06:
            cell_str = f"Cell {affected_cell}" if affected_cell else "affected cells"
            rec_items.append(f"Inspect BMS cell balancing circuits and allow an extended low-current saturation charge to balance {cell_str}.")
            action_level = max(action_level, "WARNING")

        if fault_class == "HIGH RESISTANCE" or features.get("Resistance_growth", 0.0) > 25.0:
            rec_items.append("Derate maximum discharge peak power by 20% to mitigate excessive ohmic voltage sag and Joule heating.")
            rec_items.append("Schedule impedance spectroscopy (EIS) or busbar connection inspection.")
            action_level = max(action_level, "WARNING")

        if fault_class == "OVERCURRENT" or features.get("Current_max", 0.0) > 75.0:
            rec_items.append("Derate maximum traction inverter current limits to protect cell tabs from excessive ampacity stress.")
            action_level = "CRITICAL"

        if fault_class == "UNDERVOLTAGE" or features.get("Voltage_min", 3.2) < 2.80:
            rec_items.append("Connect to charging supply immediately to prevent irreversible cathode degradation and copper dissolution.")
            rec_items.append("Limit regenerative braking and auxiliary loads.")
            action_level = "CRITICAL"

        if fault_class == "SELF-DISCHARGE":
            cell_str = f"Cell {affected_cell}" if affected_cell else "suspect cells"
            rec_items.append(f"Perform static isolation diagnostics on {cell_str} before continued high-load cycling.")
            action_level = "WARNING"

        if fault_class == "SENSOR ANOMALY":
            rec_items.append("Check wiring harness, sense leads, and BMS connector contacts for loose continuity or sensor drift.")
            action_level = "WARNING"

        # General Risk Level recommendation
        if not rec_items:
            if risk_score < 35.0:
                rec_items.append("Battery operating within nominal parameters. Continue standard scheduled vehicle operation.")
                rec_items.append("Maintain optimal 20%–80% SOC window for maximum cycle life retention.")
                action_level = "INFO"
            elif risk_score < 65.0:
                rec_items.append("Moderate operational stress detected. Avoid consecutive DC fast charging sessions.")
                action_level = "WARNING"
            else:
                rec_items.append("Elevated battery risk index. Restrict high-speed driving and schedule diagnostic inspection.")
                action_level = "CRITICAL"

        primary_recommendation = rec_items[0]
        secondary_recommendations = rec_items[1:]

        return {
            "primary": primary_recommendation,
            "action": primary_recommendation,
            "actions": rec_items,
            "action_level": action_level,
            "urgency": action_level,
            "rationale": secondary_recommendations[0] if secondary_recommendations else "Pack operating within all defined safety and thermal boundaries.",
            "advisory_note": "All recommendations are automated decision-support advisories designed to assist operators and maintenance technicians."
        }

recommendation_engine = RecommendationEngine()
