/**
 * BMS Physics & Electrochemical Equations Engine
 * Mathematically and physically rigorous derivations for:
 * 1. Instantaneous Power (W/kW) & Numerical Cumulative Energy Integration (Wh/kWh)
 * 2. Coulomb Counting + Open-Circuit Voltage (OCV) Kalman-Blended State of Charge (SOC%)
 * 3. Cell Imbalance (ΔV) & Dynamic Ohm's Law Internal Resistance (mΩ) Estimation
 * 4. Electrochemical State of Health (SOH%) & Arrhenius Thermal Degradation Stress
 * 5. Remaining Useful Life (RUL Cycles & Hours) & Composite Battery Risk Index (BRI 0-100)
 */

import { CellTelemetry, PackTelemetry, BatteryState, RiskState, RCAState } from '../types';

export interface BatteryChemistryProfile {
  name: 'LFP' | 'NMC' | 'LTO';
  nominalCapacityAh: number;
  nominalCellVoltage: number;
  minCellVoltage: number;
  maxCellVoltage: number;
  coulombicEfficiency: number; // η
  activationEnergyJPerMol: number; // Ea (Arrhenius)
  nominalInternalResistanceMohm: number;
  eolSohThresholdPct: number; // 80.0%
}

export const LFP_DEFAULT_PROFILE: BatteryChemistryProfile = {
  name: 'LFP',
  nominalCapacityAh: 40.0,
  nominalCellVoltage: 3.20,
  minCellVoltage: 2.50,
  maxCellVoltage: 3.65,
  coulombicEfficiency: 0.992,
  activationEnergyJPerMol: 50400, // ~50.4 kJ/mol for LiFePO4
  nominalInternalResistanceMohm: 30.0,
  eolSohThresholdPct: 80.0
};

// LFP Open-Circuit Voltage (OCV) vs SOC lookup table (11 points: 0% to 100%)
const LFP_OCV_LOOKUP: Array<{ soc: number; ocv: number }> = [
  { soc: 0,   ocv: 2.50 },
  { soc: 10,  ocv: 3.12 },
  { soc: 20,  ocv: 3.22 },
  { soc: 30,  ocv: 3.25 },
  { soc: 40,  ocv: 3.28 },
  { soc: 50,  ocv: 3.29 },
  { soc: 60,  ocv: 3.30 },
  { soc: 70,  ocv: 3.31 },
  { soc: 80,  ocv: 3.33 },
  { soc: 90,  ocv: 3.38 },
  { soc: 100, ocv: 3.65 }
];

export class BmsPhysicsEngine {
  private profile: BatteryChemistryProfile = LFP_DEFAULT_PROFILE;
  private cumulativeEnergyWh: number = 0;
  private cumulativeChargeAh: number = 0;
  private lastTimestampMs: number = 0;
  private previousVoltage: number = 25.6;
  private previousCurrent: number = 14.5;
  private previousTemp: number = 25.0;
  private dynamicInternalResistanceMohm: number = 32.0;
  private filteredSoc: number = 65.0;

  constructor(profile?: Partial<BatteryChemistryProfile>) {
    if (profile) {
      this.profile = { ...LFP_DEFAULT_PROFILE, ...profile };
    }
  }

  /**
   * Resets or initialises baseline energy tracking
   */
  public resetIntegration(initialEnergyWh: number = 0, initialSoc: number = 65.0) {
    this.cumulativeEnergyWh = initialEnergyWh;
    this.filteredSoc = initialSoc;
    this.lastTimestampMs = performance.now();
  }

  /**
   * Look up expected SOC from Open Circuit Voltage (OCV)
   */
  public getSocFromOcv(cellVoltage: number): number {
    const table = LFP_OCV_LOOKUP;
    if (cellVoltage <= table[0].ocv) return 0;
    if (cellVoltage >= table[table.length - 1].ocv) return 100;

    for (let i = 0; i < table.length - 1; i++) {
      const p1 = table[i];
      const p2 = table[i + 1];
      if (cellVoltage >= p1.ocv && cellVoltage <= p2.ocv) {
        const factor = (cellVoltage - p1.ocv) / (p2.ocv - p1.ocv);
        return p1.soc + factor * (p2.soc - p1.soc);
      }
    }
    return 50.0;
  }

