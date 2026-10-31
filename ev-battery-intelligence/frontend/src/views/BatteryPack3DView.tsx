import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Thermometer,
  ShieldCheck,
  Activity,
  ChevronRight,
  Info,
  Compass,
  ArrowRight,
  RefreshCw,
  FolderTree
} from 'lucide-react';
import { BatteryState, CellTelemetry, AlertItem } from '../types';
import {
  BatteryPack3D,
  PackTopology,
  VisualizationMode,
  TOPOLOGY_PRESETS,
  TopologyDetails,
  getThermalColor,
  getHealthColor,
  getVoltageColor
} from '../components/BatteryPack3D';

interface BatteryPack3DViewProps {
  data: BatteryState;
  selectedCell?: CellTelemetry | null;
  onSelectCell?: (cell: CellTelemetry | null) => void;
  alerts?: AlertItem[];
  isLiveBackend?: boolean;
  activeBatteryId?: string;
}

export const BatteryPack3DView: React.FC<BatteryPack3DViewProps> = ({
  data,
  selectedCell,
  onSelectCell,
  alerts = [],
  isLiveBackend = true,
  activeBatteryId = 'EV-001'
}) => {
  const [activeTopology, setActiveTopology] = useState<PackTopology>('8S1P');
  const [internalSelectedCell, setInternalSelectedCell] = useState<CellTelemetry | null>(selectedCell || null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('NORMAL');
  const [explodedProgress, setExplodedProgress] = useState<number>(0);

  const pack = data.pack || ({} as any);
  const cells = data.cells || [];
  const ai = data.ai || ({} as any);
  const packCurrent = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const packVoltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const maxImbalance = Number(pack.max_imbalance ?? (pack as any).max_cell_imbalance ?? 0.012);
  const avgTemp = Number(pack.avg_temp ?? (pack as any).avg_temperature ?? 26.2);
  const maxTemp = Number(pack.max_temp ?? (pack as any).max_temperature ?? 26.8);
  const minTemp = Number(pack.min_temp ?? (pack as any).min_temperature ?? 25.7);
  const socVal = Number(pack.soc ?? 64.8);
  const sohVal = Number(ai.soh ?? 87.4);
  const cycleCount = Number(pack.cycle ?? 624);
  const packPowerKw = Math.abs((packVoltage * packCurrent) / 1000);
  const modeString = pack.mode || (packCurrent < -0.1 ? 'CHARGING' : packCurrent > 0.1 ? 'DISCHARGING' : 'IDLE');

  const topoInfo: TopologyDetails = TOPOLOGY_PRESETS[activeTopology] || TOPOLOGY_PRESETS['8S1P'];

  // Handle cell selection
  const handleCellClick = (cell: CellTelemetry | null) => {
    setInternalSelectedCell(cell);
    if (cell) {
      setSelectedModule(null); // Clear module focus when selecting specific cell
    }
    if (onSelectCell) onSelectCell(cell);
  };

  // Handle module selection
  const handleModuleClick = (modId: number | null) => {
    setSelectedModule(modId);
    if (modId) {
      setInternalSelectedCell(null); // Clear cell focus when selecting module
      if (onSelectCell) onSelectCell(null);
    }
  };

  // Mean voltage across active cells
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.28;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.28), 0);
    return sum / cells.length;
  }, [cells]);

  // Topology-mapped cell list based on selected architecture
  const displayCells = useMemo(() => {
    const total = topoInfo.totalCells;
    const list: CellTelemetry[] = [];
    for (let i = 0; i < total; i++) {
      const cellId = i + 1;
      const sourceIndex = i % (cells.length || 1);
      const liveCell = cells[sourceIndex];
      const fallbackCell: CellTelemetry = liveCell || {
        cell_id: cellId,
        voltage: 3.28 + (i % 2 === 0 ? 0.005 : -0.005),
        current: packCurrent / topoInfo.parallel,
        temp_c: 26.0 + (i * 0.08),
        soc: socVal,
        internal_resistance_mohm: 32.0 + (i * 0.15),
        health_status: 'NORMAL'
      };

      list.push({
        ...fallbackCell,
        cell_id: cellId,
        voltage: fallbackCell.voltage ?? 3.28,
        temp_c: fallbackCell.temp_c ?? (fallbackCell as any).temperature ?? 26.0,
        internal_resistance_mohm:
          fallbackCell.internal_resistance_mohm ?? (fallbackCell as any).internal_resistance ?? 32.0,
        soc: fallbackCell.soc ?? socVal
      });
    }
    return list;
  }, [topoInfo, cells, packCurrent, socVal]);

  // Calculate module telemetry if a module is selected
  const moduleTelemetry = useMemo(() => {
    if (!selectedModule) return null;
    const startCellId = (selectedModule - 1) * topoInfo.cellsPerModule + 1;
    const endCellId = startCellId + topoInfo.cellsPerModule - 1;
    const moduleCells = displayCells.filter(
      (c) => c.cell_id >= startCellId && c.cell_id <= endCellId
    );

    if (moduleCells.length === 0) return null;

    const voltages = moduleCells.map((c) => c.voltage ?? 3.28);
    const temps = moduleCells.map((c) => c.temp_c ?? 26.0);
    const sumV = voltages.reduce((a, b) => a + b, 0);
    const avgV = sumV / voltages.length;
    const minV = Math.min(...voltages);
    const maxV = Math.max(...voltages);
    const imbMv = (maxV - minV) * 1000;

    const sumT = temps.reduce((a, b) => a + b, 0);
    const avgT = sumT / temps.length;
    const minT = Math.min(...temps);
    const maxT = Math.max(...temps);

    return {
      moduleId: selectedModule,
      cellCount: moduleCells.length,
      startCellId,
      endCellId,
      avgVoltage: avgV,
      totalVoltage: sumV,
      voltageImbalanceMv: imbMv,
      avgTemp: avgT,
      minTemp: minT,
      maxTemp: maxT,
      tempSpread: maxT - minT,
      status: imbMv > 60 || maxT > 42 ? 'WARNING' : imbMv > 120 || maxT > 52 ? 'CRITICAL' : 'HEALTHY NOMINAL'
    };
  }, [selectedModule, topoInfo, displayCells]);

  // Active alerts filtered by selected cell
  const relevantAlerts = useMemo(() => {
    if (internalSelectedCell) {
      return alerts.filter(
        (a) => a.cell_id === internalSelectedCell.cell_id && a.status === 'ACTIVE'
      );
    }
    return alerts.filter((a) => a.status === 'ACTIVE');
  }, [alerts, internalSelectedCell]);

  // Mode information descriptions
  const modeDescriptions: Record<VisualizationMode, { title: string; desc: string; icon: any }> = {
    NORMAL: {
      title: 'Full Assembled State',
      desc: 'Complete EV battery pack with lower tray enclosure, internal crash ribs, and sealed top cover.',
      icon: Eye
    },
    EXPLODED: {
      title: 'Exploded Layer Architecture',
      desc: 'Separates enclosure cover, electrical busbars, cells, module frames, and liquid cooling cold plate.',
      icon: Layers
    },
    CELL_INSPECT: {
      title: 'Cell Inspection Mode',
      desc: 'Focuses on individual cells with interactive 3D HUD telemetry targets and holographic indicators.',
      icon: Maximize2
    },
    THERMAL: {
      title: 'Thermal Gradient Flow',
      desc: 'Visualizes actual temperatures. Cyan (<26°C), Emerald (27-33°C), Amber (34-42°C), Crimson (>42°C).',
      icon: Flame
    },
    ELECTRICAL: {
      title: 'High-Voltage Series Circuit',
      desc: 'Exposes copper interconnect busbars, series polarity, HV distribution spine, and BDU contactors.',
      icon: Zap
    },
    HEALTH: {
      title: 'State of Health (SOH) Gradient',
      desc: 'Color-coded by SOH degradation: Grade A (>90%), Grade B (80-90%), Grade C (70-80%), Degraded (<70%).',
      icon: ShieldCheck
    },
    XRAY: {
      title: 'Holographic X-Ray View',
      desc: 'Renders the outer aluminum enclosure as transparent dielectric glass, revealing interior components.',
      icon: Sparkles
    }
  };

  const currentModeInfo = modeDescriptions[visualizationMode];

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER & REAL-TIME KPI PILL STRIP */}
      {/* ======================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 p-4 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-orbitron font-extrabold uppercase tracking-wider text-white">
                3D BATTERY SYSTEM DIGITAL TWIN
              </h2>
              <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                PACK: {activeBatteryId}
              </span>
              <span className="text-[9.5px] font-orbitron font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                {topoInfo.name}
              </span>
              <span
                className={`text-[9px] font-orbitron font-semibold px-2 py-0.5 rounded flex items-center gap-1.5 ${
                  isLiveBackend
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLiveBackend ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isLiveBackend ? 'LIVE TELEMETRY STREAM' : 'CLIENT SIMULATION'}
              </span>
            </div>
            <span className="text-[10.5px] text-slate-400 font-mono">
              {topoInfo.description}
            </span>
          </div>
        </div>

        {/* Real-Time Pack Telemetry Stream Pills */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono tabular-nums">
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span className="text-slate-400">PACK VOLTAGE: </span>
            <strong className="text-white font-bold">{packVoltage.toFixed(2)} V</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span className="text-slate-400">CURRENT: </span>
            <strong className={packCurrent < 0 ? 'text-emerald-400 font-bold' : 'text-cyan-400 font-bold'}>
              {packCurrent.toFixed(1)} A ({modeString})
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span className="text-slate-400">POWER: </span>
            <strong className="text-white font-bold">{packPowerKw.toFixed(2)} kW</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span className="text-slate-400">SOC / SOH: </span>
            <strong className="text-cyan-300 font-bold">{socVal.toFixed(1)}%</strong>
            <span className="text-slate-500 mx-1">/</span>
            <strong className="text-emerald-400 font-bold">{sohVal.toFixed(1)}%</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#07080e]/90 border border-white/[0.08] text-slate-300">
            <span className="text-slate-400">AVG TEMP: </span>
            <strong className={avgTemp > 40 ? 'text-rose-400 font-bold' : 'text-white font-bold'}>
              {avgTemp.toFixed(1)}°C
            </strong>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. THREE-COLUMN LABORATORY WORKSPACE (LEFT, CENTER, RIGHT) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN: MODES, TOPOLOGY, & PACK HIERARCHY TREE  */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Visualization Modes */}
          <div className="volt-glass-card rounded-2xl p-3.5 border border-white/[0.08] shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>3D VISUALIZATION MODES</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">7 Modes</span>
            </div>

            <div className="space-y-1.5">
              {(
                [
                  { id: 'NORMAL', label: '1. Assembled Normal', icon: Eye, color: 'text-slate-200' },
                  { id: 'EXPLODED', label: '2. Exploded Strata', icon: Layers, color: 'text-cyan-400' },
                  { id: 'CELL_INSPECT', label: '3. Cell Inspection', icon: Maximize2, color: 'text-sky-400' },
                  { id: 'THERMAL', label: '4. Thermal Gradient', icon: Flame, color: 'text-amber-400' },
                  { id: 'ELECTRICAL', label: '5. Electrical HV Circuit', icon: Zap, color: 'text-emerald-400' },
                  { id: 'HEALTH', label: '6. SOH Degradation', icon: ShieldCheck, color: 'text-teal-400' },
                  { id: 'XRAY', label: '7. Holographic X-Ray', icon: Sparkles, color: 'text-indigo-400' }
                ] as const
              ).map((m) => {
                const Icon = m.icon;
                const isActive = visualizationMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setVisualizationMode(m.id);
                      if (m.id === 'EXPLODED') {
                        setExplodedProgress(1.0);
                      } else if (m.id === 'NORMAL') {
                        setExplodedProgress(0.0);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left font-mono text-xs transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 text-white font-bold border border-cyan-500/50 shadow-[0_0_16px_rgba(6,182,212,0.3)]'
                        : 'bg-[#080d1a]/60 text-slate-400 hover:text-white hover:bg-white/[0.04] border border-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                      <span>{m.label}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pack Topology Preset Switcher */}
          <div className="volt-glass-card rounded-2xl p-3.5 border border-white/[0.08] shadow-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>PACK ARCHITECTURE</span>
              </span>
              <span className="text-[9px] font-mono text-slate-500">{topoInfo.nominalVoltage}V</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(['8S1P', '16S1P', '16S2P', '24S2P', '32S4P'] as PackTopology[]).map((t) => {
                const isSelected = activeTopology === t;
                const item = TOPOLOGY_PRESETS[t];
                return (
                  <button
                    key={t}
                    onClick={() => {
                      setActiveTopology(t);
                      setInternalSelectedCell(null);
                      setSelectedModule(null);
                      if (onSelectCell) onSelectCell(null);
                    }}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 text-white border-emerald-500/50 shadow-[0_0_14px_rgba(16,185,129,0.25)] font-bold'
                        : 'bg-[#080d1a]/60 text-slate-400 hover:text-white hover:bg-white/[0.04] border-white/[0.04]'
                    }`}
                  >
                    <div className="font-orbitron text-[10px] text-emerald-300">{t}</div>
                    <div className="text-[8.5px] font-mono text-slate-400">
                      {item.totalCells} Cells • {item.energyKwh}kWh
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pack Hierarchy Navigator (Pack -> Modules -> Cells) */}
          <div className="volt-glass-card rounded-2xl p-3.5 border border-white/[0.08] shadow-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
                <span>HIERARCHY NAVIGATOR</span>
              </span>
              <button
                onClick={() => {
                  setInternalSelectedCell(null);
                  setSelectedModule(null);
                  if (onSelectCell) onSelectCell(null);
                }}
                className="text-[9px] font-mono text-cyan-400 hover:underline"
              >
                Reset Focus
              </button>
            </div>

            <div className="space-y-1 text-xs font-mono">
              {/* Pack Level */}
              <button
                onClick={() => {
                  setInternalSelectedCell(null);
                  setSelectedModule(null);
                  if (onSelectCell) onSelectCell(null);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all ${
                  !internalSelectedCell && !selectedModule
                    ? 'bg-white/10 text-white font-bold border border-white/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Complete Battery Pack ({topoInfo.totalCells} Cells)</span>
              </button>

              {/* Module Levels */}
              {Array.from({ length: topoInfo.modules }).map((_, m) => {
                const modId = m + 1;
                const isModSelected = selectedModule === modId && !internalSelectedCell;
                return (
                  <div key={`tree-mod-${modId}`} className="pl-3 space-y-1">
                    <button
                      onClick={() => handleModuleClick(modId)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-all ${
                        isModSelected
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-cyan-400" />
                        <span>Module {modId} ({topoInfo.cellsPerModule} Cells)</span>
                      </div>
                      <span className="text-[9px] text-slate-500">
                        C{(modId - 1) * topoInfo.cellsPerModule + 1}–C{modId * topoInfo.cellsPerModule}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* CENTER COLUMN: INTERACTIVE 3D BATTERY VIEWPORT       */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-6 flex flex-col space-y-3">
          {/* Active Mode Notice Banner */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#060b14]/90 border border-cyan-500/30 text-xs font-mono shadow-lg">
            <div className="flex items-center gap-2">
              <currentModeInfo.icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <strong className="text-white font-bold">{currentModeInfo.title}: </strong>
                <span className="text-slate-400 text-[11px]">{currentModeInfo.desc}</span>
              </div>
            </div>
          </div>

          {/* 3D WebGL Canvas Container */}
          <div className="flex-1 w-full min-h-[460px] sm:min-h-[540px] lg:min-h-[620px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl relative">
            <BatteryPack3D
              cells={displayCells}
              packCurrent={packCurrent}
              packVoltage={packVoltage}
              packSoh={sohVal}
              activeTopology={activeTopology}
              onTopologyChange={(t) => setActiveTopology(t)}
              selectedCell={internalSelectedCell}
              onCellSelect={handleCellClick}
              selectedModule={selectedModule}
              onModuleSelect={handleModuleClick}
              mode={visualizationMode}
              onModeChange={(m) => setVisualizationMode(m)}
              explodedProgress={explodedProgress}
              onExplodedProgressChange={(p) => setExplodedProgress(p)}
              isLiveConnected={isLiveBackend}
            />
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN: DYNAMIC TECHNICAL INSPECTOR (CELL/MOD) */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Contextual Technical Inspector Card */}
          <div className="volt-glass-card rounded-2xl p-4 border border-white/[0.08] shadow-2xl space-y-4">
            {/* Inspector Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white">
                    {internalSelectedCell
                      ? `CELL C${internalSelectedCell.cell_id} TELEMETRY`
                      : selectedModule
                      ? `MODULE ${selectedModule} TELEMETRY`
                      : 'PACK SYSTEM TELEMETRY'}
                  </h3>
                  <span className="text-[9px] text-slate-400 font-mono">
                    {internalSelectedCell
                      ? 'Component-Level Telemetry'
                      : selectedModule
                      ? 'Bank-Level Aggregated Telemetry'
                      : 'Global System State of Health'}
                  </span>
                </div>
              </div>

              {(internalSelectedCell || selectedModule) && (
                <button
                  onClick={() => {
                    setInternalSelectedCell(null);
                    setSelectedModule(null);
                    if (onSelectCell) onSelectCell(null);
                  }}
                  className="text-[9px] font-mono px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  Clear
                </button>
              )}
            </div>

            {/* A. If Cell Selected: Display Cell-Specific Available Telemetry */}
            {internalSelectedCell ? (
              <div className="space-y-3.5 animate-in fade-in duration-200">
                {/* Status Badge */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#070b16] border border-white/[0.08] text-xs font-mono">
                  <span className="text-slate-400">Health Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      (internalSelectedCell.temp_c ?? 25) > 42 ||
                      Math.abs((internalSelectedCell.voltage ?? 3.28) - meanVoltage) > 0.1
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : (internalSelectedCell.temp_c ?? 25) > 36 ||
                          Math.abs((internalSelectedCell.voltage ?? 3.28) - meanVoltage) > 0.05
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {(internalSelectedCell.temp_c ?? 25) > 42
                      ? 'CRITICAL ELEVATION'
                      : (internalSelectedCell.temp_c ?? 25) > 36
                      ? 'WARNING DEVIATION'
                      : 'GRADE A NOMINAL'}
                  </span>
                </div>

                {/* Primary Metric Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Cell Voltage:</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-base text-white font-extrabold tabular-nums">
                        {(internalSelectedCell.voltage ?? 3.28).toFixed(3)}
                      </strong>
                      <span className="text-[10px] text-slate-500">V</span>
                    </div>
                    <span className="text-[9px] text-cyan-400">
                      Δ {(((internalSelectedCell.voltage ?? 3.28) - meanVoltage) * 1000).toFixed(1)} mV
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Temperature:</span>
                    <div className="flex items-baseline gap-1">
                      <strong
                        className={`text-base font-extrabold tabular-nums ${
                          (internalSelectedCell.temp_c ?? 25) > 40 ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {(internalSelectedCell.temp_c ?? (internalSelectedCell as any).temperature ?? 26.0).toFixed(1)}
                      </strong>
                      <span className="text-[10px] text-slate-500">°C</span>
                    </div>
                    <span className="text-[9px] text-slate-400">Envelope: 20-35°C</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">AC Resistance:</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-base text-white font-extrabold tabular-nums">
                        {(
                          internalSelectedCell.internal_resistance_mohm ??
                          (internalSelectedCell as any).internal_resistance ??
                          32.0
                        ).toFixed(1)}
                      </strong>
                      <span className="text-[10px] text-slate-500">mΩ</span>
                    </div>
                    <span className="text-[9px] text-emerald-400">Nominal 32 mΩ</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Cell SOC:</span>
                    <div className="flex items-baseline gap-1">
                      <strong className="text-base text-cyan-300 font-extrabold tabular-nums">
                        {(internalSelectedCell.soc ?? socVal).toFixed(1)}
                      </strong>
                      <span className="text-[10px] text-slate-500">%</span>
                    </div>
                    <span className="text-[9px] text-slate-400">Coulomb Counting</span>
                  </div>
                </div>

                {/* Additional Cell Telemetry & Parent Module */}
                <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[11px] font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Parent Module:</span>
                    <strong className="text-white">
                      Module {Math.ceil(internalSelectedCell.cell_id / topoInfo.cellsPerModule)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Current Throughput:</span>
                    <strong className="text-cyan-300">{(packCurrent / topoInfo.parallel).toFixed(1)} A</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cell Chemistry:</span>
                    <strong className="text-emerald-400">LiFePO4 (LFP) 3.2V</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SOH (AI Estimated):</span>
                    <strong className="text-emerald-400">{sohVal.toFixed(1)}%</strong>
                  </div>
                </div>

                {/* Active Alerts for this cell */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-orbitron font-bold uppercase tracking-wider text-slate-400">
                    DIAGNOSTIC ALERTS ({relevantAlerts.length})
                  </span>
                  {relevantAlerts.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-mono flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>All electrical and thermal parameters nominal. No active cell alerts.</span>
                    </div>
                  ) : (
                    relevantAlerts.map((alt) => (
                      <div
                        key={alt.id}
                        className={`p-2.5 rounded-xl border text-[11px] font-mono space-y-1 ${
                          alt.level === 'CRITICAL'
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{alt.title}</span>
                        </div>
                        <p className="text-[10px] opacity-90">{alt.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : selectedModule && moduleTelemetry ? (
              /* B. If Module Selected: Display Module Bank Metrics */
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#070b16] border border-white/[0.08] text-xs font-mono">
                  <span className="text-slate-400">Module Condition:</span>
                  <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {moduleTelemetry.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Total Voltage:</span>
                    <strong className="text-base text-white font-extrabold tabular-nums">
                      {moduleTelemetry.totalVoltage.toFixed(2)} V
                    </strong>
                    <span className="text-[9px] text-slate-400 block">Avg: {moduleTelemetry.avgVoltage.toFixed(3)} V</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Imbalance (ΔV):</span>
                    <strong
                      className={`text-base font-extrabold tabular-nums ${
                        moduleTelemetry.voltageImbalanceMv > 50 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {moduleTelemetry.voltageImbalanceMv.toFixed(0)} mV
                    </strong>
                    <span className="text-[9px] text-slate-400 block">Allowable: &lt; 50 mV</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Avg Temperature:</span>
                    <strong className="text-base text-white font-extrabold tabular-nums">
                      {moduleTelemetry.avgTemp.toFixed(1)} °C
                    </strong>
                    <span className="text-[9px] text-slate-400 block">Spread: {moduleTelemetry.tempSpread.toFixed(1)} °C</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Cell Count:</span>
                    <strong className="text-base text-cyan-300 font-extrabold tabular-nums">
                      {moduleTelemetry.cellCount} Cells
                    </strong>
                    <span className="text-[9px] text-slate-400 block">
                      C{moduleTelemetry.startCellId}–C{moduleTelemetry.endCellId}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[11px] font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Slave BMS Controller:</span>
                    <strong className="text-white">Active (CANbus 500kbps)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Passive Balancing:</span>
                    <strong className="text-emerald-400">Standby (Balanced)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Structural Compression:</span>
                    <strong className="text-cyan-300">5.2 kN Nominal</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* C. Default: Complete Pack System Telemetry */
              <div className="space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#070b16] border border-white/[0.08] text-xs font-mono">
                  <span className="text-slate-400">BMS Master State:</span>
                  <span className="font-bold px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    CONTACTORS ENGAGED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Pack Voltage:</span>
                    <strong className="text-base text-white font-extrabold tabular-nums">
                      {packVoltage.toFixed(2)} V
                    </strong>
                    <span className="text-[9px] text-slate-400 block">Nominal {topoInfo.nominalVoltage} V</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Pack Current:</span>
                    <strong
                      className={`text-base font-extrabold tabular-nums ${
                        packCurrent < 0 ? 'text-emerald-400' : 'text-cyan-400'
                      }`}
                    >
                      {packCurrent.toFixed(1)} A
                    </strong>
                    <span className="text-[9px] text-slate-400 block">{modeString}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">State of Health:</span>
                    <strong className="text-base text-emerald-400 font-extrabold tabular-nums">
                      {sohVal.toFixed(1)} %
                    </strong>
                    <span className="text-[9px] text-slate-400 block">EOL Threshold: 70%</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Max Imbalance:</span>
                    <strong
                      className={`text-base font-extrabold tabular-nums ${
                        maxImbalance > 0.05 ? 'text-amber-400' : 'text-white'
                      }`}
                    >
                      {(maxImbalance * 1000).toFixed(0)} mV
                    </strong>
                    <span className="text-[9px] text-slate-400 block">Target: &lt; 20 mV</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#07080e]/80 border border-white/[0.06] text-[11px] font-mono space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Energy:</span>
                    <strong className="text-white">{topoInfo.energyKwh.toFixed(2)} kWh</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cumulative Cycles:</span>
                    <strong className="text-white">{cycleCount} Cycles</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Thermal Envelope:</span>
                    <strong className="text-cyan-300">
                      {minTemp.toFixed(1)}°C – {maxTemp.toFixed(1)}°C
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">AI Estimated RUL:</span>
                    <strong className="text-emerald-400">{ai.rul?.rul_display || '280 ± 35 cycles'}</strong>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>INTERACTION GUIDELINES:</span>
                  </div>
                  <p className="opacity-90">
                    Click any individual battery cell or module in the 3D model to inspect real-time voltage,
                    temperature, and AC resistance telemetry.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SYNCHRONIZED CELL MATRIX & TELEMETRY PROFILER        */}
      {/* ======================================================== */}
      <div className="volt-glass-card rounded-2xl p-5 border border-white/[0.08] shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white">
                SYNCHRONIZED CELL TELEMETRY MATRIX ({displayCells.length} CELLS)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                Click any cell card to focus and inspect in 3D digital twin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span>Nominal (&lt;34°C)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span>Elevated (&gt;34°C)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <span>Critical (&gt;42°C)</span>
            </span>
          </div>
        </div>

        {/* 2D Cell Grid Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
          {displayCells.map((cell) => {
            const isSelected = internalSelectedCell?.cell_id === cell.cell_id;
            const tempVal = cell.temp_c ?? (cell as any).temperature ?? 26.0;
            const voltVal = cell.voltage ?? 3.28;
            const resVal =
              cell.internal_resistance_mohm ?? (cell as any).internal_resistance ?? 32.0;
            const isCrit = tempVal >= 52 || Math.abs(voltVal - meanVoltage) >= 0.12;
            const isWarn = tempVal >= 42 || Math.abs(voltVal - meanVoltage) >= 0.06;

            const cardBorder = isCrit
              ? 'border-rose-500/50 bg-[#0c0608]/90 text-rose-300 shadow-[inset_0_1px_0_0_rgba(244,63,94,0.2)]'
              : isWarn
              ? 'border-amber-500/50 bg-[#0c0a06]/90 text-amber-300 shadow-[inset_0_1px_0_0_rgba(245,158,11,0.2)]'
              : 'border-white/[0.08] bg-[#07080e]/90 text-emerald-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-cyan-500/40';

            return (
              <motion.div
                key={`matrix-c-${cell.cell_id}`}
                whileHover={{ scale: 1.03, y: -2 }}
                onClick={() => handleCellClick(isSelected ? null : cell)}
                className={`p-3 rounded-xl border backdrop-blur-xl transition-all cursor-pointer relative group ${cardBorder} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.4)] scale-105'
                    : ''
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
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      tempVal > 40 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
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
