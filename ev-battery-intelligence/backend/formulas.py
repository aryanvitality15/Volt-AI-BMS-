"""
EV BATTERY INTELLIGENCE - FORMULAS ENGINE
Explicit, auditable implementations of all mathematical, physical,
and degradation formulations specified in the system design.
"""

from typing import Dict, Any, Tuple
from config import settings

def calculate_soh(q_current: float, q_rated: float = settings.RATED_CAPACITY_AH) -> float:
    """
    SOH (%) = (Q_current / Q_rated) * 100
    Where:
      Q_rated = original rated battery capacity (Ah)
      Q_current = currently available capacity (Ah)
    """
    if q_rated <= 0:
        return 0.0
    soh = (q_current / q_rated) * 100.0
    return max(0.0, min(100.0, round(soh, 2)))

def calculate_soc_coulomb_counting(
    soc_prev: float,
    current_a: float,
    dt_seconds: float,
    q_nom_ah: float = settings.RATED_CAPACITY_AH
) -> float:
    """
    Coulomb Counting:
    SOC(t) = SOC(t0) - [1 / (Q_nom * 3600)] * integral(I(t) dt)
    Sign convention:
      Positive current = Discharging (reduces SOC)
      Negative current = Charging (increases SOC)
    """
    if q_nom_ah <= 0:
        return soc_prev
    delta_soc = (current_a * dt_seconds) / (q_nom_ah * 3600.0) * 100.0
    new_soc = soc_prev - delta_soc
    return max(0.0, min(100.0, round(new_soc, 2)))

def calculate_c_rate(current_a: float, q_rated_ah: float = settings.RATED_CAPACITY_AH) -> float:
    """
    C_rate = |Current| / Rated_Capacity
    """
    if q_rated_ah <= 0:
        return 0.0
    return round(abs(current_a) / q_rated_ah, 3)

def calculate_voltage_sag(v_rest: float, v_load: float) -> float:
    """
    Voltage_sag = V_rest - V_load (V)
    Reflects IR drop across cells under load.
    """
    return round(max(0.0, v_rest - v_load), 3)

def calculate_temperature_rise(t_current: float, t_baseline: float = settings.BASELINE_TEMP_C) -> float:
    """
    Temperature_rise = T_current - T_baseline (°C)
    """
    return round(t_current - t_baseline, 2)

def calculate_cell_voltage_difference(cell_voltage: float, pack_mean_voltage: float) -> float:
    """
    Cell_voltage_difference = V_cell - V_pack_mean (V)
    """
    return round(cell_voltage - pack_mean_voltage, 3)

def calculate_resistance_growth(r_current: float, r_initial: float = settings.NOMINAL_CELL_RESISTANCE_MOHM) -> float:
    """
    Resistance_growth (%) = ((R_current - R_initial) / R_initial) * 100
    """
    if r_initial <= 0:
        return 0.0
    growth = ((r_current - r_initial) / r_initial) * 100.0
    return round(growth, 2)

def calculate_capacity_fade(q_current: float, q_rated: float = settings.RATED_CAPACITY_AH) -> float:
    """
    Capacity_fade (%) = ((Q_rated - Q_current) / Q_rated) * 100
    """
    if q_rated <= 0:
        return 0.0
    fade = ((q_rated - q_current) / q_rated) * 100.0
    return max(0.0, round(fade, 2))

def calculate_rul(current_cycle: int, estimated_eol_cycle: int) -> Tuple[int, int]:
    """
    RUL = Estimated_EOL_Cycle - Current_Cycle (cycles)
    With demonstrative uncertainty estimation (e.g. ± 35 cycles).
    """
    rul = max(0, estimated_eol_cycle - current_cycle)
    uncertainty = 35 if rul > 50 else max(5, int(rul * 0.15))
    return rul, uncertainty

