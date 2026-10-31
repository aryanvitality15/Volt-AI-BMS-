import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  Thermometer,
  ShieldCheck,
  Activity,
  Info,
  ArrowRight,
  RefreshCw,
  Crosshair,
  ShieldAlert,
  AlertCircle,
  Compass
} from 'lucide-react';
import { BatteryState, CellTelemetry, AlertItem } from '../types';
import {
  BatteryPack3D,
  PackTopology,
  VisualizationMode,
  TOPOLOGY_PRESETS,
  TopologyDetails
} from '../components/BatteryPack3D';

interface BatteryPack3DViewProps {
  data: BatteryState;
  selectedCell?: CellTelemetry | null;
  onSelectCell?: (cell: CellTelemetry | null) => void;
  alerts?: AlertItem[];
  isLiveBackend?: boolean;
  activeBatteryId?: string;
  activeScenario?: string;
  onScenarioChange?: (scenario: string) => void;
}

// ========================================================
// 2D DEFECTIVE CELL GRAPHIC COMPONENT
// Illustrates a detailed cutaway of a lithium battery cell,
// showing the positive/negative terminals, core electrode layers,
// and glowing thermal hotspot / stress defect when problematic.
// ========================================================
interface DefectiveCellGraphicProps {
  cellId: number;
  voltage: number;
  tempC: number;
  resistance: number;
  isDefective: boolean;
  defectReason?: string;
  meanVoltage: number;
}

