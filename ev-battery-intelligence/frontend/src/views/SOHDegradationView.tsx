import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingDown,
  Clock,
  Zap,
  Activity,
  Calendar,
  Layers,
  Info,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  AreaChart,
  Area
} from 'recharts';
import { BatteryState } from '../types';

interface SOHDegradationViewProps {
  data: BatteryState;
}

export const SOHDegradationView: React.FC<SOHDegradationViewProps> = ({ data }) => {
  const [timeUnit, setTimeUnit] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [degradationData, setDegradationData] = useState<any>(null);

  const pack = data.pack || ({} as any);
  const ai = data.ai || ({} as any);
  const currentSoh = Number(ai.soh ?? 87.4);
  const currentCycle = Number(pack.cycle ?? 624);
  const capacityFade = Number(pack.capacity_fade ?? 12.6);
  const resistanceGrowth = Number(pack.resistance_growth ?? 3.2);

  // Fetch degradation curve data from backend
  useEffect(() => {
    fetch('/api/analytics/degradation')
      .then((res) => res.json())
      .then((json) => {
        if (json) setDegradationData(json);
      })
      .catch(() => {});
  }, []);

  // Dynamic Calendar SOH data points
  const calendarData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    const totalLoss = 100.0 - currentSoh;
    return months.map((m, idx) => {
      const frac = (idx + 1) / months.length;
      const s = Number((100.0 - (totalLoss * frac)).toFixed(1));
      return {
        time: m,
        soh: s,
        capacity: Number((40.0 * s / 100).toFixed(1)),
        rate: `${(0.02 * (1 + frac * 0.1)).toFixed(3)}%`
      };
    });
  }, [currentSoh]);

  // Dynamic Multi-Physics Cycle Trajectory
  const cycleTrajectory = React.useMemo(() => {
    if (degradationData?.cycle_trajectory) return degradationData.cycle_trajectory;
    const points = [];
    const degRate = (100.0 - currentSoh) / Math.max(1, currentCycle);
    for (let c = 0; c <= 1600; c += 150) {
      const isPast = c <= currentCycle;
      const predSoh = Math.max(50.0, 100.0 - (c * degRate));
      const uncert = isPast ? 0.3 : Math.min(5.5, 0.4 + (c - currentCycle) * 0.005);
      points.push({
        cycle: c,
        actual_soh: isPast ? Number((100.0 - (c * degRate)).toFixed(1)) : null,
        predicted_soh: Number(predSoh.toFixed(1)),
        upper_bound: Number((predSoh + uncert).toFixed(1)),
        lower_bound: Number((predSoh - uncert).toFixed(1)),
        is_future: !isPast
      });
    }
    return points;
  }, [degradationData, currentSoh, currentCycle]);

  const socCurves = degradationData?.soc_curves || [
    { soc: 0, charge_voltage: 2.80, discharge_voltage: 2.70 },
    { soc: 20, charge_voltage: 3.20, discharge_voltage: 3.15 },
    { soc: 40, charge_voltage: 3.26, discharge_voltage: 3.22 },
    { soc: 60, charge_voltage: 3.29, discharge_voltage: 3.26 },
    { soc: 80, charge_voltage: 3.34, discharge_voltage: 3.30 },
    { soc: 100, charge_voltage: 3.65, discharge_voltage: 3.48 }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-[#07080e]/92 border border-white/[0.07] shadow-xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-gradient-display">
              SOH ESTIMATION & DEGRADATION ANALYSIS
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              Degradation Rate: <strong className="text-cyan-400">0.0202% / cycle</strong> │ Baseline Capacity: <strong className="text-white">40.0 Ah</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
          <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <span>CURRENT SOH: </span>
            <strong className="text-emerald-400 font-bold">{currentSoh.toFixed(1)}%</strong>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
            <span>CAPACITY LOSS: </span>
            <strong className="text-rose-400 font-bold">{capacityFade.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* GRAPH 1: SOH (%) VS CYCLE NUMBER (PDF Page 22) */}
      <div className="dark-gradient-card-emerald rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                GRAPH 1: SOH (%) VS CYCLE NUMBER (LIFETIME TRAJECTORY)
              </h3>
              <span className="text-[9px] text-slate-400 font-mono">
                Actual Measured SOH (solid) vs ML Forecast (dashed) with ±2σ uncertainty envelope
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Current Cycle: {currentCycle}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
              EOL Threshold: 70.0%
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cycleTrajectory}>
              <defs>
                <linearGradient id="sohUncertainty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="cycle" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit=" cyc" />
              <YAxis domain={[60, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'End-of-Life (70%)', fill: '#ef4444', fontSize: 10 }} />
              <ReferenceLine x={currentCycle} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Current (${currentCycle})`, fill: '#10b981', fontSize: 10 }} />
              <Area type="monotone" dataKey="upper_bound" stroke="none" fillOpacity={1} fill="url(#sohUncertainty)" name="Upper Confidence (95%)" />
              <Area type="monotone" dataKey="lower_bound" stroke="none" fill="#050508" name="Lower Confidence (95%)" />
              <Line type="monotone" dataKey="actual_soh" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} name="Actual Measured SOH" connectNulls={false} />
              <Line type="monotone" dataKey="predicted_soh" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="5 5" dot={false} name="ML Predicted SOH" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPH 2: SOH VS CALENDAR TIME & GRAPH 12: CAPACITY FADE (PDF Pages 23, 29) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 2: SOH vs Calendar Time */}
        <div className="dark-gradient-card-cyan rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 2: SOH VS CALENDAR TIME
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Calendar aging degradation rate
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[8px] font-orbitron">
              {(['day', 'week', 'month', 'year'] as const).map((u) => (
                <button
                  key={u}
                  onClick={() => setTimeUnit(u)}
                  className={`px-1.5 py-0.5 rounded ${timeUnit === u ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                >
                  {u.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={calendarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[80, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="soh" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} name="SOH (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 12: Cycle Aging & Capacity Fade */}
        <div className="dark-gradient-card-rose rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 12: CAPACITY FADE (Ah & %)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Initial 40.0 Ah (100%) → Current {(40.0 * currentSoh / 100).toFixed(1)} Ah ({currentSoh.toFixed(1)}%)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
              Loss: {capacityFade.toFixed(1)}%
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calendarData}>
                <defs>
                  <linearGradient id="capArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#f43f5e" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis domain={[30, 42]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="Ah" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                />
                <Area type="monotone" dataKey="capacity" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#capArea)" name="Capacity (Ah)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRAPH 13: INTERNAL RESISTANCE GROWTH & GRAPH 14: V-SOC CURVES (PDF Pages 29, 30) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 13: Resistance Growth */}
        <div className="dark-gradient-card-indigo rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 13: INTERNAL RESISTANCE GROWTH
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Initial nominal 32.0 mΩ → Current {(32.0 * (1 + resistanceGrowth / 100)).toFixed(1)} mΩ
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              +{resistanceGrowth.toFixed(1)}% SEI Growth
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[
                { cycle: 0, res: 32.0 },
                { cycle: 150, res: 33.8 },
                { cycle: 300, res: 35.6 },
                { cycle: 450, res: 37.9 },
                { cycle: 600, res: 40.8 },
                { cycle: 750, res: 44.2 },
                { cycle: 900, res: 48.0 },
                { cycle: 1050, res: 52.5 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="cycle" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit=" cyc" />
                <YAxis domain={[30, 60]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="mΩ" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Warn: 50mΩ', fill: '#ef4444', fontSize: 9 }} />
                <Line type="monotone" dataKey="res" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3 }} name="AC-IR (mΩ)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-[9px] font-mono text-slate-500 leading-tight">
            * Note: Increasing internal resistance is primarily associated with solid electrolyte interphase (SEI) growth and contact resistance, while not being the sole cause of capacity fade.
          </div>
        </div>

        {/* GRAPH 14: Charge / Discharge Voltage vs SOC Curve */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 14: CHARGE / DISCHARGE CURVES
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  LFP Plateau (3.20V - 3.34V) Open-Circuit Profile
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              3.2V Nominal LFP
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={socCurves}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="soc" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <YAxis domain={[2.6, 3.8]} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="V" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0b1329', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Line type="monotone" dataKey="charge_voltage" stroke="#06b6d4" strokeWidth={2.5} dot={false} name="Charge Voltage (V)" />
                <Line type="monotone" dataKey="discharge_voltage" stroke="#10b981" strokeWidth={2.5} dot={false} name="Discharge Voltage (V)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