def calculate_battery_risk_index(
    temp_c: float,
    resistance_growth_pct: float,
    max_cell_imbalance_v: float,
    voltage_sag_v: float,
    current_cycle: int,
    soh_pct: float,
    is_anomaly: bool,
    custom_weights: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Battery Risk Index (BRI):
    Transparent normalized weighted risk:
    BRI = sum(wi * Risk_i) normalized 0 to 100.
    
    Sub-risks normalized to 0-100 scale:
    - Temperature Risk: 0 at <=25°C, 50 at 45°C, 100 at >=60°C
    - Resistance Risk: 0 at <=0%, 50 at 25% growth, 100 at >=50% growth
    - Imbalance Risk: 0 at <=0.02V, 50 at 0.08V, 100 at >=0.15V
    - Voltage Sag Risk: 0 at <=0.1V, 50 at 0.4V, 100 at >=0.8V
    - Cycle Ageing Risk: 0 at 0 cycles, 50 at 750 cycles, 100 at >=1500 cycles
    - SOH Risk: 0 at 100% SOH, 50 at 80% SOH, 100 at <=70% SOH
    - Anomaly Risk: 0 if normal, 100 if anomaly detected
    """
    w = custom_weights or {
        "temperature": settings.BRI_WEIGHT_TEMP,
        "resistance": settings.BRI_WEIGHT_RESISTANCE,
        "imbalance": settings.BRI_WEIGHT_IMBALANCE,
        "voltage": settings.BRI_WEIGHT_VOLTAGE,
        "cycle": settings.BRI_WEIGHT_CYCLE,
        "soh": settings.BRI_WEIGHT_SOH,
        "anomaly": settings.BRI_WEIGHT_ANOMALY
    }
    
    # Normalize weights so sum is 1.0
    total_w = sum(w.values()) or 1.0
    nw = {k: v / total_w for k, v in w.items()}
    
    # Calculate sub-factor risk scores (0-100)
    # 1. Temperature: Safe < 35, Warning 45, Danger 60
    if temp_c <= 25.0:
        r_temp = 5.0
    elif temp_c <= 45.0:
        r_temp = 5.0 + ((temp_c - 25.0) / 20.0) * 45.0
    else:
        r_temp = 50.0 + min(50.0, ((temp_c - 45.0) / 15.0) * 50.0)
        
    # 2. Resistance Growth
    if resistance_growth_pct <= 0:
        r_res = 5.0
    elif resistance_growth_pct <= 25.0:
        r_res = 5.0 + (resistance_growth_pct / 25.0) * 45.0
    else:
        r_res = 50.0 + min(50.0, ((resistance_growth_pct - 25.0) / 25.0) * 50.0)
        
    # 3. Cell Imbalance
    if max_cell_imbalance_v <= 0.02:
        r_imb = 5.0
    elif max_cell_imbalance_v <= 0.08:
        r_imb = 5.0 + ((max_cell_imbalance_v - 0.02) / 0.06) * 45.0
    else:
        r_imb = 50.0 + min(50.0, ((max_cell_imbalance_v - 0.08) / 0.07) * 50.0)
        
    # 4. Voltage Sag
    if voltage_sag_v <= 0.1:
        r_volt = 5.0
    elif voltage_sag_v <= 0.4:
        r_volt = 5.0 + ((voltage_sag_v - 0.1) / 0.3) * 45.0
    else:
        r_volt = 50.0 + min(50.0, ((voltage_sag_v - 0.4) / 0.4) * 50.0)
        
    # 5. Cycle Ageing
    r_cycle = min(100.0, max(5.0, (current_cycle / 1500.0) * 100.0))
    
    # 6. SOH Degradation Risk (100% SOH = 0 risk, 70% SOH = 100 risk)
    r_soh = min(100.0, max(0.0, ((100.0 - soh_pct) / 30.0) * 100.0))
    
    # 7. Anomaly Risk
    r_anom = 90.0 if is_anomaly else 0.0
    
    sub_scores = {
        "temperature": round(r_temp, 1),
        "resistance": round(r_res, 1),
        "imbalance": round(r_imb, 1),
        "voltage": round(r_volt, 1),
        "cycle": round(r_cycle, 1),
        "soh": round(r_soh, 1),
        "anomaly": round(r_anom, 1)
    }
    
    # Raw BRI score 0-100
    bri_score = sum(nw[k] * sub_scores[k] for k in nw)
    bri_score = round(max(0.0, min(100.0, bri_score)), 1)
    
    # Relative percentage contribution to total BRI (adding up to ~100%)
    weighted_contribs = {k: nw[k] * sub_scores[k] for k in nw}
    total_contrib = sum(weighted_contribs.values()) or 1.0
    contributions_pct = {k: round((v / total_contrib) * 100.0, 1) for k, v in weighted_contribs.items()}
    
    # Categorical Status
    if bri_score < 35.0:
        status = "HEALTHY"
        level = "NORMAL"
    elif bri_score < 65.0:
        status = "MODERATE RISK"
        level = "WARNING"
    else:
        status = "HIGH RISK"
        level = "CRITICAL"
        
    return {
        "score": bri_score,
        "status": status,
        "level": level,
        "sub_scores": sub_scores,
        "weights": nw,
        "contributions_pct": contributions_pct
    }
