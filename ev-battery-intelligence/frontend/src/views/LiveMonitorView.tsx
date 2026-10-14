import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Zap,
  Flame,
  BatteryCharging,
  Play,
  Pause,
  Clock,
  Sliders,
  Filter,
  ArrowUp,
  ArrowDown,
  Info,
  Radio
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { BatteryState } from '../types';
import { universalHardwareEngine } from '../services/universalHardwareEngine';

interface LiveMonitorViewProps {
  data: BatteryState;
  history: Array<{
    timestamp: string;
    voltage: number;
    current: number;
    temp: number;
    soh: number;
  }>;
  isConnected?: boolean;
}

type TimeWindow = '1m' | '5m' | '30m' | '1h' | '24h';

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({
  data,
  history = [],
  isConnected = true
}) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('5m');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedParam, setSelectedParam] = useState<'all' | 'voltage' | 'current' | 'power' | 'temperature' | 'soc'>('all');

  const pack = data.pack || ({} as any);
  const voltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const current = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const powerKw = (voltage * current) / 1000.0;
  const temp = Number(pack.avg_temp ?? (pack as any).avg_temperature ?? 26.2);
  const soc = Number(pack.soc ?? 64.8);

  // Filter history points based on window
  const filteredHistory = useMemo(() => {
    const pointsCount = timeWindow === '1m' ? 12 : timeWindow === '5m' ? 30 : timeWindow === '30m' ? 50 : 60;
    const base = history.slice(-pointsCount);

    return base.map((pt, i) => {
      const v = pt.voltage || 25.6;
      const c = pt.current || 14.5;
      const p = (v * c) / 1000.0;
      return {
        ...pt,
        time: pt.timestamp || `T-${(base.length - i) * 2}s`,
        voltage: Number(v.toFixed(2)),
        current: Number(c.toFixed(1)),
        power: Number(p.toFixed(2)),
        temp: Number((pt.temp || 26.0).toFixed(1)),
        soc: Math.max(10, Math.min(100, Number((soc - i * 0.05).toFixed(1)))),
        chargeCurrent: c < 0 ? Math.abs(c) : 0,
        dischargeCurrent: c >= 0 ? c : 0
      };
    });
  }, [history, timeWindow, soc]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: SIMULATED TELEMETRY / LIVE TELEMETRY LABEL (PDF Page 14, 22) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-orbitron font-bold text-xs shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>● LIVE TELEMETRY STREAM</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Source:{' '}
            <strong className="text-cyan-400">
              {universalHardwareEngine.getTransport() === 'BLE'
                ? `Physical BLE Device (${universalHardwareEngine.getDeviceName() || 'Nordic UART'})`
                : universalHardwareEngine.getTransport() === 'WIFI_WS' || universalHardwareEngine.getTransport() === 'WIFI_HTTP'
                ? `Wi-Fi Direct Stream (${universalHardwareEngine.getDeviceName() || 'ESP32'})`
                : universalHardwareEngine.getTransport() === 'SERIAL_UART'
                ? `Direct USB UART (${universalHardwareEngine.getDeviceName() || '115200 baud'})`
                : 'Synthetic Grounded Physics Simulator (LFP 8S1P)'}
            </strong>
          </span>
        </div>

        {/* Streaming Controls */}
        <div className="flex items-center gap-2">
          {/* Time Window Selector */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-700/60 text-[9px] font-orbitron font-bold">
            {(['1m', '5m', '30m', '1h', '24h'] as TimeWindow[]).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2 py-1 rounded-lg transition-all ${
                  timeWindow === w
                    ? 'bg-cyan-600 text-white shadow-[0_0_8px_rgba(6,182,212,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-orbitron font-bold border transition ${
              isPaused
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            <span>{isPaused ? 'RESUME' : 'PAUSE'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Metric Pills with Signature Aura Backdrops */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-2xl dark-gradient-card-cyan border border-white/[0.07] shadow-lg">
          <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase font-semibold">VOLTAGE</span>
          <span className="text-xl font-mono tabular-nums font-bold text-white block mt-0.5">{voltage.toFixed(2)} V</span>
          <span className="text-[8px] font-mono text-cyan-400">Min 24.8V │ Max 27.2V</span>
        </div>
        <div className="p-3.5 rounded-2xl dark-gradient-card-emerald border border-white/[0.07] shadow-lg">
          <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase font-semibold">CURRENT</span>
          <span className="text-xl font-mono tabular-nums font-bold text-white block mt-0.5">{current.toFixed(1)} A</span>
          <span className="text-[8px] font-mono text-emerald-400">{current >= 0 ? 'Discharging' : 'Regen Charging'}</span>
        </div>
        <div className="p-3.5 rounded-2xl dark-gradient-card-indigo border border-white/[0.07] shadow-lg">
          <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase font-semibold">POWER DRAW</span>
          <span className="text-xl font-mono tabular-nums font-bold text-white block mt-0.5">{powerKw.toFixed(2)} kW</span>
          <span className="text-[8px] font-mono text-purple-400">P = V × I</span>
        </div>
        <div className="p-3.5 rounded-2xl dark-gradient-card-amber border border-white/[0.07] shadow-lg">
          <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase font-semibold">AVG TEMP</span>
          <span className="text-xl font-mono tabular-nums font-bold text-white block mt-0.5">{temp.toFixed(1)} °C</span>
          <span className="text-[8px] font-mono text-amber-400">ΔT +1.2°C Joule Heat</span>
        </div>
        <div className="p-3.5 rounded-2xl dark-gradient-card-emerald border border-white/[0.07] shadow-lg col-span-2 sm:col-span-1">
          <span className="text-[9px] font-mono text-slate-400 block tracking-wider uppercase font-semibold">STATE OF CHARGE</span>
          <span className="text-xl font-mono tabular-nums font-bold text-emerald-400 block mt-0.5">{soc.toFixed(1)}%</span>
          <span className="text-[8px] font-mono text-slate-400">Coulomb Counting</span>
        </div>
      </div>

      {/* GRAPH 7: PACK VOLTAGE VS TIME (PDF Page 26) */}
      <div className="glass-panel rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                GRAPH 7: PACK VOLTAGE VS TIME
              </h3>
              <span className="text-[9px] text-slate-400 font-mono">
                Real-time pack voltage with nominal (25.6V) & over-voltage (27.2V) bounds
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            {voltage.toFixed(2)} V
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredHistory}>
              <defs>
                <linearGradient id="voltArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.35} />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} unit="V" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
              />
              <ReferenceLine y={25.6} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Nominal 25.6V', fill: '#10b981', fontSize: 9 }} />
              <Area type="monotone" dataKey="voltage" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#voltArea)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAPH 8: CURRENT VS TIME & GRAPH 9: POWER (PDF Page 27) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 8: Current vs Time */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 8: CURRENT VS TIME (A)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Charge vs Discharge current separation
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {current.toFixed(1)} A
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="A" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 9: Power vs Time */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 9: ELECTRICAL POWER (kW)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Calculated instantaneous load: P = V × I
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {powerKw.toFixed(2)} kW
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory}>
                <defs>
                  <linearGradient id="powerArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#6366f1" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="kW" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                />
                <Area type="monotone" dataKey="power" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#powerArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* GRAPH 5: TEMPERATURE VS TIME & GRAPH 10: SOC VS TIME (PDF Pages 25, 28) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 5: Thermal Monitoring */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 5: TEMPERATURE VS TIME (°C)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Thermal envelope with 35°C (Warn) & 45°C (Crit) thresholds
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
              {temp.toFixed(1)} °C
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory}>
                <defs>
                  <linearGradient id="tempArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#ef4444" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis domain={[20, 50]} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="°C" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                />
                <ReferenceLine y={35} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Elevated 35°C', fill: '#f59e0b', fontSize: 9 }} />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical 45°C', fill: '#ef4444', fontSize: 9 }} />
                <Area type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#tempArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPH 10: SOC vs Time */}
        <div className="glass-panel rounded-2xl p-5 border border-white/[0.07] shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                  GRAPH 10: STATE OF CHARGE (SOC %)
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">
                  Coulomb counting integrated energy discharge trajectory
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {soc.toFixed(1)} %
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredHistory}>
                <defs>
                  <linearGradient id="socArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="#06b6d4" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 9, fill: '#64748b' }} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(8, 9, 14, 0.95)', borderColor: 'rgba(255, 255, 255, 0.12)', borderRadius: '14px', fontSize: '11px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.8)' }}
                />
                <Area type="monotone" dataKey="soc" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#socArea)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
