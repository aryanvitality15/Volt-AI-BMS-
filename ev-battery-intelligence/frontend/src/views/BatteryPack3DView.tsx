import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Flame,
  Zap,
  Eye,
  Cpu,
  RotateCcw,
  Sparkles,
  Maximize2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Thermometer
} from 'lucide-react';
import { BatteryState, CellTelemetry } from '../types';
import { BatteryPack3D, PackTopology, TOPOLOGY_PRESETS } from '../components/BatteryPack3D';

interface BatteryPack3DViewProps {
  data: BatteryState;
  selectedCell?: CellTelemetry | null;
  onSelectCell?: (cell: CellTelemetry | null) => void;
}

export const BatteryPack3DView: React.FC<BatteryPack3DViewProps> = ({
  data,
  selectedCell,
  onSelectCell
}) => {
  const [activeTopology, setActiveTopology] = useState<PackTopology>('8S1P');
  const [internalSelectedCell, setInternalSelectedCell] = useState<CellTelemetry | null>(selectedCell || null);

  const pack = data.pack || ({} as any);
  const cells = data.cells || [];
  const packCurrent = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const packVoltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const maxImbalance = Number(pack.max_imbalance ?? (pack as any).max_cell_imbalance ?? 0.012);

  const topoInfo = TOPOLOGY_PRESETS[activeTopology] || TOPOLOGY_PRESETS['8S1P'];

  const handleCellClick = (cell: CellTelemetry | null) => {
    setInternalSelectedCell(cell);
    if (onSelectCell) onSelectCell(cell);
  };

  // Mean voltage
  const meanVoltage = React.useMemo(() => {
    if (!cells || cells.length === 0) return 3.20;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.2), 0);
    return sum / cells.length;
  }, [cells]);

  // Topology mapped cells list
  const displayCells = React.useMemo(() => {
    const total = topoInfo.totalCells;
    const list: CellTelemetry[] = [];
    for (let i = 0; i < total; i++) {
      const cellId = i + 1;
      const sourceIndex = i % (cells.length || 1);
      const liveCell = cells[sourceIndex];
      const fallbackCell: CellTelemetry = liveCell || {
        cell_id: cellId,
        voltage: 3.20 + (i % 2 === 0 ? 0.005 : -0.005),
        current: packCurrent / topoInfo.parallel,
        temp_c: 26.0 + (i * 0.1),
        soc: 70.0,
        internal_resistance_mohm: 32.0 + (i * 0.2),
        health_status: 'NORMAL'
      };

      list.push({
        ...fallbackCell,
        cell_id: cellId,
        voltage: fallbackCell.voltage ?? 3.20,
        temp_c: fallbackCell.temp_c ?? (fallbackCell as any).temperature ?? 26.0,
        internal_resistance_mohm: fallbackCell.internal_resistance_mohm ?? (fallbackCell as any).internal_resistance ?? 32.0,
        soc: fallbackCell.soc ?? 70.0
      });
    }
    return list;
  }, [topoInfo, cells, packCurrent]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-[#0a0b10]/85 border border-white/[0.08] shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-orbitron font-bold uppercase tracking-wider text-white">
                3D BATTERY PACK DIGITAL TWIN
              </h2>
              <span className="text-[9px] font-orbitron font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {topoInfo.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {topoInfo.description}
            </span>
          </div>
        </div>

        {/* Real-time Pack Metrics Summary */}
        <div className="flex items-center gap-2 text-[10px] font-mono tabular-nums">
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span>PACK VOLTAGE: </span>
            <strong className="text-white font-bold">{packVoltage.toFixed(2)} V</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span>ENERGY: </span>
            <strong className="text-cyan-400 font-bold">{topoInfo.energyKwh.toFixed(2)} kWh</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span>CELL SPREAD: </span>
            <strong className={maxImbalance > 0.05 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {(maxImbalance * 1000).toFixed(0)} mV
            </strong>
          </div>
        </div>
      </div>

      {/* 3D Viewport Component */}
      <div className="obsidian-card rounded-2xl p-2 border border-white/[0.08] shadow-2xl overflow-hidden">
        <BatteryPack3D
          cells={cells}
          packCurrent={packCurrent}
          packVoltage={packVoltage}
          activeTopology={activeTopology}
          onTopologyChange={(t) => setActiveTopology(t)}
          selectedCell={internalSelectedCell}
          onCellSelect={handleCellClick}
        />
      </div>

      {/* Synchronized 2D Cell Matrix & In-Depth Telemetry Inspector (PDF Page 32) */}
      <div className="obsidian-card rounded-2xl p-5 border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-bold uppercase tracking-wider text-white">
                CELL TELEMETRY MATRIX ({displayCells.length} CELLS)
              </h3>
              <span className="text-[9px] text-slate-400 font-mono">
                Click any cell to target in 3D camera rig
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Nominal
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Deviation
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Critical Anomaly
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          {displayCells.map((cell) => {
            const isSelected = internalSelectedCell?.cell_id === cell.cell_id;
            const tempVal = cell.temp_c ?? (cell as any).temperature ?? 25.0;
            const voltVal = cell.voltage ?? 3.20;
            const resVal = cell.internal_resistance_mohm ?? (cell as any).internal_resistance ?? 32.0;
            const devMv = (voltVal - meanVoltage) * 1000;
            const isCrit = tempVal > 45 || voltVal > 3.65 || voltVal < 2.5 || resVal > 50;
            const isWarn = tempVal > 38 || voltVal > 3.45 || voltVal < 2.9 || resVal > 40;

            const cardBorder = isCrit
              ? 'border-rose-500/50 bg-[#0a060a]/90 text-rose-300 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.15)]'
              : isWarn
              ? 'border-amber-500/50 bg-[#0a0805]/90 text-amber-300 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.15)]'
              : 'border-white/[0.08] bg-[#07080e]/90 text-emerald-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-emerald-500/40';

            return (
              <motion.div
                key={`matrix-c-${cell.cell_id}`}
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => handleCellClick(isSelected ? null : cell)}
                className={`p-3 rounded-xl border backdrop-blur-xl transition-all cursor-pointer relative group ${cardBorder} ${
                  isSelected ? 'ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] scale-105' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-orbitron font-bold text-white">C{cell.cell_id}</span>
                  <span className="text-[7.5px] font-mono px-1.5 py-0.2 rounded bg-black/60 text-slate-300 border border-white/[0.06]">
                    {isCrit ? '✕ CRIT' : isWarn ? '▲ WARN' : '● NOM'}
                  </span>
                </div>

                <div className="mb-1">
                  <span className="text-base font-extrabold font-mono text-white leading-none tabular-nums">
                    {voltVal.toFixed(3)}
                  </span>
                  <span className="text-[9px] font-normal text-slate-500 ml-0.5">V</span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 mb-0.5">
                  <span>Temp:</span>
                  <span className={`font-mono font-semibold tabular-nums ${tempVal > 40 ? 'text-rose-400' : 'text-slate-300'}`}>
                    {tempVal.toFixed(1)}°C
                  </span>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400">
                  <span>AC-IR:</span>
                  <span className="font-mono text-slate-300 tabular-nums">{resVal.toFixed(1)}mΩ</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
