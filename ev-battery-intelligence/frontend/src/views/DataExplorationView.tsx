import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Flame,
  Zap,
  Activity,
  TrendingDown,
  Layers,
  Info,
  Sliders,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';

import { BatteryState } from '../types';

interface DataExplorationViewProps {
  data?: BatteryState;
}

const VARIABLES = [
  'Temperature', 'Voltage', 'Current', 'SOC', 'SOH', 'Capacity', 'Cycle Count', 'Resistance', 'Power'
] as const;

type VariableName = typeof VARIABLES[number];

interface TelemetryPoint {
  Temperature: number;
  Voltage: number;
  Current: number;
  SOC: number;
  SOH: number;
  Capacity: number;
  CycleCount: number;
  Resistance: number;
  Power: number;
  timestamp: number;
}

/**
 * Compute true mathematical Pearson correlation coefficient between two series
 */
function computePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2 || y.length !== n) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let sumSqDiffX = 0;
  let sumSqDiffY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumSqDiffX += diffX * diffX;
    sumSqDiffY += diffY * diffY;
  }

  const denominator = Math.sqrt(sumSqDiffX * sumSqDiffY);
  if (denominator === 0 || !isFinite(denominator)) return 0;

  const r = numerator / denominator;
  return Math.max(-1.0, Math.min(1.0, r));
}

/**
 * Generate scenario-specific physical seed trajectory (50 points)
 * Governed by LFP electrochemistry, Arrhenius kinetics, and Joule heating
 */
