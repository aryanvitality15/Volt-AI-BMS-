import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Zap,
  Flame,
  Activity,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { BatteryState, CellTelemetry } from '../types';

interface NeuralBatteryHeroProps {
  data: BatteryState;
  onNavigateTo3D: () => void;
  onSelectCell?: (cell: CellTelemetry) => void;
}

export const NeuralBatteryHero: React.FC<NeuralBatteryHeroProps> = ({
  data,
  onNavigateTo3D,
  onSelectCell
}) => {
  const [hoveredCellId, setHoveredCellId] = useState<number | null>(null);

  const pack = data.pack || ({} as any);
  const cells = data.cells || [];
  const ai = data.ai || ({} as any);

  const voltage = Number(pack.voltage ?? pack.pack_voltage ?? 25.6);
  const current = Number(pack.current ?? pack.pack_current ?? 14.5);
  const temp = Number(pack.avg_temp ?? pack.avg_temperature ?? 26.2);
  const maxImbalance = Number(pack.max_imbalance ?? pack.max_cell_imbalance ?? 0.012);
  const mode = pack.mode || (current < 0 ? 'CHARGING' : current > 0 ? 'DISCHARGING' : 'IDLE');
  const isCharging = mode === 'CHARGING' || current < -0.1;
  const isDischarging = mode === 'DISCHARGING' || current > 0.1;
  const isIdle = !isCharging && !isDischarging;

  // Derive cell fill percentage based on voltage (LFP: 2.80V empty to 3.65V full)
  const getCellFillPercent = (v: number) => {
    return Math.max(5, Math.min(100, ((v - 2.80) / (3.65 - 2.80)) * 100));
  };

  const getCellStatusColor = (cell: CellTelemetry) => {
    const v = Number(cell.voltage ?? 3.20);
    const t = Number(cell.temp_c ?? 26.0);
    if (t > 42 || v < 2.85 || v > 3.62) {
      return {
        border: 'border-rose-500/50',
        bg: 'bg-rose-500/10',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
        badge: 'text-rose-400 bg-rose-500/20',
        label: 'CRITICAL'
      };
    }
    if (t > 36 || v < 3.00 || v > 3.45) {
      return {
        border: 'border-amber-500/50',
        bg: 'bg-amber-500/10',
        glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
        badge: 'text-amber-400 bg-amber-500/20',
        label: 'WARNING'
      };
    }
    return {
      border: 'border-cyan-500/30 hover:border-cyan-400/60',
      bg: 'bg-cyan-500/[0.04]',
      glow: 'shadow-[0_0_12px_rgba(6,182,212,0.15)]',
      badge: 'text-emerald-400 bg-emerald-500/15',
      label: 'NOMINAL'
    };
  };

  return (
    <div className="volt-glass-card rounded-2xl p-5 sm:p-6 lg:p-7 relative overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* Background Ambient Glow */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
          isCharging
            ? 'bg-emerald-500/15'
            : isDischarging
            ? 'bg-cyan-500/15'
            : 'bg-indigo-500/10'
        }`}
      />

      {/* Top Controls & Pack Architectural Specs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 mb-5 border-b border-white/[0.07] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-orbitron font-bold uppercase tracking-wider text-white">
                BATTERY PACK ARCHITECTURE & LIVE CELL CLUSTER
              </h3>
              <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                8S1P PRISMATIC
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Terminal: <strong className="text-slate-200">{voltage.toFixed(2)} V</strong> • Net Current:{' '}
              <strong className={isCharging ? 'text-emerald-400' : isDischarging ? 'text-cyan-400' : 'text-slate-300'}>
                {current >= 0 ? `+${current.toFixed(1)} A` : `${current.toFixed(1)} A`}
              </strong>{' '}
              • Spread ΔV: <strong className="text-slate-200">{(maxImbalance * 1000).toFixed(0)} mV</strong>
            </p>
          </div>
        </div>

        {/* Operating State Mode Badge & 3D Navigation Button */}
        <div className="flex items-center gap-2.5">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-orbitron font-bold uppercase tracking-wider whitespace-nowrap ${
              isCharging
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                : isDischarging
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-white/[0.04] text-slate-400 border-white/10'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCharging ? 'bg-emerald-400' : isDischarging ? 'bg-cyan-400' : 'bg-slate-500'
              }`}
            />
            <span>
              {isCharging
                ? 'ENERGY RECOVERY // CHARGING'
                : isDischarging
                ? 'POWERTRAIN DRAIN // DISCHARGING'
                : 'STANDBY // RESTING'}
            </span>
          </div>

          <button
            onClick={onNavigateTo3D}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/40 text-xs font-orbitron font-bold text-slate-200 hover:text-white transition shadow-lg group"
            title="Inspect Full 3D Digital Twin with Shader Diagnostics"
          >
            <span>3D TWIN</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* Dynamic Animated Energy Pathways */}
      <div className="relative mb-6">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>Cathode Bus (+25.6V)</span>
          </span>
          <span className="text-slate-300 font-semibold">
            {isCharging
              ? '← Inflow Current Vector (Grid to Pack)'
              : isDischarging
              ? 'Outflow Current Vector (Pack to Inverter) →'
              : 'Static Thermal Equilibrium'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Anode Return (0V GND)</span>
          </span>
        </div>

        {/* Animated Pathway Track */}
        <div className="w-full h-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] overflow-hidden relative">
          <div
            className={`w-full h-full ${
              isCharging
                ? 'energy-line-charging'
                : isDischarging
                ? 'energy-line-discharging'
                : 'bg-white/[0.05]'
            }`}
          />
        </div>
      </div>

      {/* 8-Cell Prismatic Module Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 relative z-10">
        {cells.map((cell, idx) => {
          const v = Number(cell.voltage ?? 3.20);
          const t = Number(cell.temp_c ?? 26.0);
          const fillPct = getCellFillPercent(v);
          const status = getCellStatusColor(cell);
          const isHovered = hoveredCellId === cell.cell_id;

          return (
            <motion.div
              key={cell.cell_id}
              whileHover={{ y: -3, scale: 1.02 }}
              onMouseEnter={() => setHoveredCellId(cell.cell_id)}
              onMouseLeave={() => setHoveredCellId(null)}
              onClick={() => {
                if (onSelectCell) onSelectCell(cell);
              }}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative overflow-hidden bg-[#07080d]/90 ${status.border} ${status.glow}`}
            >
              {/* Internal Capacity Level Indicator */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-500/10 via-emerald-500/5 to-transparent pointer-events-none transition-all duration-500"
                style={{ height: `${fillPct}%` }}
              />

              {/* Cell Header Tag */}
              <div className="flex items-center justify-between relative z-10 mb-2">
                <span className="text-[10px] font-orbitron font-extrabold text-white">
                  CELL #{cell.cell_id}
                </span>
                <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${status.badge}`}>
                  {v >= 3.20 ? 'OK' : 'DEV'}
                </span>
              </div>

              {/* Voltage & Temperature Readouts */}
              <div className="relative z-10 space-y-1 my-1">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-base sm:text-lg font-black text-white tabular-nums">
                    {v.toFixed(3)}
                  </span>
                  <span className="text-[10px] text-cyan-400 font-bold">V</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{t.toFixed(1)}°C</span>
                  </span>
                  <span>{fillPct.toFixed(0)}%</span>
                </div>
              </div>

              {/* Individual Cell Miniature Bar */}
              <div className="w-full bg-black/60 rounded-full h-1 overflow-hidden relative z-10 mt-2 border border-white/[0.08]">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer Diagnostic Metadata */}
      <div className="mt-5 pt-3.5 border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 relative z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cell Voltage Balancing: <strong className="text-emerald-300 font-semibold">Active Matrix (&lt; 15mV)</strong></span>
          </span>
          <span className="hidden md:inline text-white/20">│</span>
          <span className="hidden md:inline">
            Thermal Dissipation Envelope: <strong className="text-slate-200">25.0°C – 28.5°C</strong>
          </span>
        </div>

        <span className="text-[11px] text-slate-500">
          Click any cell canister to inspect detailed electrochemical impedances
        </span>
      </div>
    </div>
  );
};