  /**
   * 1. Instantaneous Power & Numerical Energy Integration (Wh)
   * P = V * I (W)
   * ΔE = P * Δt (Wh)
   */
  public integratePowerAndEnergy(
    voltage: number,
    current: number,
    deltaSec: number
  ): { powerWatts: number; powerKw: number; deltaEnergyWh: number; totalEnergyWh: number } {
    const powerWatts = voltage * current;
    const powerKw = powerWatts / 1000.0;
    const deltaEnergyWh = (powerWatts * deltaSec) / 3600.0;
    this.cumulativeEnergyWh += Math.abs(deltaEnergyWh);

    return {
      powerWatts: Number(powerWatts.toFixed(2)),
      powerKw: Number(powerKw.toFixed(3)),
      deltaEnergyWh: Number(deltaEnergyWh.toFixed(4)),
      totalEnergyWh: Number(this.cumulativeEnergyWh.toFixed(2))
    };
  }

  /**
   * 2. Coulomb Counting + OCV Kalman-Blended State of Charge (SOC%)
   * Blends dynamic Coulomb counting with OCV correction to eliminate drift.
   */
  public computeBlendedSoc(
    current: number,
    avgCellVoltage: number,
    deltaSec: number
  ): number {
    // Coulomb counting: ΔSOC = (η * I * Δt) / (3600 * C_nominal) * 100
    // Discharge is current > 0 (or positive depending on hardware; here current > 0 discharges battery)
    const eta = current < 0 ? this.profile.coulombicEfficiency : 1.0;
    const deltaAh = (current * deltaSec) / 3600.0;
    this.cumulativeChargeAh += deltaAh;

    const deltaSocCoulomb = (-deltaAh * eta / this.profile.nominalCapacityAh) * 100.0;
    let coulombSoc = this.filteredSoc + deltaSocCoulomb;
    coulombSoc = Math.max(0, Math.min(100, coulombSoc));

    // OCV Estimate
    const ocvSoc = this.getSocFromOcv(avgCellVoltage);

    // Kalman-style adaptive blending weight:
    // When current is near-zero (idle/rest), OCV weight is high (0.15).
    // Under heavy charge/discharge, trust Coulomb counting heavily (OCV weight 0.01).
    const absCurrent = Math.abs(current);
    const ocvWeight = absCurrent < 0.8 ? 0.12 : 0.015;

    this.filteredSoc = (1 - ocvWeight) * coulombSoc + ocvWeight * ocvSoc;
    this.filteredSoc = Math.max(0.1, Math.min(100.0, this.filteredSoc));

    return Number(this.filteredSoc.toFixed(1));
  }

  /**
   * 3. Cell Imbalance (ΔV) & Dynamic Ohm's Law Internal Resistance
   * ΔV = max(V_cell) - min(V_cell)
   * R_internal = |ΔV / ΔI| during current step transitions (|ΔI| >= 0.8A)
   */
  public computeImbalanceAndResistance(
    cellVoltages: number[],
    current: number,
    packVoltage: number
  ): { maxImbalanceV: number; dynamicIrMohm: number } {
    let maxV = -Infinity;
    let minV = Infinity;

    for (const v of cellVoltages) {
      if (v > maxV) maxV = v;
      if (v < minV) minV = v;
    }

    const maxImbalanceV = cellVoltages.length > 0 && maxV !== -Infinity
      ? Number((maxV - minV).toFixed(4))
      : 0.012;

    // Estimate internal resistance on dynamic current steps:
    const deltaI = current - this.previousCurrent;
    const deltaV = packVoltage - this.previousVoltage;

    if (Math.abs(deltaI) >= 0.8 && Math.abs(deltaV) > 0.01) {
      const calculatedR = (Math.abs(deltaV) / Math.abs(deltaI)) * 1000.0; // in mΩ
      // Dampen to avoid transient noise spikes
      if (calculatedR >= 5.0 && calculatedR <= 180.0) {
        this.dynamicInternalResistanceMohm = 0.85 * this.dynamicInternalResistanceMohm + 0.15 * calculatedR;
      }
    }

    this.previousCurrent = current;
    this.previousVoltage = packVoltage;

    return {
      maxImbalanceV,
      dynamicIrMohm: Number(this.dynamicInternalResistanceMohm.toFixed(1))
    };
  }

