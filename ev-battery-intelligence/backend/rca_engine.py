"""
EV BATTERY INTELLIGENCE - ROOT CAUSE ANALYSIS (RCA) ENGINE
Maps anomalous sensor patterns and feature shifts to probable root causes with quantitative evidence.

CRITICAL ARCHITECTURAL CONVENTION:
Uses exact phrasing: 'Probable cause' (NEVER 'Proven cause').
Macroscopic sensor data cannot prove microscopic electrochemical mechanisms.
"""

from typing import Dict, Any, List, Optional

class RootCauseEngine:
    def analyze(
        self,
        fault_class: str,
        features: Dict[str, Any],
        cells: List[Dict[str, Any]],
        confidence: float
    ) -> Dict[str, Any]:
        """
        Synthesizes probable cause, evidence list, affected cell, and confidence.
        """
        if fault_class == "NORMAL":
            return {
                "status": "NORMAL",
                "probable_cause": "Nominal Operating State",
                "evidence": ["All cell voltages within ±15mV", "Temperature within thermal comfort band (<35°C)", "Internal resistance nominal"],
                "affected_cell": None,
                "confidence": confidence,
                "disclaimer": "All electrical and thermal metrics within standard operational boundaries."
            }

        # Identify most abnormal cell
        affected_cell = None
        max_dev = -1.0
        
        v_mean = features.get("Voltage_mean", 3.28)
        for c in cells:
            v_dev = abs(float(c.get("voltage", 3.28)) - v_mean)
            t_val = float(c.get("temperature", 25.0))
            r_val = float(c.get("internal_resistance", 32.0))
            score = v_dev * 10.0 + max(0.0, (t_val - 35.0) * 0.2) + max(0.0, (r_val - 32.0) * 0.3)
            if score > max_dev:
                max_dev = score
                affected_cell = int(c.get("cell_id", 1))

        evidence = []
        probable_cause = "General Parameter Deviation"
        
        # Build quantitative evidence based on features
        r_growth = features.get("Resistance_growth", 0.0)
        t_max = features.get("Temperature_max", 28.0)
        t_rise = features.get("Temperature_rise", 0.0)
        v_sag = features.get("Voltage_sag", 0.0)
        cur_max = features.get("Current_max", 0.0)
        v_diff = features.get("Cell_voltage_difference", 0.0)
        v_min = features.get("Voltage_min", 3.28)
        c_rate = features.get("C_rate", 0.3)

        if fault_class == "CELL IMBALANCE":
            probable_cause = "Cell Capacity/Impedance Mismatch or Passive Balancing Latency"
            evidence.append(f"Cell voltage deviation reached {v_diff:.3f} V (threshold: 0.080 V)")
            if affected_cell:
                evidence.append(f"Cell {affected_cell} lagging behind pack average by {v_diff*1000:.0f} mV")
            evidence.append("Uneven state-of-charge distribution across parallel/series blocks")

        elif fault_class == "THERMAL ANOMALY":
            probable_cause = "Excessive Internal Resistance / Inadequate Thermal Dissipation"
            evidence.append(f"Pack peak temperature elevated at {t_max:.1f}°C")
            evidence.append(f"Temperature rise above ambient baseline reached +{t_rise:.1f}°C")
            if r_growth > 10.0:
                evidence.append(f"Internal resistance elevated by +{r_growth:.1f}% contributing to Joule heating")
            if cur_max > 30.0:
                evidence.append(f"High continuous current load ({cur_max:.1f} A) amplifying heat generation")

        elif fault_class == "HIGH RESISTANCE":
            probable_cause = "Ohmic Degradation / Current Collector Contact Degradation"
            evidence.append(f"Internal resistance increased by +{r_growth:.1f}% over nominal")
            evidence.append(f"Voltage sag under load reached {v_sag:.3f} V")
            evidence.append(f"Pronounced IR drop observed on Cell {affected_cell}")
            evidence.append("Accelerated Joule heating under normal discharge demand")

        elif fault_class == "OVERCURRENT":
            probable_cause = "Severe Inverter Load Demand / Unscheduled Acceleration Transient"
            evidence.append(f"Current demand surged to {cur_max:.1f} A ({c_rate:.2f}C rate)")
            evidence.append("Load exceeds continuous manufacturer discharge rating")
            evidence.append(f"Resultant instant voltage sag of {v_sag:.3f} V across pack")

        elif fault_class == "UNDERVOLTAGE":
            probable_cause = "Deep Discharge / Low SOC Operating Range"
            evidence.append(f"Minimum cell terminal voltage dropped to {v_min:.3f} V (cutoff: 2.800 V)")
            evidence.append(f"Cell {affected_cell} approached lower electrochemical discharge knee")
            evidence.append("Immediate charging or load shedding required")

        elif fault_class == "SELF-DISCHARGE":
            probable_cause = "Internal Parasitic Reaction / Localized Micro-Leakage"
            evidence.append(f"Abnormal SOC decay rate observed on Cell {affected_cell} during low/idle load")
            evidence.append("Asymmetric open-circuit voltage decline relative to adjacent series cells")
            evidence.append("Quiescent balancing current insufficient to compensate decay")

        elif fault_class == "SENSOR ANOMALY":
            probable_cause = "Sensor Hardware Noise / Voltage Tap Lead Intermittency"
            evidence.append("Physically improbable sensor reading rate-of-change detected")
            evidence.append(f"Cell {affected_cell} reported out-of-spec voltage or temperature spike")
            evidence.append("Discrepancy with adjacent cell correlation matrix")

        return {
            "status": "ANOMALY DETECTED",
            "fault_class": fault_class,
            "probable_cause": probable_cause,
            "evidence": evidence,
            "affected_cell": affected_cell,
            "confidence": confidence,
            "disclaimer": "Diagnostic hypothesis derived from macroscopic sensor features. Microscopic mechanisms (e.g. SEI layer growth, lithium plating) cannot be physically proven by non-invasive sensors."
        }

rca_engine = RootCauseEngine()