function generateScenarioSeedBuffer(scenario: string, currentSoh: number = 87.4, currentSoc: number = 64.8): TelemetryPoint[] {
  const sc = scenario.toUpperCase();
  const buffer: TelemetryPoint[] = [];
  const count = 50;
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const progress = i / count; // 0.0 -> 1.0
    const timeDelta = (count - i) * 1000;
    const t = now - timeDelta;

    let temp = 25.0;
    let voltage = 25.6;
    let current = 14.5;
    let soc = currentSoc;
    let soh = currentSoh;
    let cycle = 624 + (i * 0.002);
    let resistance = 32.0;

    if (sc.includes("THERMAL") || sc.includes("HIGH TEMP")) {
      // Thermal runaway / high temp trajectory: Temperature surges from 30°C to 58°C,
      // Joule heating coupled with power, accelerating resistance growth & SOH degradation
      temp = 28.0 + progress * 29.5 + Math.sin(i * 0.4) * 0.4;
      current = 28.0 + Math.sin(i * 0.2) * 4.0;
      resistance = 33.0 + progress * 14.2 + (temp - 25.0) * 0.15;
      soh = Math.max(72.0, currentSoh - progress * 4.8);
      soc = Math.max(15.0, currentSoc - progress * 12.0);
      voltage = 25.4 - (current * (resistance * 8 / 1000.0)) - (1.0 - progress) * 0.2;
    } else if (sc.includes("IMBALANCE")) {
      // Cell imbalance: Voltage spread widens, decoupling normal V-SOC relationship
      soc = Math.max(10.0, currentSoc - progress * 8.0);
      current = 16.0 + Math.sin(i * 0.3) * 2.0;
      temp = 26.0 + progress * 2.5;
      resistance = 32.5 + (i % 3 === 0 ? 4.5 : 0.8) + progress * 2.0;
      soh = Math.max(78.0, currentSoh - progress * 1.5);
      voltage = 25.2 - progress * 0.6 - (i % 2 === 0 ? 0.25 : -0.15);
    } else if (sc.includes("RESISTANCE")) {
      // High internal resistance: High IR drop, severe anti-correlation with SOH
      resistance = 38.0 + progress * 12.5 + Math.sin(i * 0.5) * 0.8;
      current = 22.0 + Math.sin(i * 0.3) * 3.0;
      temp = 27.0 + progress * 6.5;
      soh = Math.max(70.0, currentSoh - progress * 3.5);
      soc = Math.max(20.0, currentSoc - progress * 10.0);
      voltage = 25.6 - (current * (resistance * 8 / 1000.0));
    } else if (sc.includes("OVERCURRENT") || sc.includes("C-RATE")) {
      // Heavy high-load pulse: Current 70-95A, tight power lock, large voltage sag & thermal rise
      current = 75.0 + Math.sin(i * 0.5) * 16.0;
      temp = 26.5 + progress * 11.5;
      resistance = 32.5 + progress * 2.8;
      soh = Math.max(79.0, currentSoh - progress * 1.8);
      soc = Math.max(15.0, currentSoc - progress * 18.0);
      voltage = 25.4 - (current * 0.024) - progress * 0.4;
    } else if (sc.includes("UNDERVOLTAGE") || sc.includes("DEEP DISCHARGE")) {
      // Deep discharge knee: Steep V-SOC slope, capacity depletion
      soc = Math.max(2.0, 18.0 - progress * 15.5);
      current = 15.0 + Math.sin(i * 0.2) * 2.0;
      temp = 25.8 + progress * 1.2;
      resistance = 34.0 + progress * 4.2;
      soh = Math.max(75.0, currentSoh - progress * 1.2);
      voltage = 24.2 - Math.pow((1.0 - soc / 20.0), 2) * 2.6;
    } else if (sc.includes("FAST CHARGING") || sc.includes("CHARGING")) {
      // Fast charging: Negative current (-45A to -55A), rising voltage & SOC
      current = -48.0 - Math.sin(i * 0.3) * 6.0;
      soc = Math.min(95.0, currentSoc + progress * 16.0);
      temp = 26.0 + progress * 8.5;
      resistance = 33.0 + progress * 1.8;
      soh = currentSoh;
      voltage = 25.8 + progress * 1.4 - (current * 0.015);
    } else if (sc.includes("CAPACITY DEGRADATION")) {
      // Capacity fade: SOH and capacity degradation lock
      soh = Math.max(68.0, currentSoh - progress * 8.0);
      soc = Math.max(15.0, currentSoc - progress * 9.0);
      current = 14.5 + Math.sin(i * 0.2) * 1.5;
      temp = 26.0 + progress * 3.0;
      resistance = 34.0 + progress * 6.5;
      cycle = 750 + progress * 80;
      voltage = 25.5 - progress * 0.5;
    } else {
      // Nominal baseline: Standard operating discharge
      current = 14.5 + Math.sin(i * 0.2) * 1.2;
      soc = Math.max(20.0, currentSoc - progress * 3.5);
      temp = 25.5 + Math.sin(i * 0.15) * 1.2;
      resistance = 32.0 + (100.0 - currentSoh) * 0.1 + Math.sin(i * 0.3) * 0.3;
      soh = currentSoh - progress * 0.1;
      voltage = 25.7 - progress * 0.2 - (current * 0.01);
    }

    const capacity = 40.0 * (soh / 100.0);
    const power = (voltage * current) / 1000.0;

    buffer.push({
      Temperature: Number(temp.toFixed(2)),
      Voltage: Number(voltage.toFixed(3)),
      Current: Number(current.toFixed(2)),
      SOC: Number(soc.toFixed(2)),
      SOH: Number(soh.toFixed(2)),
      Capacity: Number(capacity.toFixed(2)),
      CycleCount: Number(cycle.toFixed(1)),
      Resistance: Number(resistance.toFixed(2)),
      Power: Number(power.toFixed(3)),
      timestamp: t
    });
  }

  return buffer;
}