  /**
   * 4. Electrochemical State of Health (SOH%) & Arrhenius Thermal Degradation Stress
   * Arrhenius factor: exp(-Ea / (R * T_kelvin))
   * Capacity fade + resistance growth ratio (R_curr / R_init)
   */
  public computeElectrochemicalSoh(
    cycle: number,
    temperatureC: number,
    internalResistanceMohm: number,
    currentCRate: number
  ): { sohPct: number; arrheniusStressFactor: number; resistanceGrowthPct: number } {
    const T_kelvin = temperatureC + 273.15;
    const R_GAS = 8.314; // J/(mol * K)
    const T_REF_KELVIN = 25.0 + 273.15; // 298.15 K

    // Relative Arrhenius stress factor compared to 25°C reference:
    // exp(-Ea/R * (1/T - 1/T_ref))
    const arrheniusStressFactor = Math.exp(
      (-this.profile.activationEnergyJPerMol / R_GAS) * ((1 / T_kelvin) - (1 / T_REF_KELVIN))
    );

    // Resistance growth: (R_curr - R_nom) / R_nom * 100
    const resistanceGrowthPct = Math.max(
      0,
      ((internalResistanceMohm - this.profile.nominalInternalResistanceMohm) / this.profile.nominalInternalResistanceMohm) * 100.0
    );

    // Baseline degradation curve: 100 - (cycle * slope) * Arrhenius * C_rate_penalty
    const cRateStress = 1.0 + Math.max(0, currentCRate - 0.5) * 0.4;
    const cycleDegradationPct = (cycle / 3000.0) * 18.0 * arrheniusStressFactor * cRateStress;
    const irPenaltyPct = (resistanceGrowthPct / 100.0) * 4.0;

    let sohPct = 100.0 - cycleDegradationPct - irPenaltyPct;
    sohPct = Math.max(40.0, Math.min(100.0, sohPct));

    return {
      sohPct: Number(sohPct.toFixed(1)),
      arrheniusStressFactor: Number(arrheniusStressFactor.toFixed(3)),
      resistanceGrowthPct: Number(resistanceGrowthPct.toFixed(1))
    };
  }

  /**
   * 5. Remaining Useful Life (RUL Cycles & Hours) & Battery Risk Index (BRI 0-100)
   * RUL to 80% EOL threshold
   * BRI weighted by thermal rate of rise (dT/dt), cell imbalance, overcurrent, and voltage sag
   */
  public computeRulAndBri(
    sohPct: number,
    cycle: number,
    avgTempC: number,
    deltaSec: number,
    maxImbalanceV: number,
    packCurrent: number,
    anomalyScore: number = 0
  ): { rulCycles: number; rulHours: number; briScore: number; riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' } {
    // RUL: cycles remaining until SOH drops to 80.0%
    const remainingSohBudget = Math.max(0, sohPct - this.profile.eolSohThresholdPct);
    const degradationPerCycle = cycle > 10 ? (100.0 - sohPct) / cycle : 0.02;
    const effectiveSlope = Math.max(0.005, degradationPerCycle);
    const rulCycles = Math.round(remainingSohBudget / effectiveSlope);

    // Approximate operational hours based on standard cycle duration (~1.8h)
    const rulHours = Math.round(rulCycles * 1.8);

    // Thermal rate of rise dT/dt
    const dT = avgTempC - this.previousTemp;
    const dT_dt = deltaSec > 0 ? (dT / deltaSec) * 60.0 : 0; // °C per minute
    this.previousTemp = avgTempC;

    // Battery Risk Index (0 - 100 composite index)
    // 1. Thermal Component (30%)
    let thermalScore = 0;
    if (avgTempC > 45) thermalScore = 100;
    else if (avgTempC > 35) thermalScore = (avgTempC - 35) * 10;
    else if (dT_dt > 2.0) thermalScore = Math.min(100, dT_dt * 30);
    else thermalScore = Math.max(0, (avgTempC - 25) * 2.5);

    // 2. Imbalance Component (25%)
    let imbalanceScore = 0;
    if (maxImbalanceV > 0.08) imbalanceScore = 100;
    else if (maxImbalanceV > 0.03) imbalanceScore = (maxImbalanceV - 0.03) / 0.05 * 100;
    else imbalanceScore = (maxImbalanceV / 0.03) * 25;

    // 3. Current Stress Component (20%)
    const absCurrent = Math.abs(packCurrent);
    let currentScore = 0;
    if (absCurrent > 40) currentScore = 100;
    else if (absCurrent > 25) currentScore = ((absCurrent - 25) / 15) * 80 + 20;
    else currentScore = (absCurrent / 25) * 20;

    // 4. SOH Degradation Component (15%)
    const sohDeficit = Math.max(0, 100 - sohPct);
    const sohScore = (sohDeficit / 25.0) * 100;

    // 5. ML Anomaly Component (10%)
    const mlScore = Math.min(100, anomalyScore);

    const briScore = Math.round(
      0.30 * thermalScore +
      0.25 * imbalanceScore +
      0.20 * currentScore +
      0.15 * Math.min(100, sohScore) +
      0.10 * mlScore
    );

    const clampedBri = Math.max(0, Math.min(100, briScore));

    const riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' =
      clampedBri >= 75 ? 'CRITICAL' :
      clampedBri >= 50 ? 'HIGH' :
      clampedBri >= 25 ? 'MODERATE' : 'LOW';

    return {
      rulCycles,
      rulHours,
      briScore: clampedBri,
      riskLevel
    };
  }
}

export const bmsPhysics = new BmsPhysicsEngine();
