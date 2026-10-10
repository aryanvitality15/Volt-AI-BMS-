import { BatteryState, CellTelemetry, AlertItem, PackTelemetry, AIEngineState, RiskState, RCAState, RecommendationState } from '../types';

/**
 * Lithium Iron Phosphate (LiFePO4) 3.2V Open-Circuit Voltage Curve
 * Accurate electrochemical representation of LFP characteristic flat plateau and knees.
 */
export function lfpOcv(soc: number): number {
  const s = Math.max(0.0, Math.min(100.0, soc)) / 100.0;
  if (s < 0.05) {
    return 2.80 + (s / 0.05) * 0.25;
  } else if (s < 0.15) {
    return 3.05 + ((s - 0.05) / 0.10) * 0.15;
  } else if (s < 0.85) {
    // Flat plateau typical of LiFePO4 (~3.28V - 3.32V)
    return 3.20 + 0.10 * Math.pow(s, 0.5) + 0.02 * Math.log(s / (1.001 - s));
  } else if (s < 0.95) {
    return 3.33 + ((s - 0.85) / 0.10) * 0.15;
  } else {
    return 3.48 + ((s - 0.95) / 0.05) * 0.17;
  }
}

export class ClientBatterySimulator {
  private batteryId: string = "EV-BAT-001";
  private numCells: number = 8;
  private ratedCapacity: number = 40.0; // Ah
  private ambientTemp: number = 25.0; // °C

  private cycle: number = 624;
  private soh: number = 87.4;
  private soc: number = 64.8;
  private packCurrent: number = 14.5;
  private mode: string = "DISCHARGING";
  private activeScenario: string = "NORMAL";

  private cells: Array<{
    cell_id: number;
    resistance_mohm: number;
    capacity_ah: number;
    soc: number;
    temp_c: number;
    voltage: number;
  }> = [];

  private alerts: AlertItem[] = [];
  private alertCounter: number = 1;

  constructor() {
    this.resetCells();
  }

  private resetCells() {
    this.cells = [];
    for (let i = 1; i <= this.numCells; i++) {
      const rInit = 32.0 * (1.0 + (Math.sin(i * 1.5) * 0.01));
      this.cells.push({
        cell_id: i,
        resistance_mohm: rInit * (1.0 + (100.0 - this.soh) * 0.01),
        capacity_ah: this.ratedCapacity * (this.soh / 100.0),
        soc: this.soc + (i % 2 === 0 ? 0.3 : -0.3),
        temp_c: this.ambientTemp + 1.2 + (i * 0.1),
        voltage: 3.28
      });
    }
  }

  public setScenario(scenario: string): boolean {
    const valid = [
      "NORMAL", "HIGH TEMPERATURE", "CELL IMBALANCE", "HIGH RESISTANCE",
      "OVERCURRENT", "UNDERVOLTAGE", "SELF-DISCHARGE", "CAPACITY DEGRADATION",
      "SENSOR ANOMALY", "FAST CHARGING", "HIGH C-RATE", "DEEP DISCHARGE",
      "LONG HIGH SOC OPERATION"
    ];
    const scUpper = scenario.toUpperCase().replace(/_/g, " ").trim();
    const matched = valid.find(s => s === scUpper || s.replace(/ /g, "_") === scUpper.replace(/ /g, "_"));
    
    if (matched) {
      this.activeScenario = matched;
      
      // Cleanly isolate cell states across scenario switches
      if (this.activeScenario !== "CELL IMBALANCE" && this.activeScenario !== "SELF-DISCHARGE") {
        this.cells.forEach(c => c.soc = this.soc);
      }
      if (this.activeScenario !== "HIGH RESISTANCE" && this.activeScenario !== "HIGH TEMPERATURE") {
        this.cells.forEach(c => c.resistance_mohm = 32.0 * (1.0 + (100.0 - this.soh) * 0.01));
      }
      if (this.activeScenario !== "HIGH TEMPERATURE") {
        this.cells.forEach(c => c.temp_c = this.ambientTemp + 1.2 + (c.cell_id * 0.1));
      }

      // Apply scenario parameter presets with realistic electrochemical responses
      if (this.activeScenario === "FAST CHARGING") {
        this.soh = 85.3;
        this.soc = 72.0;
        this.mode = "CHARGING";
        this.packCurrent = -52.0;
      } else if (this.activeScenario === "OVERCURRENT") {
        this.soh = 82.1;
        this.soc = 42.0;
        this.packCurrent = 88.0;
      } else if (this.activeScenario === "HIGH C-RATE") {
        this.soh = 79.4;
        this.soc = 38.0;
        this.packCurrent = 92.0;
      } else if (this.activeScenario === "DEEP DISCHARGE") {
        this.soh = 77.2;
        this.soc = 4.2;
        this.packCurrent = 12.0;
      } else if (this.activeScenario === "UNDERVOLTAGE") {
        this.soh = 78.6;
        this.soc = 6.5;
        this.packCurrent = 15.0;
      } else if (this.activeScenario === "LONG HIGH SOC OPERATION") {
        this.soh = 83.0;
        this.soc = 98.5;
        this.mode = "IDLE";
        this.packCurrent = 0.2;
      } else if (this.activeScenario === "HIGH TEMPERATURE") {
        this.soh = 76.2;
        this.soc = 58.4;
        this.packCurrent = 36.0;
        this.cells.forEach(c => {
          c.temp_c = Math.max(c.temp_c, 52.5 + (c.cell_id * 0.3));
          c.resistance_mohm = 46.5;
        });
      } else if (this.activeScenario === "CELL IMBALANCE") {
        this.soh = 81.5;
        this.soc = 52.0;
        this.packCurrent = 18.0;
      } else if (this.activeScenario === "HIGH RESISTANCE") {
        this.soh = 74.8;
        this.soc = 48.0;
        this.packCurrent = 24.0;
      } else if (this.activeScenario === "SELF-DISCHARGE") {
        this.soh = 80.2;
        this.soc = 34.0;
        this.packCurrent = 8.0;
      } else if (this.activeScenario === "CAPACITY DEGRADATION") {
        this.soh = 68.5;
        this.soc = 45.0;
        this.packCurrent = 14.0;
      } else if (this.activeScenario === "SENSOR ANOMALY") {
        this.soh = 87.4;
        this.soc = 64.8;
        this.packCurrent = 14.5;
      } else if (this.activeScenario === "NORMAL") {
        this.soh = 87.4;
        this.soc = 64.8;
        this.packCurrent = this.mode === "CHARGING" ? -15.0 : 14.5;
      }
      return true;
    }
    return false;
  }