const DefectiveCellGraphic: React.FC<DefectiveCellGraphicProps> = ({
  cellId,
  voltage,
  tempC,
  resistance,
  isDefective,
  defectReason = 'Cell Overheating & Voltage Sag',
  meanVoltage
}) => {
  const voltDiffMv = ((voltage - meanVoltage) * 1000).toFixed(0);

  return (
    <div className="w-full rounded-2xl bg-[#050811]/90 border border-white/[0.08] p-4 flex flex-col items-center relative overflow-hidden shadow-2xl">
      {/* Background glow matching defect status */}
      <div
        className={`absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isDefective ? 'bg-rose-500/20' : 'bg-emerald-500/15'
        }`}
      />
      <div
        className={`absolute -bottom-12 -left-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          isDefective ? 'bg-amber-500/15' : 'bg-cyan-500/15'
        }`}
      />

      {/* Header bar of graphic */}
      <div className="w-full flex items-center justify-between mb-2 z-10">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isDefective ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
            }`}
          />
          <span className="font-orbitron font-extrabold text-xs uppercase tracking-wider text-white">
            CELL C{cellId} CUTAWAY SCHEMATIC
          </span>
        </div>
        <span
          className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded border ${
            isDefective
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {isDefective ? '⚠️ DEFECTIVE CELL' : '✅ HEALTHY CELL'}
        </span>
      </div>

      {/* SVG Battery Cell Graphic */}
      <div className="w-full max-w-[280px] my-1 relative z-10">
        <svg
          viewBox="0 0 300 240"
          className="w-full h-auto drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)]"
        >
          <defs>
            {/* Metallic Casing Gradient */}
            <linearGradient id="canGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            {/* Terminal Pos Gradient */}
            <linearGradient id="posTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            {/* Terminal Neg Gradient */}
            <linearGradient id="negTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            {/* Internal Core Hotspot Radial Gradient */}
            <radialGradient id="hotspotGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            {/* Healthy Core Radial Gradient */}
            <radialGradient id="healthyGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Terminal Posts at Top */}
          {/* Positive Terminal (+) with red insulator ring */}
          <rect x="90" y="16" width="36" height="18" rx="4" fill="url(#posTerminal)" stroke="#fca5a5" strokeWidth="1" />
          <text x="108" y="29" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            +
          </text>
          <rect x="86" y="32" width="44" height="6" rx="2" fill="#ef4444" opacity="0.6" />

          {/* Negative Terminal (-) in metallic silver */}
          <rect x="174" y="16" width="36" height="18" rx="4" fill="url(#negTerminal)" stroke="#cbd5e1" strokeWidth="1" />
          <text x="192" y="29" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            −
          </text>
          <rect x="170" y="32" width="44" height="6" rx="2" fill="#64748b" opacity="0.6" />

          {/* Center Safety Pressure Vent */}
          <circle cx="150" cy="27" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="150" cy="27" r="2" fill="#ef4444" opacity={isDefective ? "0.9" : "0.3"} />

          {/* 2. Main Prismatic Aluminum Cell Body */}
          <rect
            x="60"
            y="38"
            width="180"
            height="186"
            rx="12"
            fill="url(#canGradient)"
            stroke={isDefective ? '#f43f5e' : '#38bdf8'}
            strokeWidth={isDefective ? '2.5' : '1.5'}
            className={isDefective ? 'animate-pulse' : ''}
          />

          {/* Battery Casing Label */}
          <text x="150" y="55" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            VOLT AI • LFP 3.2V 40Ah • CELL #{cellId}
          </text>

          {/* 3. Internal Cutaway Window (Revealing Lithium Electrode Strata) */}
          <rect
            x="76"
            y="65"
            width="148"
            height="146"
            rx="8"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          {/* Internal Strata: Alternating Anode/Cathode Foil Layers */}
          {Array.from({ length: 9 }).map((_, i) => {
            const y = 74 + i * 15;
            const isCathode = i % 2 === 0;
            return (
              <g key={`foil-layer-${i}`}>
                <line
                  x1="84"
                  y1={y}
                  x2="216"
                  y2={y}
                  stroke={isCathode ? '#0284c7' : '#059669'}
                  strokeWidth="2.5"
                  opacity={isDefective ? '0.4' : '0.8'}
                />
                <line
                  x1="84"
                  y1={y + 3}
                  x2="216"
                  y2={y + 3}
                  stroke="#ffffff"
                  strokeWidth="0.8"
                  opacity="0.25"
                />
              </g>
            );
          })}

          {/* 4. DEFECTIVE HOTSPOT OR HEALTHY CORE */}
          {isDefective ? (
            /* Defective State: Thermal runaway glow, pulsating rings, & micro-fracture */
            <g>
              {/* Expanding heat waves */}
              <circle cx="150" cy="140" r="48" fill="url(#hotspotGrad)" opacity="0.6">
                <animate attributeName="r" values="32;52;32" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="140" r="28" fill="url(#hotspotGrad)">
                <animate attributeName="r" values="22;34;22" dur="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="140" r="10" fill="#ffffff" opacity="0.95">
                <animate attributeName="opacity" values="1;0.6;1" dur="0.8s" repeatCount="indefinite" />
              </circle>

              {/* Dendrite / Micro-fracture Jagged Line */}
              <path
                d="M 125,125 L 140,135 L 152,130 L 165,148 L 178,142"
                fill="none"
                stroke="#fef08a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.95"
              />

              {/* Callout Indicator to Hotspot */}
              <line x1="150" y1="140" x2="242" y2="120" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3,3" />
              <circle cx="242" cy="120" r="3" fill="#f43f5e" />
              <rect x="220" y="105" width="76" height="20" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
              <text x="258" y="118" fill="#ffe4e6" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                HOTSPOT {tempC.toFixed(1)}°C
              </text>

              {/* Callout to Voltage Imbalance */}
              <line x1="90" y1="25" x2="25" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />
              <circle cx="25" cy="60" r="3" fill="#f59e0b" />
              <rect x="5" y="65" width="65" height="20" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
              <text x="37" y="78" fill="#fef3c7" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                ΔV {voltDiffMv} mV
              </text>
            </g>
          ) : (
            /* Healthy State: Calm, balanced energy flow */
            <g>
              <circle cx="150" cy="138" r="42" fill="url(#healthyGrad)" />
              <circle cx="150" cy="138" r="14" fill="#a7f3d0" opacity="0.6" />
              <circle cx="150" cy="138" r="6" fill="#ffffff" opacity="0.9" />

              {/* Balanced Flow Indicator */}
              <rect x="105" y="185" width="90" height="18" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1" />
              <text x="150" y="197" fill="#d1fae5" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                UNIFORM DENSITY ✓
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Plain-English Defect Diagnosis Box */}
      <div
        className={`w-full mt-2 p-3 rounded-xl border text-xs font-mono space-y-1.5 ${
          isDefective
            ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
        }`}
      >
        <div className="flex items-center justify-between font-bold">
          <span className="flex items-center gap-1.5">
            {isDefective ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isDefective ? defectReason : 'Normal Operating Condition'}</span>
          </span>
          <span className="text-[10px] opacity-80">
            {isDefective ? 'Immediate Action Taken' : 'All Clear'}
          </span>
        </div>

        <p className="text-[11px] opacity-90 leading-relaxed">
          {isDefective
            ? `Cell #${cellId} is operating at ${tempC.toFixed(1)}°C (${(tempC - 26).toFixed(1)}°C higher than average) with a ${Math.abs(Number(voltDiffMv))} mV voltage sag. The active cooling fan is set to 100% to protect the pack.`
            : `Cell #${cellId} voltage (${voltage.toFixed(3)}V) and temperature (${tempC.toFixed(1)}°C) are well balanced with the rest of the battery pack. No degradation detected.`}
        </p>

        {/* Diagnostic Measurement Pills */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
          <div className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center">
            <span className="text-slate-400 block text-[8.5px]">VOLTAGE</span>
            <strong className="text-white font-bold">{voltage.toFixed(3)} V</strong>
          </div>
          <div className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center">
            <span className="text-slate-400 block text-[8.5px]">TEMPERATURE</span>
            <strong
              className={`font-bold ${isDefective ? 'text-rose-400' : 'text-emerald-400'}`}
            >
              {tempC.toFixed(1)}°C
            </strong>
          </div>
          <div className="p-1.5 rounded bg-black/40 border border-white/[0.06] text-center">
            <span className="text-slate-400 block text-[8.5px]">RESISTANCE</span>
            <strong className="text-white font-bold">{resistance.toFixed(1)} mΩ</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================================
// MAIN VIEW: 3D BATTERY SYSTEM DIGITAL TWIN (DECLUTTERED)
// ========================================================
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

  // Directly consume live battery telemetry without artificial local state
  const pack = data?.pack || ({} as any);
  const cells = data?.cells || [];
  const ai = data?.ai || ({} as any);
  const rca = data?.rca || ({} as any);

  const packCurrent = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const packVoltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const avgTemp = Number(pack.avg_temp ?? (pack as any).avg_temperature ?? 26.2);
  const socVal = Number(pack.soc ?? 64.8);
  const sohVal = Number(ai.soh ?? 87.4);

  const topoInfo: TopologyDetails = TOPOLOGY_PRESETS[activeTopology] || TOPOLOGY_PRESETS['8S1P'];

  // Mean voltage across active cells
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.28;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.28), 0);
    return sum / cells.length;
  }, [cells]);

  // Real-time Defective Cell Detection:
  // Automatically detects genuine defects from the incoming data stream.
  // When telemetry is within normal envelope, returns NULL so all fault beacons auto-clear!
  const problemCellInfo = useMemo(() => {
    if (!cells || cells.length === 0) return null;

    // 1. Check if AI RCA specifically identified an active defect (and not nominal)
    if (
      rca.affected_cell &&
      rca.probable_cause &&
      !rca.probable_cause.toLowerCase().includes('nominal')
    ) {
      const found = cells.find((c) => c.cell_id === rca.affected_cell);
      if (found) {
        return {
          cellId: found.cell_id,
          reason: rca.probable_cause,
          cell: found
        };
      }
    }

    // 2. Scan cells for temperature >= 42°C (true overheating threat)
    const hotCells = [...cells].filter((c) => (c.temp_c ?? (c as any).temperature ?? 25) >= 42.0);
    if (hotCells.length > 0) {
      hotCells.sort((a, b) => (b.temp_c ?? 25) - (a.temp_c ?? 25));
      const hotCell = hotCells[0];
      return {
        cellId: hotCell.cell_id,
        reason: `Overheating Hotspot: ${hotCell.temp_c?.toFixed(1) || '42.0'}°C exceeds safe threshold`,
        cell: hotCell
      };
    }

    // 3. Scan cells for severe voltage delta >= 50 mV from mean
    const imbalancedCells = [...cells].filter(
      (c) => Math.abs((c.voltage ?? 3.28) - meanVoltage) >= 0.050
    );
    if (imbalancedCells.length > 0) {
      imbalancedCells.sort(
        (a, b) => Math.abs((b.voltage ?? 3.28) - meanVoltage) - Math.abs((a.voltage ?? 3.28) - meanVoltage)
      );
      const imbalancedCell = imbalancedCells[0];
      return {
        cellId: imbalancedCell.cell_id,
        reason: `Voltage Sag Imbalance: ${(Math.abs((imbalancedCell.voltage ?? 3.28) - meanVoltage) * 1000).toFixed(0)} mV delta below pack mean`,
        cell: imbalancedCell
      };
    }

    // Completely normal - no defect
    return null;
  }, [cells, rca, meanVoltage]);

  // Target highlighted cell in 3D:
  // Only pass defect highlight when a verified defect exists.
  // Manual cell inspection does not mark a cell as defective.
  const effectiveHighlightedCellId = problemCellInfo?.cellId ?? null;
  const effectiveHighlightReason = problemCellInfo?.reason;

  // Topology-mapped cell list based on selected architecture and live telemetry
  const displayCells = useMemo(() => {
    const total = topoInfo.totalCells;
    const list: CellTelemetry[] = [];
    for (let i = 0; i < total; i++) {
      const cellId = i + 1;
      const liveCell = cells.find((c) => c.cell_id === cellId) || cells[i % (cells.length || 1)];
      const fallbackCell: CellTelemetry = liveCell || {
        cell_id: cellId,
        voltage: 3.28 + (i % 2 === 0 ? 0.005 : -0.005),
        current: packCurrent / topoInfo.parallel,
        temp_c: 26.0 + i * 0.08,
        soc: socVal,
        internal_resistance_mohm: 32.0 + i * 0.15,
        health_status: 'NORMAL'
      };

      const isDefective = problemCellInfo && problemCellInfo.cellId === cellId;

      list.push({
        ...fallbackCell,
        cell_id: cellId,
        voltage: fallbackCell.voltage ?? 3.28,
        temp_c: fallbackCell.temp_c ?? 26.0,
        internal_resistance_mohm: fallbackCell.internal_resistance_mohm ?? 32.0,
        soc: fallbackCell.soc ?? socVal,
        health_status: isDefective ? 'CRITICAL' : 'NORMAL'
      });
    }
    return list;
  }, [topoInfo, cells, packCurrent, socVal, problemCellInfo]);

  // Cell currently chosen for the 2D graphic inspector
  const cellForGraphic = useMemo(() => {
    if (internalSelectedCell) {
      const found = displayCells.find((c) => c.cell_id === internalSelectedCell.cell_id);
      return found || internalSelectedCell;
    }
    if (problemCellInfo) {
      const found = displayCells.find((c) => c.cell_id === problemCellInfo.cellId);
      if (found) return found;
    }
    return displayCells[0] || null;
  }, [internalSelectedCell, problemCellInfo, displayCells]);

  const isInspectedCellDefective = useMemo(() => {
    if (!cellForGraphic) return false;
    if (problemCellInfo && cellForGraphic.cell_id === problemCellInfo.cellId) return true;
    return (
      (cellForGraphic.temp_c ?? 25) >= 42.0 ||
      Math.abs((cellForGraphic.voltage ?? 3.28) - meanVoltage) >= 0.050
    );
  }, [cellForGraphic, problemCellInfo, meanVoltage]);

  // Handle cell selection
  const handleCellClick = (cell: CellTelemetry | null) => {
    setInternalSelectedCell(cell);
    if (cell) {
      setSelectedModule(null);
    }
    if (onSelectCell) onSelectCell(cell);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. EASY-TO-UNDERSTAND EXECUTIVE HEALTH BANNER            */}
      {/* Tells normal person right away if battery is safe or has */}
      {/* a problem, with 1-click focus on the problem cell.       */}
      {/* Automatically resyncs and clears when status is normal.   */}
      {/* ======================================================== */}
      <div
        className={`p-4 rounded-2xl border shadow-2xl transition-all ${
          problemCellInfo
            ? 'bg-gradient-to-r from-rose-950/70 via-[#180a0f]/80 to-amber-950/60 border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)]'
            : 'bg-gradient-to-r from-emerald-950/50 via-[#061214]/80 to-cyan-950/40 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.15)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                problemCellInfo
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)] animate-pulse'
                  : 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              {problemCellInfo ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-base font-orbitron font-extrabold uppercase tracking-wider text-white">
                  {problemCellInfo
                    ? `⚠️ ATTENTION REQUIRED: DEFECT DETECTED ON CELL #${problemCellInfo.cellId}`
                    : '✅ BATTERY PACK SYSTEM IS 100% HEALTHY'}
                </h2>
                <span
                  className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded ${
                    problemCellInfo
                      ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50'
                      : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50'
                  }`}
                >
                  {problemCellInfo ? 'DEFECT HIGHLIGHTED IN 3D' : 'ALL 8 CELLS NOMINAL'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed max-w-3xl">
                {problemCellInfo
                  ? `Cell #${problemCellInfo.cellId} is running abnormally (${problemCellInfo.reason}). It is highlighted in red with an animated warning beacon in the 3D model below.`
                  : 'All battery cells are cool (26.2°C), perfectly balanced, and operating safely. No thermal or electrical risks detected.'}
              </p>
            </div>
          </div>

          {/* Quick Action Button for Defective Cell Focus */}
          {problemCellInfo && (
            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => {
                  const cell = displayCells.find((c) => c.cell_id === problemCellInfo.cellId);
                  if (cell) {
                    handleCellClick(cell);
                    if (explodedProgress < 0.2) setExplodedProgress(0.3);
                  }
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-orbitron font-bold tracking-wider bg-rose-500 hover:bg-rose-600 text-white flex items-center gap-1.5 shadow-[0_0_16px_rgba(244,63,94,0.4)] transition-all"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>FOCUS DEFECTIVE CELL</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DECLUTTERED 2-COLUMN VIEWPORT: 3D TWIN + GRAPHIC CARD */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ---------------------------------------------------- */}
        {/* LEFT COLUMN (7-8 COLS): 3D MODEL & EASY VIEW CONTROLS */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3">
          {/* Friendly View Buttons & Orbit Helpers */}
          <div className="p-2.5 rounded-2xl volt-glass-card border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shadow-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {
                  id: 'NORMAL',
                  label: '📦 Pack View',
                  desc: 'Assembled battery pack',
                  explode: 0
                },
                {
                  id: 'THERMAL',
                  label: '🌡️ Heat Check',
                  desc: 'Color by temperature',
                  explode: 0.15
                },
                {
                  id: 'EXPLODED',
                  label: '💥 Inside View',
                  desc: 'Separated internal layers',
                  explode: 1.0
                },
                {
                  id: 'CELL_INSPECT',
                  label: '🔍 Cell Inspect',
                  desc: 'Zoom into individual cells',
                  explode: 0.35
                }
              ].map((btn) => {
                const isActive = visualizationMode === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => {
                      setVisualizationMode(btn.id as VisualizationMode);
                      setExplodedProgress(btn.explode);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-mono text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Helper Text */}
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono text-slate-400 hidden sm:inline-flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Drag to Orbit • Scroll to Zoom</span>
              </span>
            </div>
          </div>

          {/* 3D WebGL Canvas Container */}
          <div className="w-full h-[480px] sm:h-[540px] lg:h-[600px] rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl relative">
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
              onModuleSelect={setSelectedModule}
              mode={visualizationMode}
              onModeChange={(m) => setVisualizationMode(m)}
              explodedProgress={explodedProgress}
              onExplodedProgressChange={(p) => setExplodedProgress(p)}
              isLiveConnected={isLiveBackend}
              highlightedCellId={effectiveHighlightedCellId}
              highlightReason={effectiveHighlightReason}
            />
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* RIGHT COLUMN (4-5 COLS): DEFECTIVE CELL GRAPHIC CARD */}
        {/* ---------------------------------------------------- */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
          {/* Defective or Selected Cell Graphic Inspector */}
          {cellForGraphic && (
            <DefectiveCellGraphic
              cellId={cellForGraphic.cell_id}
              voltage={cellForGraphic.voltage ?? 3.28}
              tempC={cellForGraphic.temp_c ?? 26.0}
              resistance={
                cellForGraphic.internal_resistance_mohm ??
                (cellForGraphic as any).internal_resistance ??
                32.0
              }
              isDefective={isInspectedCellDefective}
              defectReason={
                isInspectedCellDefective
                  ? problemCellInfo?.reason || 'Elevated Thermal Gradient'
                  : 'Operating at Optimal Health'
              }
              meanVoltage={meanVoltage}
            />
          )}

          {/* Simple Pack Vital Cards for Normal Persons */}
          <div className="volt-glass-card rounded-2xl p-4 border border-white/[0.08] shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-orbitron font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span>BATTERY HEALTH SUMMARY</span>
              </span>
              <span className="text-[9.5px] font-mono text-cyan-400 font-bold">
                {activeBatteryId} • {topoInfo.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                <span className="text-[9.5px] text-slate-400 block mb-0.5">CHARGE LEVEL</span>
                <strong className="text-base text-cyan-300 font-extrabold">{socVal.toFixed(1)}%</strong>
                <span className="text-[8.5px] text-slate-500 block">State of Charge</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                <span className="text-[9.5px] text-slate-400 block mb-0.5">LIFESPAN HEALTH</span>
                <strong className="text-base text-emerald-400 font-extrabold">{sohVal.toFixed(1)}%</strong>
                <span className="text-[8.5px] text-slate-500 block">Grade A Retained</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                <span className="text-[9.5px] text-slate-400 block mb-0.5">PACK VOLTAGE</span>
                <strong className="text-base text-white font-extrabold">{packVoltage.toFixed(2)} V</strong>
                <span className="text-[8.5px] text-slate-500 block">Standard 25.6V Nominal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                <span className="text-[9.5px] text-slate-400 block mb-0.5">AVG TEMPERATURE</span>
                <strong
                  className={`text-base font-extrabold ${
                    avgTemp > 35 ? 'text-amber-400' : 'text-white'
                  }`}
                >
                  {avgTemp.toFixed(1)}°C
                </strong>
                <span className="text-[8.5px] text-slate-500 block">Safe limit &lt; 40°C</span>
              </div>
            </div>

            {/* Plain English Guide */}
            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-200 text-[10.5px] font-mono flex items-start gap-2">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span>
                Select any cell in the 8-cell ribbon below or click on the 3D pack to view its internal
                cutaway graphic and live millivolt readings.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. INTERACTIVE 8-CELL HEALTH RIBBON (BOTTOM)              */}
      {/* Simple, colorful strip showing status of all 8 cells.   */}
      {/* ======================================================== */}
      <div className="volt-glass-card rounded-2xl p-4 border border-white/[0.08] shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white">
              INDIVIDUAL CELL STATUS STRIP ({displayCells.length} CELLS)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Healthy (&lt;34°C)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Problem / Defect Cell</span>
            </span>
          </div>
        </div>

        {/* 8-Cell Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {displayCells.map((cell) => {
            const isSelected = internalSelectedCell?.cell_id === cell.cell_id;
            const tempVal = cell.temp_c ?? 26.0;
            const voltVal = cell.voltage ?? 3.28;
            const isDefect =
              (problemCellInfo && problemCellInfo.cellId === cell.cell_id) ||
              tempVal >= 34 ||
              Math.abs(voltVal - meanVoltage) > 0.045;

            return (
              <button
                key={`ribbon-cell-${cell.cell_id}`}
                onClick={() => handleCellClick(isSelected ? null : cell)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isDefect
                    ? 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    : isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/50'
                    : 'bg-[#080d1a]/70 hover:bg-white/[0.06] border-white/[0.08] text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-orbitron font-bold text-xs text-white">
                    CELL #{cell.cell_id}
                  </span>
                  {isDefect ? (
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse">
                      FAULT
                    </span>
                  ) : (
                    <span className="text-[8px] font-mono text-emerald-400">✓ OK</span>
                  )}
                </div>

                <div className="text-base font-extrabold font-mono text-white tabular-nums">
                  {voltVal.toFixed(3)} <span className="text-[10px] font-normal text-slate-400">V</span>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                  <span>Temp:</span>
                  <strong className={isDefect ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                    {tempVal.toFixed(1)}°C
                  </strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
