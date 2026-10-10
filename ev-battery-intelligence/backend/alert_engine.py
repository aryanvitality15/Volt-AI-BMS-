"""
EV BATTERY INTELLIGENCE - ALERT ENGINE
Evaluates real-time telemetry, model predictions, and risk thresholds
to automatically trigger, update, and resolve NORMAL, WARNING, and CRITICAL alerts.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import logging
from database import insert_alert, get_alerts, resolve_alert

logger = logging.getLogger(__name__)

class AlertEngine:
    def __init__(self):
        self.active_alert_cache = {}  # key -> alert_dict

    def evaluate(
        self,
        pack: Dict[str, Any],
        features: Dict[str, Any],
        fault_class: str,
        risk: Dict[str, Any],
        affected_cell: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Evaluates incoming data and returns newly generated or active alerts.
        """
        now = datetime.now().isoformat()
        battery_id = pack.get("battery_id", "EV-001")
        new_alerts = []
        
        t_max = features.get("Temperature_max", 25.0)
        t_rise = features.get("Temperature_rise", 0.0)
        v_diff = features.get("Cell_voltage_difference", 0.0)
        v_min = features.get("Voltage_min", 3.28)
        cur_max = features.get("Current_max", 0.0)
        soc = pack.get("soc", 50.0)
        risk_score = risk.get("score", 20.0)

        # 1. Thermal Alerts
        if t_max >= 52.0:
            key = "CRITICAL_THERMAL"
            if key not in self.active_alert_cache:
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": affected_cell,
                    "level": "CRITICAL",
                    "title": "CRITICAL THERMAL RUNAWAY RISK",
                    "description": f"Battery peak temperature reached {t_max:.1f}°C (Threshold: 52.0°C).",
                    "evidence": f"Peak temp: {t_max:.1f}°C, Temp rise above ambient: +{t_rise:.1f}°C.",
                    "recommended_action": "Halt battery charging/discharging immediately and activate maximum cooling loop.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        elif t_max >= 42.0:
            key = "WARN_THERMAL"
            if key not in self.active_alert_cache and "CRITICAL_THERMAL" not in self.active_alert_cache:
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": affected_cell,
                    "level": "WARNING",
                    "title": "ELEVATED TEMPERATURE DETECTED",
                    "description": f"Battery temperature rising unusually fast to {t_max:.1f}°C.",
                    "evidence": f"Rate of rise elevated, maximum cell temp: {t_max:.1f}°C.",
                    "recommended_action": "Reduce vehicle speed and heavy acceleration demand.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        else:
            # Clear thermal alerts if cooled down
            for k in ["CRITICAL_THERMAL", "WARN_THERMAL"]:
                existing = self.active_alert_cache.pop(k, None)
                if existing:
                    resolve_alert(existing["id"])

        # 2. Cell Imbalance Alerts
        if v_diff >= 0.12:
            key = "CRITICAL_IMBALANCE"
            if key not in self.active_alert_cache:
                cell_str = f"Cell {affected_cell}" if affected_cell else "Multiple cells"
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": affected_cell,
                    "level": "CRITICAL",
                    "title": "SEVERE CELL IMBALANCE DETECTED",
                    "description": f"{cell_str} voltage deviates by {v_diff*1000:.0f} mV from pack average.",
                    "evidence": f"Deviation: {v_diff:.3f} V (Max allowable: 0.120 V).",
                    "recommended_action": "Reduce load and inspect Cell balance circuit.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        elif v_diff >= 0.06:
            key = "WARN_IMBALANCE"
            if key not in self.active_alert_cache and "CRITICAL_IMBALANCE" not in self.active_alert_cache:
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": affected_cell,
                    "level": "WARNING",
                    "title": "CELL VOLTAGE DEVIATION WARNING",
                    "description": f"Cell voltage spread reached {v_diff*1000:.0f} mV.",
                    "evidence": f"Pack average: {features.get('Voltage_mean', 3.28):.3f} V, Max diff: {v_diff:.3f} V.",
                    "recommended_action": "Allow BMS passive balancing at end of charging cycle.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        else:
            for k in ["CRITICAL_IMBALANCE", "WARN_IMBALANCE"]:
                existing = self.active_alert_cache.pop(k, None)
                if existing:
                    resolve_alert(existing["id"])

        # 3. Overcurrent Alerts
        if cur_max >= 75.0:
            key = "CRITICAL_OVERCURRENT"
            if key not in self.active_alert_cache:
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": None,
                    "level": "CRITICAL",
                    "title": "OVERCURRENT SURGE DETECTED",
                    "description": f"Continuous current throughput exceeded {cur_max:.1f} A.",
                    "evidence": f"C-rate surged to {features.get('C_rate', 2.0):.2f}C.",
                    "recommended_action": "Trip auxiliary contactor if demand does not drop within 3 seconds.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        else:
            existing = self.active_alert_cache.pop("CRITICAL_OVERCURRENT", None)
            if existing:
                resolve_alert(existing["id"])

        # 4. Undervoltage Alerts
        if v_min < 2.80:
            key = "CRITICAL_UNDERVOLTAGE"
            if key not in self.active_alert_cache:
                alert = {
                    "timestamp": now,
                    "battery_id": battery_id,
                    "cell_id": affected_cell,
                    "level": "CRITICAL",
                    "title": "CELL UNDERVOLTAGE CUTOFF THREAT",
                    "description": f"Cell terminal voltage dropped to {v_min:.3f} V (Lower knee: 2.800 V).",
                    "evidence": f"SOC: {soc:.1f}%, Minimum cell voltage: {v_min:.3f} V.",
                    "recommended_action": "Connect immediately to charging supply to avoid irreversible degradation.",
                }
                alert["id"] = insert_alert(alert)
                self.active_alert_cache[key] = alert
                new_alerts.append(alert)
        else:
            existing = self.active_alert_cache.pop("CRITICAL_UNDERVOLTAGE", None)
            if existing:
                resolve_alert(existing["id"])

        return list(self.active_alert_cache.values())

alert_engine = AlertEngine()