  public getScenario(): string {
    return this.activeScenario;
  }

  public step(dt: number = 1.0): BatteryState {
    const now = new Date().toISOString();
    const targetCellId = 4;

    // 1. Advance fractional cycle
    if (this.mode === "CHARGING" || this.mode === "DISCHARGING") {
      this.cycle += 0.0001 * dt;
    }

    // 2. Adjust pack current by scenario
    let currentTarget = this.packCurrent;
    const noise = (Math.random() - 0.5) * 0.4;
    
    if (this.activeScenario === "OVERCURRENT") {
      currentTarget = 88.0 + noise * 5;
    } else if (this.activeScenario === "FAST CHARGING") {
      currentTarget = -52.0 + noise * 2;
    } else if (this.activeScenario === "HIGH C-RATE") {
      currentTarget = 92.0 + noise * 4;
    } else if (this.activeScenario === "DEEP DISCHARGE") {
      currentTarget = 22.0 + noise;
    } else if (this.activeScenario === "LONG HIGH SOC OPERATION") {
      currentTarget = 0.2 + noise * 0.1;
    } else {
      currentTarget = (this.mode === "CHARGING" ? -15.0 : 14.5) + noise;
    }
    this.packCurrent = Number(currentTarget.toFixed(2));

    // 3. SOH degradation
    if (this.activeScenario === "CAPACITY DEGRADATION") {
      this.soh = Math.max(70.5, this.soh - 0.04 * dt);
    } else {
      this.soh = Math.max(70.0, this.soh - 0.00002 * dt);
    }

    // 4. Process Cells
    const cellVoltages: number[] = [];
    const cellTemps: number[] = [];

    this.cells.forEach(c => {
      const cid = c.cell_id;

      // Resistance shifts
      if (this.activeScenario === "HIGH RESISTANCE" && cid === targetCellId) {
        c.resistance_mohm = 46.5 + (Math.random() - 0.5) * 0.4;
      } else if (this.activeScenario === "HIGH TEMPERATURE") {
        c.resistance_mohm = 43.5 + (Math.random() - 0.5) * 0.2;
      } else if (this.activeScenario === "NORMAL") {
        c.resistance_mohm = 32.0 * (1.0 + (100.0 - this.soh) * 0.01);
      }

      // SOC integration (Coulomb Counting)
      if (this.activeScenario === "CELL IMBALANCE" && cid === targetCellId) {
        c.soc = Math.max(10.0, c.soc - 0.3 * dt);
      } else if (this.activeScenario === "SELF-DISCHARGE" && cid === targetCellId) {
        c.soc = Math.max(5.0, c.soc - 0.45 * dt);
      } else {
        const deltaSoc = (this.packCurrent * dt) / (this.ratedCapacity * 3600.0) * 100.0;
        c.soc = Math.max(0.0, Math.min(100.0, c.soc - deltaSoc));
      }

      // Thermal dynamics: Joule heating (I^2 * R) + heat dissipation
      const rCellOhm = (c.resistance_mohm / this.numCells) / 1000.0;
      const pJoule = Math.pow(this.packCurrent, 2) * rCellOhm;
      const thermalGain = (pJoule * 0.02) * dt;
      const thermalLoss = 0.03 * (c.temp_c - this.ambientTemp) * dt;
      c.temp_c += (thermalGain - thermalLoss);

      if (this.activeScenario === "HIGH TEMPERATURE") {
        c.temp_c = Math.min(62.0, c.temp_c + 1.25 * dt);
      } else if (this.activeScenario === "HIGH RESISTANCE" && cid === targetCellId) {
        c.temp_c = Math.min(56.0, c.temp_c + 0.85 * dt);
      } else if (this.activeScenario === "FAST CHARGING") {
        c.temp_c = Math.min(46.0, c.temp_c + 0.65 * dt);
      }

      // Terminal voltage V = OCV - IR
      const vOcv = lfpOcv(c.soc);
      const vIrDrop = this.packCurrent * rCellOhm;
      let vTerm = vOcv - vIrDrop + (Math.random() - 0.5) * 0.004;

      if (this.activeScenario === "UNDERVOLTAGE") {
        vTerm = Math.min(vTerm, 2.72 + (Math.random() - 0.5) * 0.02);
      } else if (this.activeScenario === "CELL IMBALANCE" && cid === targetCellId) {
        vTerm = Math.max(2.5, vTerm - 0.18 + (Math.random() - 0.5) * 0.005);
      } else if (this.activeScenario === "SENSOR ANOMALY" && cid === targetCellId) {
        vTerm = Math.random() > 0.5 ? 4.85 : 1.20;
        c.temp_c = 89.4;
      }

      c.voltage = Number(vTerm.toFixed(3));
      c.temp_c = Number(c.temp_c.toFixed(1));
      c.capacity_ah = Number((this.ratedCapacity * (this.soh / 100.0)).toFixed(2));

      cellVoltages.push(c.voltage);
      cellTemps.push(c.temp_c);
    });

    // Pack aggregates
    const packVoltage = Number(cellVoltages.reduce((a, b) => a + b, 0).toFixed(2));
    const meanVoltage = packVoltage / this.numCells;
    const maxVoltage = Math.max(...cellVoltages);
    const minVoltage = Math.min(...cellVoltages);
    const maxImbalance = Number((maxVoltage - minVoltage).toFixed(3));
    const avgTemp = Number((cellTemps.reduce((a, b) => a + b, 0) / this.numCells).toFixed(1));
    const maxTemp = Number(Math.max(...cellTemps).toFixed(1));
    const minTemp = Number(Math.min(...cellTemps).toFixed(1));
    const tempRise = Number((avgTemp - this.ambientTemp).toFixed(1));
    const voltageSag = Number(Math.max(0.0, 26.4 - packVoltage).toFixed(3));
    const resistanceGrowth = Number((((this.cells[0]?.resistance_mohm || 32) - 32.0) / 32.0 * 100).toFixed(1));
    const capacityFade = Number((100.0 - this.soh).toFixed(1));

    this.soc = Number((this.cells.reduce((a, b) => a + b.soc, 0) / this.numCells).toFixed(1));

    if (this.packCurrent < -1.0) {
      this.mode = "CHARGING";
    } else if (this.packCurrent > 1.0) {
      this.mode = "DISCHARGING";
    } else {
      this.mode = "IDLE";
    }

    const cRate = Number((Math.abs(this.packCurrent) / this.ratedCapacity).toFixed(3));

    // Cell Telemetry objects
    const cellTelemetryList: CellTelemetry[] = this.cells.map(c => {
      let healthStatus = "NORMAL";
      if (c.temp_c > 50.0 || c.voltage < 2.8 || c.voltage > 3.65 || c.resistance_mohm > 42.0) {
        healthStatus = "FAULT";
      } else if (c.temp_c > 40.0 || Math.abs(c.voltage - meanVoltage) > 0.05 || c.resistance_mohm > 36.0) {
        healthStatus = "WARNING";
      }

      return {
        cell_id: c.cell_id,
        voltage: c.voltage,
        current: this.packCurrent,
        temp_c: c.temp_c,
        temperature: c.temp_c,
        soc: Number(c.soc.toFixed(1)),
        internal_resistance_mohm: Number(c.resistance_mohm.toFixed(1)),
        internal_resistance: Number(c.resistance_mohm.toFixed(1)),
        capacity_ah: c.capacity_ah,
        capacity: c.capacity_ah,
        health_status: healthStatus
      };
    });

    // 5. AI / ML Model Inference Simulation
    const isAnomaly = this.activeScenario !== "NORMAL";
    let faultClass = "NORMAL";
    let faultConfidence = 96.2;
    let anomalyScore = 12.0;

    if (this.activeScenario === "CELL IMBALANCE") {
      faultClass = "CELL IMBALANCE";
      faultConfidence = 97.4;
      anomalyScore = 78.5;
    } else if (this.activeScenario === "HIGH TEMPERATURE") {
      faultClass = "THERMAL ANOMALY";
      faultConfidence = 98.1;
      anomalyScore = 92.4;
    } else if (this.activeScenario === "HIGH RESISTANCE") {
      faultClass = "HIGH RESISTANCE";
      faultConfidence = 94.6;
      anomalyScore = 81.2;
    } else if (this.activeScenario === "OVERCURRENT") {
      faultClass = "OVERCURRENT";
      faultConfidence = 99.0;
      anomalyScore = 89.0;
    } else if (this.activeScenario === "UNDERVOLTAGE") {
      faultClass = "UNDERVOLTAGE";
      faultConfidence = 95.8;
      anomalyScore = 84.5;
    } else if (this.activeScenario === "SELF-DISCHARGE") {
      faultClass = "SELF-DISCHARGE";
      faultConfidence = 93.5;
      anomalyScore = 74.0;
    } else if (this.activeScenario === "SENSOR ANOMALY") {
      faultClass = "SENSOR ANOMALY";
      faultConfidence = 98.9;
      anomalyScore = 96.0;
    } else if (this.activeScenario === "FAST CHARGING") {
      faultClass = "FAST CHARGING";
      faultConfidence = 92.0;
      anomalyScore = 38.0;
    } else if (this.activeScenario === "HIGH C-RATE") {
      faultClass = "HIGH C-RATE";
      faultConfidence = 95.0;
      anomalyScore = 65.0;
    } else if (this.activeScenario === "DEEP DISCHARGE") {
      faultClass = "DEEP DISCHARGE";
      faultConfidence = 94.0;
      anomalyScore = 72.0;
    }

    // Remaining Useful Life (RUL) estimation & dynamic scenario degradation
    let eolCycle = 904;
    let rulCycles = 280;
    let degradationRate = 0.0202;
    let rulUncertainty = 35;

    if (this.activeScenario === "HIGH TEMPERATURE") {
      eolCycle = 740;
      rulCycles = 115;
      degradationRate = 0.0482;
      rulUncertainty = 22;
    } else if (this.activeScenario === "CELL IMBALANCE") {
      eolCycle = 790;
      rulCycles = 165;
      degradationRate = 0.0325;
      rulUncertainty = 28;
    } else if (this.activeScenario === "HIGH RESISTANCE") {
      eolCycle = 722;
      rulCycles = 98;
      degradationRate = 0.0512;
      rulUncertainty = 18;
    } else if (this.activeScenario === "OVERCURRENT") {
      eolCycle = 755;
      rulCycles = 130;
      degradationRate = 0.0440;
      rulUncertainty = 25;
    } else if (this.activeScenario === "HIGH C-RATE") {
      eolCycle = 735;
      rulCycles = 110;
      degradationRate = 0.0465;
      rulUncertainty = 20;
    } else if (this.activeScenario === "UNDERVOLTAGE") {
      eolCycle = 706;
      rulCycles = 82;
      degradationRate = 0.0580;
      rulUncertainty = 15;
    } else if (this.activeScenario === "DEEP DISCHARGE") {
      eolCycle = 694;
      rulCycles = 70;
      degradationRate = 0.0610;
      rulUncertainty = 14;
    } else if (this.activeScenario === "SELF-DISCHARGE") {
      eolCycle = 780;
      rulCycles = 155;
      degradationRate = 0.0340;
      rulUncertainty = 26;
    } else if (this.activeScenario === "CAPACITY DEGRADATION") {
      eolCycle = 669;
      rulCycles = 45;
      degradationRate = 0.0720;
      rulUncertainty = 10;
    } else if (this.activeScenario === "FAST CHARGING") {
      eolCycle = 820;
      rulCycles = 195;
      degradationRate = 0.0290;
      rulUncertainty = 30;
    }

    const soh100 = Number((this.soh - degradationRate * 100).toFixed(1));

    const aiState: AIEngineState = {
      soh: Number(this.soh.toFixed(1)),
      is_anomaly: isAnomaly,
      anomaly_score: Number(anomalyScore.toFixed(1)),
      fault_class: faultClass,
      fault_confidence: Number(faultConfidence.toFixed(1)),
      rul: {
        rul_cycles: rulCycles,
        rul_uncertainty: rulUncertainty,
        rul_display: `${rulCycles} ± ${rulUncertainty} cycles`,
        soh_in_100_cycles: soh100,
        estimated_eol_cycle: eolCycle
      }
    };

    // 6. Battery Risk Index (BRI)
    let riskScore = 24.0;
    if (this.activeScenario === "HIGH TEMPERATURE") riskScore = 88.5;
    else if (this.activeScenario === "OVERCURRENT") riskScore = 84.0;
    else if (this.activeScenario === "HIGH RESISTANCE") riskScore = 78.0;
    else if (this.activeScenario === "CELL IMBALANCE") riskScore = 72.0;
    else if (this.activeScenario === "UNDERVOLTAGE") riskScore = 82.0;
    else if (this.activeScenario === "DEEP DISCHARGE") riskScore = 85.0;
    else if (this.activeScenario === "CAPACITY DEGRADATION") riskScore = 91.0;
    else if (this.activeScenario === "SENSOR ANOMALY") riskScore = 86.0;
    else if (this.activeScenario === "FAST CHARGING") riskScore = 44.0;

    const riskLevel = riskScore > 75 ? "CRITICAL" : riskScore > 50 ? "WARNING" : "NORMAL";
    const riskStatus = riskScore > 75 ? "HIGH_RISK" : riskScore > 50 ? "MODERATE_RISK" : "HEALTHY";

    const riskState: RiskState = {
      score: Number(riskScore.toFixed(1)),
      status: riskStatus,
      level: riskLevel,
      contributions_pct: {
        temperature: Number((this.activeScenario === "HIGH TEMPERATURE" ? 52.0 : 25.0).toFixed(1)),
        resistance: Number((this.activeScenario === "HIGH RESISTANCE" ? 48.0 : 22.0).toFixed(1)),
        imbalance: Number((this.activeScenario === "CELL IMBALANCE" ? 50.0 : 18.0).toFixed(1)),
        voltage: Number((this.activeScenario === "UNDERVOLTAGE" || this.activeScenario === "DEEP DISCHARGE" ? 48.0 : 15.0).toFixed(1)),
        cycle: 12.0,
        soh: 5.0,
        anomaly: isAnomaly ? 28.0 : 3.0
      }
    };

    // 7. Root Cause Analysis (RCA)
    let probableCause = "Nominal Operating State";
    let evidence: string[] = ["All cell voltages balanced within 15 mV", "Temperatures within 25–28°C envelope", "Ohmic resistance nominal"];
    let affectedCell: number | null = null;

    if (this.activeScenario === "CELL IMBALANCE") {
      probableCause = "Cell Capacity/Impedance Mismatch or Passive Balancing Latency";
      affectedCell = targetCellId;
      evidence = [
        `Cell ${targetCellId} voltage lagging pack mean by ${(maxImbalance * 1000).toFixed(0)} mV`,
        `Max cell imbalance reached ${maxImbalance} V (Threshold: 0.080 V)`,
        "Uneven state-of-charge decay across parallel/series blocks"
      ];
    } else if (this.activeScenario === "HIGH TEMPERATURE") {
      probableCause = "Thermal Runaway Precursor / Excessive Joule Heat Dissipation Failure";
      evidence = [
        `Pack peak temperature reached ${maxTemp}°C (Critical Cutoff: 45.0°C)`,
        `Temperature rise above ambient reached +${tempRise}°C`,
        "Joule heating rate exceeds active convection cooling capability"
      ];
    } else if (this.activeScenario === "HIGH RESISTANCE") {
      probableCause = "Ohmic Degradation / SEI Thickening & Current Collector Degradation";
      affectedCell = targetCellId;
      evidence = [
        `Internal resistance on Cell ${targetCellId} elevated to ${(this.cells[targetCellId - 1]?.resistance_mohm || 46.5).toFixed(1)} mΩ (+45%)`,
        `Voltage sag under discharge load reached ${voltageSag} V`,
        "Elevated local heat generation observed during discharge cycle"
      ];
    } else if (this.activeScenario === "OVERCURRENT") {
      probableCause = "Severe Inverter Load Demand Surge / Ampacity Overload";
      evidence = [
        `Continuous current demand surged to ${this.packCurrent} A (${cRate}C rate)`,
        "Load exceeds continuous manufacturer discharge rating (40A)",
        `Resultant instant voltage sag of ${voltageSag} V across pack`
      ];
    } else if (this.activeScenario === "UNDERVOLTAGE" || this.activeScenario === "DEEP DISCHARGE") {
      probableCause = "Deep Discharge Depletion / Lower Electrochemical Knee Reached";
      affectedCell = targetCellId;
      evidence = [
        `Minimum cell terminal voltage dropped to ${minVoltage} V (Cutoff: 2.800 V)`,
        `Cell ${targetCellId} reached lower electrochemical discharge knee`,
        "Immediate charging required to avoid copper dissolution"
      ];
    } else if (this.activeScenario === "SELF-DISCHARGE") {
      probableCause = "Internal Parasitic Reaction / Localized Micro-Leakage";
      affectedCell = targetCellId;
      evidence = [
        `Abnormal quiescent SOC decay observed on Cell ${targetCellId}`,
        "Asymmetric open-circuit voltage decline relative to adjacent series cells",
        "Passive balancing current insufficient to compensate self-discharge"
      ];
    } else if (this.activeScenario === "CAPACITY DEGRADATION") {
      probableCause = "Irreversible Cathode Degradation / Loss of Active Lithium Inventory";
      evidence = [
        `SOH dropped to critical threshold (${this.soh.toFixed(1)}% < 70%)`,
        "Severe capacity fade from high cycle aging and thermal dwell",
        "Pack replacement or module reconditioning recommended"
      ];
    } else if (this.activeScenario === "SENSOR ANOMALY") {
      probableCause = "BMS Voltage Sense Harness Discontinuity / Analog Front-End Glitch";
      affectedCell = targetCellId;
      evidence = [
        `Extreme non-physical reading (${minVoltage}V - ${maxVoltage}V) on Cell ${targetCellId}`,
        "Step derivative dV/dt exceeds physical electrochemical limits (>500 mV/s)",
        "Check wiring harness and AFE reference channel"
      ];
    }

    const rcaState: RCAState = {
      probable_cause: probableCause,
      evidence: evidence,
      affected_cell: affectedCell,
      confidence: faultConfidence
    };

    // 8. Dynamic Scenario-Tailored TreeSHAP Factor Breakdown
    let xaiFactors: Array<{ name: string; factor: string; percentage: number; contribution: number; impact: string; direction: string }>;

    if (this.activeScenario === "HIGH TEMPERATURE") {
      xaiFactors = [
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 52.4, contribution: 52.4, impact: "Critical", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 26.2, contribution: 26.2, impact: "High", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 14.8, contribution: 14.8, impact: "Moderate", direction: "Negative" },
        { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance", percentage: 4.2, contribution: 4.2, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 2.4, contribution: 2.4, impact: "Minimal", direction: "Neutral" }
      ];
    } else if (this.activeScenario === "CELL IMBALANCE" || this.activeScenario === "SELF-DISCHARGE") {
      xaiFactors = [
        { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance", percentage: 49.6, contribution: 49.6, impact: "Critical", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 25.4, contribution: 25.4, impact: "High", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 13.8, contribution: 13.8, impact: "Moderate", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 8.2, contribution: 8.2, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 3.0, contribution: 3.0, impact: "Minimal", direction: "Neutral" }
      ];
    } else if (this.activeScenario === "HIGH RESISTANCE") {
      xaiFactors = [
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 51.2, contribution: 51.2, impact: "Critical", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 24.6, contribution: 24.6, impact: "High", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 17.4, contribution: 17.4, impact: "Moderate", direction: "Negative" },
        { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance", percentage: 4.5, contribution: 4.5, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 2.3, contribution: 2.3, impact: "Minimal", direction: "Neutral" }
      ];
    } else if (this.activeScenario === "OVERCURRENT" || this.activeScenario === "HIGH C-RATE") {
      xaiFactors = [
        { name: "Current Stress Profile (C-Rate)", factor: "Current Stress Profile", percentage: 48.8, contribution: 48.8, impact: "Critical", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 31.4, contribution: 31.4, impact: "High", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 14.2, contribution: 14.2, impact: "Moderate", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 3.6, contribution: 3.6, impact: "Low", direction: "Negative" },
        { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance", percentage: 2.0, contribution: 2.0, impact: "Minimal", direction: "Neutral" }
      ];
    } else if (this.activeScenario === "UNDERVOLTAGE" || this.activeScenario === "DEEP DISCHARGE") {
      xaiFactors = [
        { name: "Deep Depletion Knee Sag", factor: "Terminal Voltage Sag", percentage: 47.8, contribution: 47.8, impact: "Critical", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 26.4, contribution: 26.4, impact: "High", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 15.2, contribution: 15.2, impact: "Moderate", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 7.6, contribution: 7.6, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 3.0, contribution: 3.0, impact: "Minimal", direction: "Neutral" }
      ];
    } else if (this.activeScenario === "CAPACITY DEGRADATION") {
      xaiFactors = [
        { name: "Active Material Inventory Loss", factor: "Capacity Fade Loss", percentage: 54.0, contribution: 54.0, impact: "Critical", direction: "Negative" },
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 24.5, contribution: 24.5, impact: "High", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 13.8, contribution: 13.8, impact: "Moderate", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Stress", percentage: 5.5, contribution: 5.5, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 2.2, contribution: 2.2, impact: "Minimal", direction: "Neutral" }
      ];
    } else {
      // Nominal baseline
      xaiFactors = [
        { name: "Cumulative Cycle Aging", factor: "Cumulative Cycle Aging", percentage: 41.2, contribution: 41.2, impact: "High", direction: "Negative" },
        { name: "Thermal Operation Rise", factor: "Operating Temperature Rise", percentage: 32.4, contribution: 32.4, impact: "High", direction: "Negative" },
        { name: "Ohmic Resistance Growth", factor: "Ohmic Resistance Growth", percentage: 15.6, contribution: 15.6, impact: "Moderate", direction: "Negative" },
        { name: "Cell Voltage Imbalance (ΔV)", factor: "Cell Voltage Imbalance", percentage: 7.2, contribution: 7.2, impact: "Low", direction: "Negative" },
        { name: "Current Stress Profile", factor: "Current Stress Profile", percentage: 3.6, contribution: 3.6, impact: "Minimal", direction: "Neutral" }
      ];
    }

    // Normalize SHAP percentages to 100%
    const totalShap = xaiFactors.reduce((a, b) => a + b.percentage, 0);
    xaiFactors.forEach(f => f.percentage = Number((f.percentage / totalShap * 100).toFixed(1)));

    // 9. Recommendations
    let action = "Standard operation nominal. No thermal or balancing intervention required.";
    let urgency = "NORMAL";
    let rationale = "Cell spread is tightly coupled below 15 mV with standard LFP thermal dissipation.";

    if (this.activeScenario === "HIGH TEMPERATURE") {
      action = "Reduce high-current operation and allow the battery pack to cool before initiating another charge/discharge cycle.";
      urgency = "CRITICAL";
      rationale = "Elevated pack temperature accelerates irreversible solid-electrolyte interphase (SEI) growth.";
    } else if (this.activeScenario === "CELL IMBALANCE") {
      action = `Perform an extended constant-voltage equalization charge to balance Cell ${targetCellId}.`;
      urgency = "WARNING";
      rationale = "Cell voltage deviation exceeds 80 mV, limiting overall usable pack capacity.";
    } else if (this.activeScenario === "HIGH RESISTANCE") {
      action = "Derate maximum discharge peak power by 20% and schedule electrochemical impedance spectroscopy (EIS).";
      urgency = "WARNING";
      rationale = "Elevated internal resistance increases Joule losses and causes excessive terminal voltage sag under acceleration.";
    } else if (this.activeScenario === "OVERCURRENT") {
      action = "Derate traction inverter maximum current limit to protect cell tabs from excessive ampacity heating.";
      urgency = "CRITICAL";
      rationale = "Sustained discharge rate exceeds continuous C-rate design specification.";
    } else if (this.activeScenario === "UNDERVOLTAGE") {
      action = "Connect to charging infrastructure immediately to avoid deep-discharge cathode copper dissolution.";
      urgency = "CRITICAL";
      rationale = "Cell voltage reached lower critical discharge cutoff.";
    }

    const recState: RecommendationState = {
      action,
      primary: action,
      actions: [action, "Maintain optimal 20%–80% SOC window for maximum cycle life retention."],
      urgency,
      action_level: urgency,
      rationale
    };

    // 10. Alert Evaluation & Management
    this.evaluateAlerts(maxTemp, tempRise, maxImbalance, minVoltage, this.packCurrent, riskScore, targetCellId);

    const packTelemetry: PackTelemetry = {
      timestamp: now,
      voltage: packVoltage,
      pack_voltage: packVoltage,
      current: this.packCurrent,
      pack_current: this.packCurrent,
      c_rate: cRate,
      soc: this.soc,
      cycle: Math.round(this.cycle),
      ambient_temp: this.ambientTemp,
      mode: this.mode,
      avg_temp: avgTemp,
      avg_temperature: avgTemp,
      max_temp: maxTemp,
      max_temperature: maxTemp,
      min_temp: minTemp,
      min_temperature: minTemp,
      temp_rise: tempRise,
      max_imbalance: maxImbalance,
      voltage_sag: voltageSag,
      resistance_growth: resistanceGrowth,
      capacity_fade: capacityFade
    };

    return {
      timestamp: now,
      pack: packTelemetry,
      cells: cellTelemetryList,
      ai: aiState,
      risk: riskState,
      rca: rcaState,
      xai: {
        method: "TreeSHAP Attribution Decomposition",
        methodology: "TreeSHAP Attribution Decomposition",
        factors: xaiFactors
      },
      recommendation: recState,
      self_learning: {
        soh_r2: 0.984,
        soh_mae: 0.42,
        soh_rmse: 0.61,
        fault_accuracy: 0.976,
        fault_f1: 0.972,
        anomaly_accuracy: 0.981,
        total_clean_samples_used: 14820,
        model_version: "v2.4-online",
        last_retrain: new Date().toLocaleTimeString(),
        training_duration_sec: 2.4,
        learning_rate: 0.05,
        feature_importance: [
          { name: "Cycle Count", importance: 0.35 },
          { name: "Internal Resistance", importance: 0.28 },
          { name: "Temperature Max", importance: 0.22 },
          { name: "Voltage Sag", importance: 0.15 }
        ],
        convergence_history: [
          { epoch: 1, r2: 0.88, mae: 1.2, loss: 0.45 },
          { epoch: 2, r2: 0.93, mae: 0.8, loss: 0.25 },
          { epoch: 3, r2: 0.96, mae: 0.55, loss: 0.12 },
          { epoch: 4, r2: 0.984, mae: 0.42, loss: 0.06 }
        ]
      }
    };
  }

  private evaluateAlerts(
    tMax: number,
    tRise: number,
    vDiff: number,
    vMin: number,
    current: number,
    riskScore: number,
    targetCellId: number
  ) {
    const now = new Date().toLocaleTimeString();

    if (tMax >= 52.0) {
      if (!this.alerts.some(a => a.title.includes("CRITICAL THERMAL") && a.status === "ACTIVE")) {
        this.alerts.unshift({
          id: this.alertCounter++,
          timestamp: now,
          battery_id: this.batteryId,
          cell_id: targetCellId,
          level: "CRITICAL",
          title: "CRITICAL THERMAL RUNAWAY RISK",
          description: `Battery peak temperature reached ${tMax.toFixed(1)}°C (Threshold: 52.0°C).`,
          evidence: `Peak temp: ${tMax.toFixed(1)}°C, Temp rise: +${tRise.toFixed(1)}°C.`,
          recommended_action: "Halt battery load immediately and activate maximum cooling loop.",
          status: "ACTIVE"
        });
      }
    } else if (tMax >= 42.0) {
      if (!this.alerts.some(a => a.title.includes("ELEVATED TEMPERATURE") && a.status === "ACTIVE")) {
        this.alerts.unshift({
          id: this.alertCounter++,
          timestamp: now,
          battery_id: this.batteryId,
          cell_id: targetCellId,
          level: "WARNING",
          title: "ELEVATED TEMPERATURE DETECTED",
          description: `Battery temperature rising unusually fast to ${tMax.toFixed(1)}°C.`,
          evidence: `Rate of rise elevated, maximum cell temp: ${tMax.toFixed(1)}°C.`,
          recommended_action: "Reduce vehicle speed and heavy acceleration demand.",
          status: "ACTIVE"
        });
      }
    }

    if (vDiff >= 0.12) {
      if (!this.alerts.some(a => a.title.includes("SEVERE CELL IMBALANCE") && a.status === "ACTIVE")) {
        this.alerts.unshift({
          id: this.alertCounter++,
          timestamp: now,
          battery_id: this.batteryId,
          cell_id: targetCellId,
          level: "CRITICAL",
          title: "SEVERE CELL IMBALANCE DETECTED",
          description: `Cell ${targetCellId} voltage deviates by ${(vDiff * 1000).toFixed(0)} mV from pack average.`,
          evidence: `Deviation: ${vDiff.toFixed(3)} V (Max allowable: 0.120 V).`,
          recommended_action: "Reduce load and inspect Cell balance circuit.",
          status: "ACTIVE"
        });
      }
    }

    if (current > 75.0) {
      if (!this.alerts.some(a => a.title.includes("OVERCURRENT") && a.status === "ACTIVE")) {
        this.alerts.unshift({
          id: this.alertCounter++,
          timestamp: now,
          battery_id: this.batteryId,
          level: "CRITICAL",
          title: "OVERCURRENT DEMAND EXCEEDED",
          description: `Pack current demand surged to ${current.toFixed(1)} A.`,
          evidence: `Current: ${current.toFixed(1)} A (Continuous rating: 40.0 A).`,
          recommended_action: "Derate inverter peak demand.",
          status: "ACTIVE"
        });
      }
    }

    if (vMin < 2.80) {
      if (!this.alerts.some(a => a.title.includes("UNDERVOLTAGE") && a.status === "ACTIVE")) {
        this.alerts.unshift({
          id: this.alertCounter++,
          timestamp: now,
          battery_id: this.batteryId,
          cell_id: targetCellId,
          level: "CRITICAL",
          title: "UNDERVOLTAGE DEPLETION DETECTED",
          description: `Cell ${targetCellId} terminal voltage dropped to ${vMin.toFixed(3)} V.`,
          evidence: `Terminal voltage below 2.800 V electrochemical cutoff.`,
          recommended_action: "Connect to charger immediately.",
          status: "ACTIVE"
        });
      }
    }
  }

  public getAlerts(): AlertItem[] {
    return [...this.alerts];
  }

  public resolveAlert(id: number) {
    this.alerts = this.alerts.map(a => a.id === id ? { ...a, status: "RESOLVED" } : a);
  }
}

export const clientSimulator = new ClientBatterySimulator();