export const DataExplorationView: React.FC<DataExplorationViewProps> = ({ data }) => {
  const [hoveredCell, setHoveredCell] = useState<{ r: string; c: string; val: number; desc: string } | null>(null);
  
  const pack = data?.pack || ({} as any);
  const ai = data?.ai || ({} as any);
  const currentTemp = Number(pack.avg_temp ?? 26.2);
  const currentSoh = Number(ai.soh ?? 87.4);
  const currentSoc = Number(pack.soc ?? 64.8);
  const currentVoltage = Number(pack.voltage ?? 25.6);
  const currentPackCurrent = Number(pack.current ?? 14.5);
  const currentCycle = Number(pack.cycle ?? 624);
  const currentResistance = Number(pack.resistance_growth ?? 3.2) + 32.0;
  const currentCapacity = 40.0 * (currentSoh / 100.0);
  const currentPower = (currentVoltage * currentPackCurrent) / 1000.0;
  const activeFault = (ai.fault_class || 'NORMAL').toUpperCase();

  // Active rolling telemetry buffer (max 100 frames)
  const [historyBuffer, setHistoryBuffer] = useState<TelemetryPoint[]>(() => 
    generateScenarioSeedBuffer(activeFault, currentSoh, currentSoc)
  );

  const prevScenarioRef = useRef<string>(activeFault);

  // When scenario switches, reseed the physics trajectory
  useEffect(() => {
    if (activeFault !== prevScenarioRef.current) {
      prevScenarioRef.current = activeFault;
      setHistoryBuffer(generateScenarioSeedBuffer(activeFault, currentSoh, currentSoc));
    }
  }, [activeFault, currentSoh, currentSoc]);

  // Continuously ingest every live 1Hz telemetry frame from the simulator into the sliding buffer
  useEffect(() => {
    if (!data?.pack) return;

    const newPoint: TelemetryPoint = {
      Temperature: currentTemp,
      Voltage: currentVoltage,
      Current: currentPackCurrent,
      SOC: currentSoc,
      SOH: currentSoh,
      Capacity: Number(currentCapacity.toFixed(2)),
      CycleCount: Number(currentCycle.toFixed(1)),
      Resistance: Number(currentResistance.toFixed(2)),
      Power: Number(currentPower.toFixed(3)),
      timestamp: Date.now()
    };

    setHistoryBuffer(prev => {
      const next = [...prev, newPoint];
      if (next.length > 80) {
        return next.slice(next.length - 80);
      }
      return next;
    });
  }, [
    currentTemp,
    currentVoltage,
    currentPackCurrent,
    currentSoc,
    currentSoh,
    currentCapacity,
    currentCycle,
    currentResistance,
    currentPower
  ]);

  // Compute live 9x9 Pearson correlation matrix dynamically from the rolling simulation dataset
  const dynamicCorrelation = useMemo(() => {
    const n = historyBuffer.length;
    if (n < 5) {
      // Fallback identity
      const emptyMatrix = VARIABLES.map((_, rIdx) =>
        VARIABLES.map((_, cIdx) => (rIdx === cIdx ? 1.0 : 0.0))
      );
      return {
        matrix: emptyMatrix,
        sampleCount: n,
        modeName: "INITIALIZING BUFFER",
        description: "Accumulating live physics simulation time series..."
      };
    }

    // Extract series for each variable
    const seriesMap: Record<VariableName, number[]> = {
      Temperature: historyBuffer.map(p => p.Temperature),
      Voltage: historyBuffer.map(p => p.Voltage),
      Current: historyBuffer.map(p => p.Current),
      SOC: historyBuffer.map(p => p.SOC),
      SOH: historyBuffer.map(p => p.SOH),
      Capacity: historyBuffer.map(p => p.Capacity),
      'Cycle Count': historyBuffer.map(p => p.CycleCount),
      Resistance: historyBuffer.map(p => p.Resistance),
      Power: historyBuffer.map(p => p.Power)
    };

    // Calculate full 9x9 Pearson correlation matrix
    const matrix: number[][] = [];
    for (let r = 0; r < VARIABLES.length; r++) {
      const row: number[] = [];
      const varR = VARIABLES[r];
      const seriesR = seriesMap[varR];

      for (let c = 0; c < VARIABLES.length; c++) {
        if (r === c) {
          row.push(1.0);
        } else if (c < r) {
          // Symmetric matrix property: r(X, Y) = r(Y, X)
          row.push(matrix[c][r]);
        } else {
          const varC = VARIABLES[c];
          const seriesC = seriesMap[varC];
          const rVal = computePearsonCorrelation(seriesR, seriesC);
          row.push(Number(rVal.toFixed(2)));
        }
      }
      matrix.push(row);
    }

    let modeName = "NOMINAL BASELINE";
    let description = "Nominal Electrochemical Baseline: Standard LFP Arrhenius Aging & Coulombic Coupling";

    if (activeFault.includes("THERMAL") || activeFault.includes("HIGH TEMP")) {
      modeName = "THERMAL COVARIANCE REGIME";
      description = `Thermal Stress Surge: r(Temp, Resistance)=+${(matrix[0][7] || 0.9).toFixed(2)}, r(Temp, SOH)=${(matrix[0][4] || -0.85).toFixed(2)}`;
    } else if (activeFault.includes("IMBALANCE")) {
      modeName = "CELL IMBALANCE REGIME";
      description = `Asymmetric Voltage Dispersion: r(Voltage, SOC)=+${(matrix[1][3] || 0.55).toFixed(2)}, weak cell resistance disparity`;
    } else if (activeFault.includes("RESISTANCE")) {
      modeName = "OHMIC POLARIZATION REGIME";
      description = `Internal Resistance Surge: r(Resistance, SOH)=${(matrix[7][4] || -0.92).toFixed(2)}, strong IR drop`;
    } else if (activeFault.includes("OVERCURRENT") || activeFault.includes("C-RATE")) {
      modeName = "HIGH LOAD DYNAMICS";
      description = `High C-Rate Saturation: r(Current, Power)=+${(matrix[2][8] || 0.98).toFixed(2)}, instantaneous load sag`;
    } else if (activeFault.includes("UNDERVOLTAGE") || activeFault.includes("DEEP DISCHARGE")) {
      modeName = "DEEP DISCHARGE KNEE";
      description = `Non-linear LFP Knee Transition: r(Voltage, SOC)=+${(matrix[1][3] || 0.94).toFixed(2)}`;
    } else if (activeFault.includes("FAST CHARGING") || activeFault.includes("CHARGING")) {
      modeName = "FAST CHARGE RECOVERY";
      description = `High Inflow Kinetic Coupling: r(Current, Voltage)=${(matrix[2][1] || 0.78).toFixed(2)}`;
    } else if (activeFault.includes("CAPACITY DEGRADATION")) {
      modeName = "ACTIVE MATERIAL LOSS";
      description = `SEI Passivation Fade: r(SOH, Capacity)=+${(matrix[4][5] || 0.99).toFixed(2)}`;
    }

    return {
      matrix,
      sampleCount: n,
      modeName,
      description
    };
  }, [historyBuffer, activeFault]);

  const matrix = dynamicCorrelation.matrix;

  // Helper color function for correlation cell
  const getHeatmapColor = (val: number) => {
    if (val === 1) return 'bg-cyan-500 text-slate-950 font-bold';
    if (val > 0.6) return 'bg-cyan-600/80 text-white';
    if (val > 0.3) return 'bg-cyan-700/50 text-cyan-200';
    if (val > 0) return 'bg-slate-800 text-slate-300';
    if (val > -0.3) return 'bg-slate-850 text-slate-400';
    if (val > -0.6) return 'bg-rose-900/40 text-rose-300';
    return 'bg-rose-700/80 text-white font-semibold';
  };

  // Descriptive explanation generator on hover
  const getRelationshipDescription = (rVar: string, cVar: string, val: number) => {
    if (rVar === cVar) return `Identity correlation: ${rVar} is 100% self-correlated (r = 1.00).`;
    const strength = Math.abs(val) > 0.7 ? "Strong" : Math.abs(val) > 0.35 ? "Moderate" : "Weak / Low";
    const direction = val > 0 ? "positive coupling" : val < 0 ? "negative anti-correlation" : "orthogonal independence";
    return `${strength} ${direction} (r = ${val > 0 ? '+' : ''}${val.toFixed(2)}) between ${rVar} and ${cVar} in active simulation state.`;
  };

  // Live Temperature vs SOH Scatter Data (Graph 6) from simulation buffer
  const tempVsSohData = useMemo(() => {
    return historyBuffer.map((p, idx) => ({
      index: idx + 1,
      temp: p.Temperature,
      soh: p.SOH
    })).sort((a, b) => a.temp - b.temp);
  }, [historyBuffer]);

  // Live SOC vs SOH Scatter Data (Graph 11) from simulation buffer
  const socVsSohData = useMemo(() => {
    return historyBuffer.map((p, idx) => ({
      index: idx + 1,
      soc: p.SOC,
      soh: p.SOH
    })).sort((a, b) => a.soc - b.soc);
  }, [historyBuffer]);

  // Current calculated live correlation badges
  const liveTempSohR = useMemo(() => {
    const tIdx = VARIABLES.indexOf('Temperature');
    const sIdx = VARIABLES.indexOf('SOH');
    return matrix[tIdx]?.[sIdx] ?? -0.58;
  }, [matrix]);

  const liveSocSohR = useMemo(() => {
    const socIdx = VARIABLES.indexOf('SOC');
    const sohIdx = VARIABLES.indexOf('SOH');
    return matrix[socIdx]?.[sohIdx] ?? 0.35;
  }, [matrix]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
                DATA EXPLORATION & CORRELATION MATRIX
              </h2>
              <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse">
                ● {dynamicCorrelation.modeName}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {dynamicCorrelation.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>BUFFER: </span>
            <strong className="text-white font-bold">{dynamicCorrelation.sampleCount} Live Frames</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>PEARSON COVARIANCE: </span>
            <strong className="text-emerald-400 font-bold">1 Hz Live Math</strong>
          </div>
        </div>
      </div>

      {/* GRAPH 33: INTERACTIVE CORRELATION HEATMAP MATRIX (PDF Page 39) */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-700/50 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
              GRAPH 33: 9×9 INTERACTIVE CORRELATION HEATMAP MATRIX
            </h3>
            <span className="text-[9px] text-slate-400 font-mono">
              Hover over any correlation tile to inspect live mathematical covariance
            </span>
          </div>

          {hoveredCell ? (
            <div className="px-3 py-1 rounded-xl bg-slate-900 border border-cyan-500/40 text-xs font-mono text-cyan-300 shadow-lg flex items-center gap-2">
              <span>r({hoveredCell.r}, {hoveredCell.c}) = <strong className="text-white">{hoveredCell.val >= 0 ? `+${hoveredCell.val.toFixed(2)}` : hoveredCell.val.toFixed(2)}</strong></span>
              <span className="text-[10px] text-slate-400">| {hoveredCell.desc}</span>
            </div>
          ) : (
            <div className="px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-[10px] font-mono text-slate-400">
              Hover over any cell for formula & physical meaning
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06] p-2 bg-[#07080e]/60">
          <table className="w-full text-center border-collapse font-mono tabular-nums text-[11px]">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="p-2 text-left text-slate-400 font-orbitron text-[9px]">VARIABLE</th>
                {VARIABLES.map((v: string) => (
                  <th key={v} className="p-2 text-slate-300 font-semibold text-[9px] truncate max-w-[80px]">
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {VARIABLES.map((rVar: string, rIdx: number) => (
                <tr key={rVar} className="hover:bg-white/[0.02]">
                  <td className="p-2 text-left font-bold text-slate-300 font-orbitron text-[9.5px] truncate max-w-[100px]">
                    {rVar}
                  </td>
                  {matrix[rIdx]?.map((val: number, cIdx: number) => {
                    const cVar = VARIABLES[cIdx];
                    const desc = getRelationshipDescription(rVar, cVar, val);
                    return (
                      <td
                        key={cIdx}
                        onMouseEnter={() => setHoveredCell({ r: rVar, c: cVar, val, desc })}
                        onMouseLeave={() => setHoveredCell(null)}
                        className="p-1 cursor-pointer transition-transform hover:scale-105"
                      >
                        <div
                          className={`w-full py-1.5 rounded-lg font-mono tabular-nums text-[10px] transition-colors shadow-sm ${getHeatmapColor(
                            val
                          )}`}
                        >
                          {val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Heatmap Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[9px] font-mono text-slate-400 mt-4 pt-3 border-t border-white/[0.07] gap-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-700 inline-block" /> Strong Negative (-1.0)
            <span className="w-3 h-3 rounded bg-slate-800 inline-block ml-2" /> Neutral (0.0)
            <span className="w-3 h-3 rounded bg-cyan-500 inline-block ml-2" /> Strong Positive (+1.0)
          </div>
          <span className="text-cyan-300/80">
            r = Σ(X - μX)(Y - μY) / [√(Σ(X - μX)²) · √(Σ(Y - μY)²)] (Dynamic 1Hz Live Physics Stream)
          </span>
        </div>
      </div>

      {/* GRAPH 6: TEMP VS SOH & GRAPH 11: SOC VS SOH (PDF Pages 26, 28) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 6: Temperature vs SOH */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 6: TEMPERATURE VS SOH (LIVE TRAJECTORY)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Thermal-acceleration degradation trajectory from live buffer
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Live r = {liveTempSohR >= 0 ? `+${liveTempSohR.toFixed(2)}` : liveTempSohR.toFixed(2)}
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="temp" name="Temperature (°C)" domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="°C" />
                <YAxis dataKey="soh" name="SOH (%)" domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Scatter name="Live Observations" data={tempVsSohData} fill="#f59e0b" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 11: SOC vs SOH */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 11: SOC VS SOH (LIVE TRAJECTORY)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  State of Charge vs True Capacity Retention
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              Live r = {liveSocSohR >= 0 ? `+${liveSocSohR.toFixed(2)}` : liveSocSohR.toFixed(2)}
            </span>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="soc" name="SOC (%)" domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="%" />
                <YAxis dataKey="soh" name="SOH (%)" domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Scatter name="Live Observations" data={socVsSohData} fill="#06b6d4" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
