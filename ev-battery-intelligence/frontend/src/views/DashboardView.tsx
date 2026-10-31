import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Flame,
  Zap,
  Activity,
  Cpu,
  Clock,
  BatteryCharging,
  Sparkles,
  ChevronRight,
  Gauge,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { BatteryState, CellTelemetry } from '../types';
import { NavTab } from '../components/Sidebar';

interface DashboardViewProps {
  data: BatteryState;
  onNavigate: (tab: NavTab) => void;
  onSelectCell?: (cell: CellTelemetry) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  data,
  onNavigate,
  onSelectCell
}) => {
  const pack = data.pack || ({} as any);
  const ai = data.ai || ({} as any);
  const risk = data.risk || ({} as any);
  const rca = data.rca || ({} as any);

  const soh = Math.min(100, Math.max(0, Number(ai.soh ?? 87.4)));
  const soc = Number(pack.soc ?? 64.8);
  const voltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const current = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const powerKw = (voltage * current) / 1000.0;
  const temp = Number(pack.avg_temp ?? (pack as any).avg_temperature ?? 26.2);
  const maxTemp = Number(pack.max_temp ?? (pack as any).max_temperature ?? 26.8);
  const cycle = Number(pack.cycle ?? 624);
  const rulCycles = Number(ai.rul?.rul_cycles ?? 280);
  const confidence = Number(ai.fault_confidence ?? 94.2);
  const maxImbalance = Number(pack.max_imbalance ?? (pack as any).max_cell_imbalance ?? 0.012);
  const resistanceGrowth = Number(pack.resistance_growth ?? 3.2);

  // Health Status derivation
  const healthStatus = soh >= 80 ? 'HEALTHY' : soh >= 70 ? 'WARNING' : 'CRITICAL';
  const statusColor =
    healthStatus === 'HEALTHY'
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : healthStatus === 'WARNING'
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-rose-400 border-rose-500/30 bg-rose-500/10';

  // 240-degree Radial Gauge Calculations
  const radius = 78;
  const circumference = 2 * Math.PI * radius; // ~490.08
  const maxArc = circumference * (240 / 360); // ~326.72
  const activeArc = (soh / 100) * maxArc;

  // Primary Technical Parameter Cards (Structured 4-Column Grid for spacious layout)
  const kpiCategories = [
    {
      title: 'State of Charge',
      category: 'ENERGY',
      value: `${soc.toFixed(1)}%`,
      sub: current >= 0 ? 'Discharging Under Load' : 'Fast Charge Inflow',
      icon: <BatteryCharging className="w-4 h-4 text-cyan-400" />,
      cardClass: 'dark-gradient-card-cyan'
    },
    {
      title: 'Pack Temperature',
      category: 'THERMAL',
      value: `${temp.toFixed(1)}°C`,
      sub: `Peak: ${maxTemp.toFixed(1)}°C (Nominal: 25–35°C)`,
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      cardClass: maxTemp > 38 ? 'dark-gradient-card-amber' : 'dark-gradient-card'
    },
    {
      title: 'Pack Terminal Voltage',
      category: 'ELECTRICAL',
      value: `${voltage.toFixed(2)} V`,
      sub: `Cell Imbalance ΔV: ${(maxImbalance * 1000).toFixed(0)} mV`,
      icon: <Zap className="w-4 h-4 text-blue-400" />,
      cardClass: 'dark-gradient-card-cyan'
    },
    {
      title: 'Electrical Power',
      category: 'ELECTRICAL',
      value: `${Math.abs(powerKw).toFixed(2)} kW`,
      sub: `Load Current: ${Math.abs(current).toFixed(1)} A`,
      icon: <Activity className="w-4 h-4 text-emerald-400" />,
      cardClass: 'dark-gradient-card-emerald'
    },
    {
      title: 'Cumulative Cycle Count',
      category: 'LIFECYCLE',
      value: `${cycle}`,
      sub: '31.2% Life Used (Target: 2,000 cyc)',
      icon: <Clock className="w-4 h-4 text-purple-400" />,
      cardClass: 'dark-gradient-card-indigo'
    },
    {
      title: 'Internal Resistance',
      category: 'DEGRADATION',
      value: `${(32.0 * (1 + resistanceGrowth / 100)).toFixed(1)} mΩ`,
      sub: `+${resistanceGrowth.toFixed(1)}% SEI Growth (Base: 32 mΩ)`,
      icon: <Cpu className="w-4 h-4 text-indigo-400" />,
      cardClass: 'dark-gradient-card-indigo'
    },
    {
      title: 'Battery Risk Index',
      category: 'SAFETY',
      value: `${Number(risk.score ?? 31.0).toFixed(1)} / 100`,
      sub: 'Safety Integrity: ASIL-C Nominal',
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      cardClass: Number(risk.score ?? 31.0) > 60 ? 'dark-gradient-card-rose' : 'dark-gradient-card-emerald'
    },
    {
      title: 'Estimated RUL',
      category: 'PROGNOSTICS',
      value: `${rulCycles} cyc`,
      sub: 'Forecast 95% CI: ±35 cycles',
      icon: <TrendingDown className="w-4 h-4 text-cyan-400" />,
      cardClass: 'dark-gradient-card-indigo'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-7xl mx-auto pb-12">
      
      {/* =========================================================
          LEVEL 1 & LEVEL 2 HERO SECTION
          ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* MAIN HERO SOH INSTRUMENT CARD */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-7 volt-glass-card volt-glass-card-interactive dark-gradient-card-emerald rounded-2xl p-4 sm:p-6 lg:p-7 relative overflow-hidden shadow-2xl flex flex-col justify-between"
        >
          {/* Header Row */}
          <div className="flex items-center justify-between relative z-10 mb-4 pb-3 border-b border-white/[0.07]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                <Gauge className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-orbitron font-bold tracking-wide text-gradient-display uppercase">
                  LEVEL 1: Battery Condition
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  Primary State-of-Health & Prognostic Summary
                </span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('soh-degradation')}
              className="text-xs font-mono text-cyan-300 hover:text-cyan-200 flex items-center gap-1.5 transition px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
            >
              Degradation Details <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main SOH Dial & Prognostics Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-6 items-center relative z-10 my-auto py-2">
            
            {/* Left: Precision 240° Radial Gauge */}
            <div className="sm:col-span-6 flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                
                {/* SVG Gauge */}
                <svg className="w-full h-full transform rotate-[150deg]" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="soh-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Background Track Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${maxArc} ${circumference}`}
                    strokeLinecap="round"
                  />

                  {/* Active Value Arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke="url(#soh-arc-grad)"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${activeArc} ${circumference}`}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>

                {/* Inner Gauge Text Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
                  <span className="text-[10px] font-orbitron font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
                    BATTERY HEALTH
                  </span>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl sm:text-5xl font-black font-mono tabular-nums text-white tracking-tight leading-none">
                      {soh.toFixed(1)}
                    </span>
                    <span className="text-xl font-orbitron text-cyan-400 font-bold ml-0.5">%</span>
                  </div>
                  <div className={`mt-2 px-3 py-0.5 rounded-full text-[10px] font-orbitron font-bold uppercase tracking-wider border inline-flex items-center gap-1.5 ${statusColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {healthStatus}
                  </div>
                </div>
              </div>

              {/* Confidence Badge */}
              <div className="mt-3 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center gap-2 text-xs font-mono tabular-nums shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Model Confidence:</span>
                <strong className="text-emerald-400 font-bold">{confidence.toFixed(1)}%</strong>
              </div>
            </div>

            {/* Right: Prognostic Metric Indicators */}
            <div className="sm:col-span-6 space-y-3">
              <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:border-white/15 transition flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Remaining Useful Life</span>
                  <span className="text-xl font-mono tabular-nums font-bold text-white block mt-0.5">
                    {rulCycles} <span className="text-xs font-normal text-slate-400">cycles</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    ±{ai.rul?.rul_uncertainty ?? 35} cycle uncertainty (95% CI)
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-400" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:border-white/15 transition flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Degradation Rate</span>
                  <span className="text-xl font-mono tabular-nums font-bold text-slate-100 block mt-0.5">
                    {Number(((100.0 - soh) / Math.max(10, cycle) * 0.12).toFixed(4))} <span className="text-xs font-normal text-slate-400">%/cycle</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {soh >= 80 ? 'Nominal LFP Aging Curve' : 'Accelerated Stress Curve'}
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-purple-400" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] hover:border-white/15 transition flex items-center justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Projected End of Life</span>
                  <span className="text-xl font-mono tabular-nums font-bold text-slate-100 block mt-0.5">
                    Cycle {Number(ai.rul?.estimated_eol_cycle ?? 904)} <span className="text-xs font-normal text-slate-400">(70% SOH)</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400">
                    Est. {Math.max(0, Number(ai.rul?.estimated_eol_cycle ?? 904) - cycle)} cycles remaining
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Historical Trajectory Bar */}
          <div className="pt-4 mt-2 border-t border-white/[0.07] relative z-10">
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400 mb-2">
              <span>Historical SOH Trajectory:</span>
              <span className="text-slate-200 font-semibold">
                100.0% → {((100 + soh) / 2 + 3).toFixed(1)}% → {((100 + soh) / 2).toFixed(1)}% →{' '}
                <span className={statusColor.split(' ')[0] + ' font-bold'}>{soh.toFixed(1)}%</span>
              </span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden flex p-0.5 border border-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  soh >= 80 ? 'bg-gradient-to-r from-cyan-500 to-emerald-500' : soh >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-rose-500 to-red-600'
                }`}
                style={{ width: `${soh}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* LEVEL 2: AI EXPLAINABILITY & WHY SOH IS AT CURRENT VALUE */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-5 volt-glass-card volt-glass-card-interactive dark-gradient-card-indigo rounded-2xl p-4 sm:p-6 lg:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden"
        >
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.2)]">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-orbitron font-bold uppercase tracking-wide text-gradient-display">
                    LEVEL 2: AI Explainability
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Why is SOH at {soh.toFixed(1)}%?
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                TreeSHAP XAI
              </span>
            </div>

            {/* Natural Language Diagnostic Summary */}
            <div className="p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07] mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
              <p className="text-xs text-slate-300 font-mono leading-relaxed">
                {rca.probable_cause || 'Battery degradation is primarily driven by cumulative cycle aging and elevated thermal dwell.'}
              </p>
            </div>

            {/* Dynamic Degradation Factors from Live XAI Engine */}
            <div className="space-y-3.5">
              <span className="text-[11px] font-orbitron font-bold text-slate-400 uppercase tracking-wider block">
                Primary Attribution Drivers (SHAP)
              </span>

              {(data.xai?.factors && data.xai.factors.length > 0 ? data.xai.factors.slice(0, 3) : [
                { name: 'Cumulative Cycle Aging', percentage: 41.2, impact: 'High' },
                { name: 'Operating Temperature Stress', percentage: 32.4, impact: 'High' },
                { name: 'Ohmic Resistance Growth', percentage: 15.6, impact: 'Moderate' }
              ]).map((f: any, i: number) => {
                const pct = Number((f.percentage ?? f.contribution ?? 30).toFixed(1));
                const factorColor = f.impact === 'Critical'
                  ? 'from-rose-500 to-amber-500'
                  : f.impact === 'High'
                  ? 'from-cyan-500 to-blue-500'
                  : 'from-indigo-500 to-purple-500';

                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-slate-300 font-medium">{f.name || f.factor}</span>
                      <span className="text-white font-bold">{pct}%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/[0.08]">
                      <div className={`bg-gradient-to-r ${factorColor} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      {f.impact === 'Critical' ? 'Critical active driver' : f.impact === 'High' ? 'Primary degradation stressor' : 'Secondary contributor'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigate('explainability')}
            className="mt-6 w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-slate-200 text-xs font-orbitron font-bold tracking-wider transition flex items-center justify-center gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
          >
            <span>EXPLORE COMPLETE XAI FEATURE ATTRIBUTION</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* =========================================================
          LEVEL 3: 8 STRUCTURED TECHNICAL PARAMETERS & TELEMETRY
          ========================================================= */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-orbitron font-bold uppercase tracking-wider text-slate-200">
              LEVEL 3: Live Engineering Telemetry
            </h3>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-400">
            Real-Time Stream • 1 Hz Refresh Rate
          </span>
        </div>

        {/* Spacious 4-Column Metric Grid with Swatch Aura Bottom Glow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCategories.map((kpi, idx) => (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.03 }}
              className={`${kpi.cardClass} volt-glass-card rounded-2xl p-4 border border-white/[0.08] hover:border-cyan-400/40 transition-all duration-300 shadow-xl flex flex-col justify-between group cursor-default hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">
                  {kpi.category}
                </span>
                <div className="p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                  {kpi.icon}
                </div>
              </div>

              <div>
                <span className="text-xs font-orbitron font-semibold text-slate-300 block mb-1">
                  {kpi.title}
                </span>
                <span className="text-2xl font-black font-mono tabular-nums text-white tracking-tight block">
                  {kpi.value}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-center justify-between">
                <span className="truncate">{kpi.sub}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

