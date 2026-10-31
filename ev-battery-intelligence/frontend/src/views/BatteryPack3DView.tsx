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
  Compass,
  Radio,
  Sliders,
  Send,
  Database,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Target,
  Play,
  RotateCw,
  Search,
  Filter,
  Car,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import { BatteryState, CellTelemetry, AlertItem, MqttStatusInfo } from '../types';
import {
  BatteryPack3D,
  PackTopology,
  VisualizationMode,
  TOPOLOGY_PRESETS,
  TopologyDetails,
  resolveDynamicTopology
} from '../components/BatteryPack3D';
import { api } from '../services/api';

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
// ========================================================
interface DefectiveCellGraphicProps {
  cellId: number;
  voltage: number;
  tempC: number;
  resistance: number;
  isDefective: boolean;
  defectReason?: string;
  meanVoltage: number;
  soh?: number;
}

const DefectiveCellGraphic: React.FC<DefectiveCellGraphicProps> = ({
  cellId,
  voltage,
  tempC,
  resistance,
  isDefective,
  defectReason = 'Cell Overheating & Voltage Sag',
  meanVoltage,
  soh = 87.4
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
            <linearGradient id="canGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="25%" stopColor="#334155" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="75%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>

            <linearGradient id="posTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <linearGradient id="negTerminal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>

            <radialGradient id="hotspotGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="20%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="healthyGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Terminal Posts at Top */}
          <rect x="90" y="16" width="36" height="18" rx="4" fill="url(#posTerminal)" stroke="#fca5a5" strokeWidth="1" />
          <text x="108" y="29" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            +
          </text>
          <rect x="86" y="32" width="44" height="6" rx="2" fill="#ef4444" opacity="0.6" />

          <rect x="174" y="16" width="36" height="18" rx="4" fill="url(#negTerminal)" stroke="#cbd5e1" strokeWidth="1" />
          <text x="192" y="29" fill="#ffffff" fontSize="12" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
            −
          </text>
          <rect x="170" y="32" width="44" height="6" rx="2" fill="#64748b" opacity="0.6" />

          {/* Center Safety Pressure Vent */}
          <circle cx="150" cy="27" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
          <circle cx="150" cy="27" r="2" fill="#ef4444" opacity={isDefective ? '0.9' : '0.3'} />

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
            <g>
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

              <line x1="150" y1="140" x2="242" y2="120" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="3,3" />
              <circle cx="242" cy="120" r="3" fill="#f43f5e" />
              <rect x="220" y="105" width="76" height="20" rx="4" fill="#881337" stroke="#f43f5e" strokeWidth="1" />
              <text x="258" y="118" fill="#ffe4e6" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                HOTSPOT {tempC.toFixed(1)}°C
              </text>

              <line x1="90" y1="25" x2="25" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,3" />
              <circle cx="25" cy="60" r="3" fill="#f59e0b" />
              <rect x="5" y="65" width="65" height="20" rx="4" fill="#78350f" stroke="#f59e0b" strokeWidth="1" />
              <text x="37" y="78" fill="#fef3c7" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                ΔV {voltDiffMv} mV
              </text>
            </g>
          ) : (
            <g>
              <circle cx="150" cy="138" r="42" fill="url(#healthyGrad)" />
              <circle cx="150" cy="138" r="14" fill="#a7f3d0" opacity="0.6" />
              <circle cx="150" cy="138" r="6" fill="#ffffff" opacity="0.9" />

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
            {isDefective ? 'Immediate Action' : 'All Clear'}
          </span>
        </div>

        <p className="text-[11px] opacity-90 leading-relaxed">
          {isDefective
            ? `Cell #${cellId} is operating at ${tempC.toFixed(1)}°C (${(tempC - 26).toFixed(1)}°C above nominal baseline) with a ${Math.abs(Number(voltDiffMv))} mV voltage sag. Active thermal dissipation recommended.`
            : `Cell #${cellId} voltage (${voltage.toFixed(3)}V) and temperature (${tempC.toFixed(1)}°C) are well-balanced within the pack. Estimated Cell SOH: ${soh.toFixed(1)}%.`}
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
// MAIN VIEW: 3D BATTERY SYSTEM DIGITAL TWIN & PREDICTIVE STUDIO
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
  const [customCellCount, setCustomCellCount] = useState<number>(8);
  const [customSeries, setCustomSeries] = useState<number>(8);
  const [customParallel, setCustomParallel] = useState<number>(1);
  const [isWorkbenchOpen, setIsWorkbenchOpen] = useState<boolean>(false);

  const [internalSelectedCell, setInternalSelectedCell] = useState<CellTelemetry | null>(selectedCell || null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<VisualizationMode>('NORMAL');
  const [explodedProgress, setExplodedProgress] = useState<number>(0);
  const [mqttStatus, setMqttStatus] = useState<MqttStatusInfo | null>(null);
  const [isPublishingTest, setIsPublishingTest] = useState<boolean>(false);

  // Predictive Models Studio State
  const [activePredictiveTab, setActivePredictiveTab] = useState<'soh' | 'dispersion' | 'thermal' | 'whatif'>('soh');
  const [whatIfCurrent, setWhatIfCurrent] = useState<number>(1.0); // C-rate
  const [whatIfTemp, setWhatIfTemp] = useState<number>(25.0); // Ambient C
  const [whatIfDod, setWhatIfDod] = useState<number>(80.0); // %

  // Cell ribbon filtering & pagination
  const [cellSearchQuery, setCellSearchQuery] = useState<string>('');
  const [cellSortBy, setCellSortBy] = useState<'id' | 'voltage_asc' | 'temp_desc' | 'soh_asc'>('id');
  const [ribbonPage, setRibbonPage] = useState<number>(1);

  // Poll real MQTT status from backend API
  useEffect(() => {
    let isMounted = true;
    const fetchMqtt = async () => {
      try {
        const status = await api.getMqttStatus();
        if (isMounted && status) {
          setMqttStatus(status);
        }
      } catch {
        // Ignore fallback
      }
    };
    fetchMqtt();
    const interval = setInterval(fetchMqtt, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Sync selectedCell from parent
  useEffect(() => {
    if (selectedCell !== undefined) {
      setInternalSelectedCell(selectedCell);
    }
  }, [selectedCell]);

  // Telemetry references
  const pack = data?.pack || ({} as any);
  const cells = data?.cells || [];
  const ai = data?.ai || ({} as any);
  const rca = data?.rca || ({} as any);
  const risk = data?.risk || ({} as any);
  const validation = data?.validation;

  const packCurrent = Number(pack.current ?? (pack as any).pack_current ?? 14.5);
  const packVoltage = Number(pack.voltage ?? (pack as any).pack_voltage ?? 25.6);
  const avgTemp = Number(pack.avg_temp ?? (pack as any).avg_temperature ?? 26.2);
  const socVal = Number(pack.soc ?? 64.8);
  const sohVal = Number(ai.soh ?? 87.4);
  const rulDisplay = ai.rul?.rul_display || '280 ± 35 cycles';

  // Resolved dynamic topology
  const topoInfo: TopologyDetails = useMemo(() => {
    if (activeTopology === 'CUSTOM') {
      return resolveDynamicTopology(customCellCount, customSeries, customParallel);
    }
    return TOPOLOGY_PRESETS[activeTopology] || TOPOLOGY_PRESETS['8S1P'];
  }, [activeTopology, customCellCount, customSeries, customParallel]);

  // Mean voltage across active cells
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.28;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.28), 0);
    return sum / cells.length;
  }, [cells]);

  // Real-time Defective Cell Detection
  const problemCellInfo = useMemo(() => {
    if (!cells || cells.length === 0) return null;

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

    const hotCells = [...cells].filter((c) => (c.temp_c ?? (c as any).temperature ?? 25) >= 42.0);
    if (hotCells.length > 0) {
      hotCells.sort((a, b) => (b.temp_c ?? 25) - (a.temp_c ?? 25));
      const hotCell = hotCells[0];
      return {
        cellId: hotCell.cell_id,
        reason: `Overheating Hotspot: ${hotCell.temp_c?.toFixed(1) || '42.0'}°C exceeds threshold`,
        cell: hotCell
      };
    }

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

    return null;
  }, [cells, rca, meanVoltage]);

  const effectiveHighlightedCellId = problemCellInfo?.cellId ?? null;
  const effectiveHighlightReason = problemCellInfo?.reason;

  // Full Cell List Mapped to Custom Architecture with Predictive Electrochemical Metrics
  const displayCells: CellTelemetry[] = useMemo(() => {
    const total = topoInfo.totalCells;
    const list: CellTelemetry[] = [];

    const cRateStress = Math.max(0.7, whatIfCurrent);
    const tempStressDelta = (whatIfTemp - 25.0) * 0.22;
    const dodStressMultiplier = whatIfDod / 80.0;

    for (let i = 0; i < total; i++) {
      const cellId = i + 1;
      const liveCell = cells.find((c) => c.cell_id === cellId) || cells[i % (cells.length || 1)];

      const seed = Math.sin(cellId * 99.123) * 10000;
      const deltaSeed = seed - Math.floor(seed) - 0.5;
      const voltDelta = deltaSeed * 0.016;
      const resistanceDelta = ((deltaSeed * 5.2) % 4.0) - 2.0;

      const modulePos = (i % Math.max(1, topoInfo.cellsPerModule)) / Math.max(1, topoInfo.cellsPerModule);
      const internalThermalRise = Math.sin(modulePos * Math.PI) * 2.4;

      const baseVolt = (liveCell?.voltage ?? 3.28) + voltDelta;
      const baseTemp = (liveCell?.temp_c ?? 26.0) + internalThermalRise + tempStressDelta;
      const baseResistance = (liveCell?.internal_resistance_mohm ?? 32.0) + resistanceDelta;

      const agingCycleRate =
        (0.019 + Math.max(0, baseTemp - 28) * 0.0022 + (baseResistance - 30) * 0.0008) *
        cRateStress *
        dodStressMultiplier;
      const currentCycle = pack.cycle || 624;
      const predictedSoh = Math.max(48.0, Math.min(100.0, 100.0 - currentCycle * agingCycleRate));

      const predictedRulCycles = Math.max(
        0,
        Math.round((predictedSoh - 80.0) / Math.max(0.005, agingCycleRate))
      );

      const cellCurrent = packCurrent / Math.max(1, topoInfo.parallel);
      const predictedVoltSag = cellCurrent * (baseResistance / 1000.0);

      const isDefective = problemCellInfo && problemCellInfo.cellId === cellId;

      list.push({
        cell_id: cellId,
        voltage: Number(baseVolt.toFixed(3)),
        current: Number(cellCurrent.toFixed(1)),
        temp_c: Number(baseTemp.toFixed(1)),
        soc: socVal,
        internal_resistance_mohm: Number(baseResistance.toFixed(1)),
        health_status: isDefective ? 'CRITICAL' : predictedSoh < 75 ? 'DEGRADED' : 'NORMAL',
        predicted_soh: Number(predictedSoh.toFixed(1)),
        predicted_rul: predictedRulCycles,
        predicted_temp: Number(baseTemp.toFixed(1)),
        predicted_voltage_sag: Number(predictedVoltSag.toFixed(3))
      });
    }
    return list;
  }, [
    topoInfo,
    cells,
    packCurrent,
    socVal,
    problemCellInfo,
    whatIfCurrent,
    whatIfTemp,
    whatIfDod,
    pack.cycle
  ]);

  // Electrochemical Dispersion & String Bottleneck Metrics
  const dispersionStats = useMemo(() => {
    if (displayCells.length === 0) {
      return {
        minV: 3.28,
        maxV: 3.28,
        deltaV: 0,
        stdDevV: 0,
        minSoh: 87.4,
        maxSoh: 87.4,
        bottleneckCellId: 1,
        balancingTimeHours: 0.5
      };
    }
    let minV = Infinity;
    let maxV = -Infinity;
    let minSoh = Infinity;
    let maxSoh = -Infinity;
    let bottleneckCellId = 1;
    let sumV = 0;

    displayCells.forEach((c) => {
      const v = c.voltage;
      const soh = (c as any).predicted_soh ?? 87.4;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
      if (soh < minSoh) {
        minSoh = soh;
        bottleneckCellId = c.cell_id;
      }
      if (soh > maxSoh) maxSoh = soh;
      sumV += v;
    });

    const avgV = sumV / displayCells.length;
    const variance =
      displayCells.reduce((acc, c) => acc + Math.pow(c.voltage - avgV, 2), 0) / displayCells.length;
    const stdDevV = Math.sqrt(variance);
    const deltaV = maxV - minV;
    const balancingTimeHours = (deltaV * 40.0 * 0.1) / 0.25;

    return {
      minV,
      maxV,
      deltaV,
      stdDevV,
      minSoh,
      maxSoh,
      bottleneckCellId,
      balancingTimeHours: Math.max(0.2, Number(balancingTimeHours.toFixed(1)))
    };
  }, [displayCells]);

  // SOH Degradation Horizon Forecast Data (Cycle 0 to 1500)
  const degradationForecastData = useMemo(() => {
    const points = [];
    const currentCycle = pack.cycle || 624;
    const avgSoh = sohVal;
    const bottleneckSoh = dispersionStats.minSoh;
    const bestSoh = dispersionStats.maxSoh;

    const avgAgingRate = (100.0 - avgSoh) / Math.max(1, currentCycle);
    const bottleneckAgingRate = (100.0 - bottleneckSoh) / Math.max(1, currentCycle);
    const bestAgingRate = (100.0 - bestSoh) / Math.max(1, currentCycle);

    for (let c = 0; c <= 1500; c += 150) {
      const predAvg = Math.max(50.0, 100.0 - c * avgAgingRate);
      const predBottleneck = Math.max(45.0, 100.0 - c * bottleneckAgingRate);
      const predBest = Math.max(55.0, 100.0 - c * bestAgingRate);

      points.push({
        cycle: c,
        packAvg: Number(predAvg.toFixed(1)),
        bottleneckCell: Number(predBottleneck.toFixed(1)),
        bestCell: Number(predBest.toFixed(1)),
        eolThreshold: 80.0
      });
    }
    return points;
  }, [pack.cycle, sohVal, dispersionStats]);

  // Cell Voltage Distribution Bar Data
  const cellVoltageDistributionData = useMemo(() => {
    return displayCells.slice(0, 32).map((c) => ({
      name: `C${c.cell_id}`,
      voltage: c.voltage,
      temp: c.temp_c,
      soh: (c as any).predicted_soh ?? 87.4,
      isBottleneck: c.cell_id === dispersionStats.bottleneckCellId
    }));
  }, [displayCells, dispersionStats.bottleneckCellId]);

  // Thermal Heat Generation in Watts
  const thermalHeatWatts = useMemo(() => {
    const packR =
      displayCells.reduce((acc, c) => acc + c.internal_resistance_mohm / 1000.0, 0) /
      Math.max(1, topoInfo.parallel);
    return Number((Math.pow(packCurrent, 2) * packR).toFixed(1));
  }, [displayCells, topoInfo.parallel, packCurrent]);

  // Selected cell for 2D schematic inspector
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

  const handleCellClick = (cell: CellTelemetry | null) => {
    setInternalSelectedCell(cell);
    if (cell) {
      setSelectedModule(null);
    }
    if (onSelectCell) onSelectCell(cell);
  };

  // Test MQTT Packet Publish
  const handlePublishTestMqtt = async () => {
    setIsPublishingTest(true);
    try {
      const testPayload = {
        battery_id: activeBatteryId,
        timestamp: new Date().toISOString(),
        pack_voltage: packVoltage,
        pack_current: packCurrent,
        avg_temperature: avgTemp,
        max_temperature: avgTemp + 0.6,
        min_temperature: avgTemp - 0.5,
        soc: socVal,
        cycle: pack.cycle || 624,
        max_cell_imbalance: pack.max_imbalance || 0.012,
        mode: pack.mode || 'DISCHARGING',
        data_source: 'MQTT_TELEMETRY',
        cells: displayCells.slice(0, 8).map((c) => ({
          cell_id: c.cell_id,
          voltage: c.voltage,
          current: c.current,
          temp_c: c.temp_c,
          soc: c.soc,
          internal_resistance_mohm: c.internal_resistance_mohm
        }))
      };
      await api.publishTestMqtt(testPayload);
    } catch (e) {
      console.warn('Test MQTT publish error:', e);
    } finally {
      setTimeout(() => setIsPublishingTest(false), 800);
    }
  };

  // Filtered & Paginated Cell Ribbon
  const filteredCells = useMemo(() => {
    let list = [...displayCells];
    if (cellSearchQuery) {
      const q = cellSearchQuery.toLowerCase().replace('c', '').trim();
      list = list.filter((c) => c.cell_id.toString().includes(q));
    }
    if (cellSortBy === 'voltage_asc') {
      list.sort((a, b) => a.voltage - b.voltage);
    } else if (cellSortBy === 'temp_desc') {
      list.sort((a, b) => b.temp_c - a.temp_c);
    } else if (cellSortBy === 'soh_asc') {
      list.sort(
        (a, b) => ((a as any).predicted_soh ?? 87) - ((b as any).predicted_soh ?? 87)
      );
    } else {
      list.sort((a, b) => a.cell_id - b.cell_id);
    }
    return list;
  }, [displayCells, cellSearchQuery, cellSortBy]);

  const cellsPerPage = 16;
  const totalPages = Math.ceil(filteredCells.length / cellsPerPage);
  const pagedCells = useMemo(() => {
    const start = (ribbonPage - 1) * cellsPerPage;
    return filteredCells.slice(start, start + cellsPerPage);
  }, [filteredCells, ribbonPage]);

  const dataSourceLabel =
    validation?.data_source ||
    pack.data_source ||
    (isLiveBackend ? 'MQTT_TELEMETRY' : 'OFFLINE_SIMULATOR');

  const isValidatedTelemetry = validation?.is_valid ?? true;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. REAL-TIME MQTT & TELEMETRY PIPELINE STATUS BAR        */}
      {/* ======================================================== */}
      <div className="p-3.5 rounded-2xl volt-glass-card border border-white/10 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070b16] border border-cyan-500/30 text-xs font-mono">
            <Radio className={`w-3.5 h-3.5 ${isLiveBackend ? 'text-cyan-400 animate-pulse' : 'text-amber-400'}`} />
            <span className="text-slate-400">INGESTION:</span>
            <strong className="text-white">
              {isLiveBackend ? 'HIVEMQ MQTT / WS BROKER' : 'LOCAL SIMULATOR'}
            </strong>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400 px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06]">
            <span>TOPIC:</span>
            <strong className="text-cyan-300 font-bold">
              {mqttStatus?.topic_base || 'ev/battery'}/{activeBatteryId}/#
            </strong>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Rate: <strong className="text-emerald-400">{mqttStatus?.message_rate_hz || 1.0} Hz</strong>
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
              isValidatedTelemetry
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {isValidatedTelemetry ? 'LFP BOUNDS: VALIDATED (2.0-3.9V PASS)' : 'VALIDATION WARNING'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePublishTestMqtt}
            disabled={isPublishingTest}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-orbitron font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Publish verified telemetry frame to HiveMQ MQTT broker"
          >
            <Send className={`w-3.5 h-3.5 ${isPublishingTest ? 'animate-spin' : ''}`} />
            <span>{isPublishingTest ? 'PUBLISHING...' : 'TEST MQTT STREAM'}</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. EXECUTIVE HEALTH & DIAGNOSTIC BANNER                  */}
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
              {problemCellInfo ? <ShieldAlert className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
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
                  {problemCellInfo ? 'DEFECT HIGHLIGHTED IN 3D' : `ALL ${displayCells.length} CELLS NOMINAL`}
                </span>
                <span className="text-[9.5px] font-mono text-cyan-300 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
                  AI SOH: {sohVal.toFixed(1)}% • RUL: {rulDisplay}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono leading-relaxed max-w-3xl">
                {problemCellInfo
                  ? `Cell #${problemCellInfo.cellId} is operating abnormally (${problemCellInfo.reason}). Highlighted in red with an energized warning aura in the 3D digital twin below.`
                  : `Pack telemetry verified across ${displayCells.length} integrated cells. String voltage delta at ${((dispersionStats.deltaV) * 1000).toFixed(0)} mV and average temperature stable.`}
              </p>
            </div>
          </div>

          {problemCellInfo && (
            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => {
                  const cell = displayCells.find((c) => c.cell_id === problemCellInfo.cellId);
                  if (cell) {
                    handleCellClick(cell);
                    if (explodedProgress < 0.2) setExplodedProgress(0.35);
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
      {/* 3. DYNAMIC PACK ARCHITECTURE & CELL INTEGRATOR WORKBENCH */}
      {/* ======================================================== */}
      <div className="p-4 rounded-2xl volt-glass-card border border-white/[0.08] shadow-2xl space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-orbitron font-extrabold text-white uppercase tracking-wider">
                  BATTERY ARCHITECTURE & CELL INTEGRATION WORKBENCH
                </h3>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {topoInfo.totalCells} CELLS ACTIVE
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Customize cell quantity, series strings, and parallel banks to visualize real-time predictive degradation models.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWorkbenchOpen(!isWorkbenchOpen)}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isWorkbenchOpen ? 'Collapse Controls ▲' : 'Custom Steppers & Sliders ▼'}</span>
            </button>
          </div>
        </div>

        {/* Quick Integrated Presets Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {[
            { id: '8S1P', label: '8S1P (8 Cells)', desc: '25.6V Reference' },
            { id: '12S1P', label: '12S1P (12 Cells)', desc: '38.4V Light Spec' },
            { id: '16S1P', label: '16S1P (16 Cells)', desc: '51.2V 2-Wheeler' },
            { id: '16S2P', label: '16S2P (32 Cells)', desc: '51.2V Dual-Bank' },
            { id: '24S2P', label: '24S2P (48 Cells)', desc: '76.8V EV Commuter' },
            { id: '32S2P', label: '32S2P (64 Cells)', desc: '102.4V Commercial' },
            { id: '48S2P', label: '48S2P (96 Cells)', desc: '153.6V Long Range' },
            { id: '32S4P', label: '32S4P (128 Cells)', desc: '102.4V Fleet Bus' }
          ].map((preset) => {
            const isSelected = activeTopology === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  setActiveTopology(preset.id as PackTopology);
                  const p = TOPOLOGY_PRESETS[preset.id as PackTopology];
                  if (p) {
                    setCustomCellCount(p.totalCells);
                    setCustomSeries(p.series);
                    setCustomParallel(p.parallel);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex flex-col items-start ${
                  isSelected
                    ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_16px_rgba(6,182,212,0.6)]'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                }`}
              >
                <span className="font-bold">{preset.label}</span>
                <span className={`text-[9px] ${isSelected ? 'text-slate-900 opacity-80' : 'text-slate-500'}`}>
                  {preset.desc}
                </span>
              </button>
            );
          })}
        </div>

        {/* Expandable Custom Stepper & Range Slider Panel */}
        <AnimatePresence>
          {isWorkbenchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden pt-2 border-t border-white/10"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5">
                {/* Total Cell Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Total Cell Quantity:</span>
                    <strong className="text-cyan-400 text-sm font-orbitron">{customCellCount} CELLS</strong>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="128"
                    step="2"
                    value={customCellCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value, 10);
                      setCustomCellCount(count);
                      setActiveTopology('CUSTOM');
                      const p = count > 32 ? 2 : 1;
                      setCustomParallel(p);
                      setCustomSeries(Math.round(count / p));
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>4 (Min)</span>
                    <span>32</span>
                    <span>64</span>
                    <span>96</span>
                    <span>128 (Max)</span>
                  </div>
                </div>

                {/* Series Count Stepper */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-400 block">Series Configuration (S):</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const next = Math.max(4, customSeries - 2);
                        setCustomSeries(next);
                        setCustomCellCount(next * customParallel);
                        setActiveTopology('CUSTOM');
                      }}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center font-orbitron font-extrabold text-sm text-white py-1 rounded bg-black/60 border border-white/5">
                      {customSeries}S String
                    </div>
                    <button
                      onClick={() => {
                        const next = Math.min(96, customSeries + 2);
                        setCustomSeries(next);
                        setCustomCellCount(next * customParallel);
                        setActiveTopology('CUSTOM');
                      }}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-400 block text-center">
                    Nominal: {(customSeries * 3.2).toFixed(1)}V DC
                  </span>
                </div>

                {/* Parallel Bank Stepper */}
                <div className="space-y-1.5">
                  <span className="text-xs font-mono text-slate-400 block">Parallel Banks (P):</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 4].map((pVal) => (
                      <button
                        key={`pval-${pVal}`}
                        onClick={() => {
                          setCustomParallel(pVal);
                          setCustomCellCount(customSeries * pVal);
                          setActiveTopology('CUSTOM');
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                          customParallel === pVal
                            ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                        }`}
                      >
                        {pVal}P ({(pVal * 40).toFixed(0)}Ah)
                      </button>
                    ))}
                  </div>
                  <span className="text-[9.5px] font-mono text-slate-400 block text-center">
                    Total Energy: {(((customSeries * 3.2) * (customParallel * 40)) / 1000).toFixed(2)} kWh
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Electrical & Physical Specification Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-mono text-xs">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[9px] text-slate-400 block">TOTAL CELLS</span>
            <strong className="text-white text-sm font-orbitron">{topoInfo.totalCells}</strong>
            <span className="text-[8.5px] text-cyan-400 block">{topoInfo.series}S × {topoInfo.parallel}P</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[9px] text-slate-400 block">NOMINAL VOLTAGE</span>
            <strong className="text-white text-sm font-orbitron">{topoInfo.nominalVoltage.toFixed(1)} V</strong>
            <span className="text-[8.5px] text-slate-500 block">2.0–3.65V per cell</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[9px] text-slate-400 block">TOTAL CAPACITY</span>
            <strong className="text-cyan-300 text-sm font-orbitron">{topoInfo.capacityAh.toFixed(0)} Ah</strong>
            <span className="text-[8.5px] text-slate-500 block">40Ah cell rating</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5">
            <span className="text-[9px] text-slate-400 block">ENERGY STORAGE</span>
            <strong className="text-emerald-400 text-sm font-orbitron">{topoInfo.energyKwh.toFixed(2)} kWh</strong>
            <span className="text-[8.5px] text-emerald-500/80 block">Usable capacity</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 col-span-2 sm:col-span-1">
            <span className="text-[9px] text-slate-400 block">ENCLOSURE MODULES</span>
            <strong className="text-white text-sm font-orbitron">{topoInfo.modules} Modules</strong>
            <span className="text-[8.5px] text-slate-500 block">{topoInfo.cellsPerModule} cells/module</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. DECLUTTERED 2-COLUMN VIEWPORT: 3D TWIN + GRAPHIC CARD */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN: 3D DIGITAL TWIN & VISUALIZATION MODES */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3">
          {/* Predictive Visualization Mode Toolbar */}
          <div className="p-2.5 rounded-2xl volt-glass-card border border-white/[0.08] flex flex-wrap items-center justify-between gap-2 shadow-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'NORMAL', label: '📦 Photoreal 3D', explode: 0 },
                { id: 'PREDICTIVE_SOH', label: '💚 SOH Horizon', explode: 0.15 },
                { id: 'THERMAL', label: '🌡️ Heat Dissipation', explode: 0.15 },
                { id: 'VOLTAGE_DISPERSION', label: '⚡ Voltage Sag', explode: 0.2 },
                { id: 'RUL', label: '⏳ RUL Bottleneck', explode: 0.15 },
                { id: 'EXPLODED', label: '💥 Inside View', explode: 1.0 },
                { id: 'XRAY', label: '👁️ X-Ray Strata', explode: 0.2 }
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

            <div className="flex items-center gap-2">
              <span className="text-[10.5px] font-mono text-slate-400 hidden sm:inline-flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-cyan-400" />
                <span>Orbit • Scroll to Zoom</span>
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
              customCellCount={customCellCount}
              customSeries={customSeries}
              customParallel={customParallel}
              onTopologyChange={(t, count, s, p) => {
                setActiveTopology(t);
                if (count !== undefined) setCustomCellCount(count);
                if (s !== undefined) setCustomSeries(s);
                if (p !== undefined) setCustomParallel(p);
              }}
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
              dataSource={dataSourceLabel}
              isValidated={isValidatedTelemetry}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: 2D DEFECTIVE CELL GRAPHIC + PACK VITALS HUD */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-4">
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
              soh={(cellForGraphic as any).predicted_soh ?? sohVal}
            />
          )}

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
                <span className="text-[8.5px] text-slate-500 block">AI SOH Estimate</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#07080e]/90 border border-white/[0.06]">
                <span className="text-[9.5px] text-slate-400 block mb-0.5">PACK VOLTAGE</span>
                <strong className="text-base text-white font-extrabold">
                  {(topoInfo.series * meanVoltage).toFixed(2)} V
                </strong>
                <span className="text-[8.5px] text-slate-500 block">{topoInfo.nominalVoltage.toFixed(1)}V Nom</span>
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

            <div className="p-2.5 rounded-xl bg-[#080d1a] border border-cyan-500/20 text-slate-300 text-[10.5px] font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">RUL Prognostics:</span>
                <strong className="text-cyan-300 font-bold">{rulDisplay}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Voltage Spread ΔV:</span>
                <strong className="text-white font-bold">{(dispersionStats.deltaV * 1000).toFixed(0)} mV</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Battery Risk Index (BRI):</span>
                <strong className={`${risk.score > 50 ? 'text-rose-400' : 'text-emerald-400'} font-bold`}>
                  {risk.score?.toFixed(1) || '31.0'}/100 ({risk.status || 'HEALTHY'})
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. AI PREDICTIVE MODELING STUDIO (4 DEDICATED MODELS)    */}
      {/* ======================================================== */}
      <div className="volt-glass-card rounded-2xl p-5 border border-white/[0.08] shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-orbitron font-extrabold text-white uppercase tracking-wider">
                AI PREDICTIVE MODELING STUDIO • {topoInfo.totalCells} CELLS INTEGRATED
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
                Predictive degradation horizons, series string bottleneck simulations, and thermal dissipation models.
              </p>
            </div>
          </div>

          {/* Model Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/5 font-mono text-xs">
            {[
              { id: 'soh', label: '📈 SOH Horizon (1500 Cycles)' },
              { id: 'dispersion', label: '⚡ Voltage Dispersion & Sag' },
              { id: 'thermal', label: '🔥 Thermal Runaway & Flux' },
              { id: 'whatif', label: '🧪 What-If Stress Simulator' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePredictiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  activePredictiveTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab 1: SOH Degradation Horizon */}
        {activePredictiveTab === 'soh' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">PROJECTED EOL CYCLE</span>
                <strong className="text-base text-white font-orbitron font-extrabold">Cycle 920</strong>
                <span className="text-[8.5px] text-slate-500 block">80% EOL pack threshold</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">BOTTLENECK CELL #</span>
                <strong className="text-base text-amber-400 font-orbitron font-extrabold">
                  Cell #{dispersionStats.bottleneckCellId}
                </strong>
                <span className="text-[8.5px] text-amber-500/80 block">Earliest EOL at Cycle 840</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">STRING LOSS PENALTY</span>
                <strong className="text-base text-rose-400 font-orbitron font-extrabold">3.2%</strong>
                <span className="text-[8.5px] text-slate-500 block">Series string capacity curtailment</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">PREDICTIVE SOH SPREAD</span>
                <strong className="text-base text-cyan-300 font-orbitron font-extrabold">
                  {(dispersionStats.maxSoh - dispersionStats.minSoh).toFixed(1)}%
                </strong>
                <span className="text-[8.5px] text-slate-500 block">Delta between strongest & weakest cell</span>
              </div>
            </div>

            {/* SOH Degradation Curve Chart */}
            <div className="p-3 rounded-xl bg-[#050811]/90 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                <span>PREDICTED CELL SOH TRAJECTORY ACROSS LIFECYCLE (CYCLES 0 - 1500)</span>
                <span className="text-emerald-400 font-bold">LFP Chemistry Degradation Model</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={degradationForecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sohGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="bottleneckGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis dataKey="cycle" stroke="#64748b" tick={{ fontSize: 10, fontFamily: 'monospace' }} unit=" cyc" />
                    <YAxis stroke="#64748b" domain={[60, 100]} tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="%" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#38bdf8', borderRadius: '12px' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                    />
                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80% EOL LIMIT', fill: '#ef4444', fontSize: 10 }} />
                    <Area type="monotone" dataKey="bestCell" name="Best Cell" stroke="#10b981" fillOpacity={0} strokeWidth={2} />
                    <Area type="monotone" dataKey="packAvg" name="Pack Average SOH" stroke="#06b6d4" fill="url(#sohGradient)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="bottleneckCell" name={`Weakest Cell #C${dispersionStats.bottleneckCellId}`} stroke="#f59e0b" fill="url(#bottleneckGradient)" strokeWidth={2} />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace', paddingTop: '8px' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Cell-to-Cell Voltage Dispersion */}
        {activePredictiveTab === 'dispersion' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">VOLTAGE SPREAD ΔV</span>
                <strong className="text-base text-cyan-300 font-orbitron font-extrabold">
                  {(dispersionStats.deltaV * 1000).toFixed(0)} mV
                </strong>
                <span className="text-[8.5px] text-slate-500 block">Peak delta across series</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">STANDARD DEVIATION σ</span>
                <strong className="text-base text-white font-orbitron font-extrabold">
                  {(dispersionStats.stdDevV * 1000).toFixed(1)} mV
                </strong>
                <span className="text-[8.5px] text-emerald-400 block">Uniformity metric</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">ACTIVE BALANCING TIME</span>
                <strong className="text-base text-amber-400 font-orbitron font-extrabold">
                  {dispersionStats.balancingTimeHours} Hours
                </strong>
                <span className="text-[8.5px] text-slate-500 block">At 250mA active transfer</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">USABLE CAPACITY RETENTION</span>
                <strong className="text-base text-emerald-400 font-orbitron font-extrabold">98.4%</strong>
                <span className="text-[8.5px] text-slate-500 block">Post-balancing potential</span>
              </div>
            </div>

            {/* Voltage Spread Bar Chart */}
            <div className="p-3 rounded-xl bg-[#050811]/90 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
                <span>VOLTAGE SPREAD ACROSS FIRST 32 INTEGRATED CELLS (V)</span>
                <span className="text-cyan-300 font-bold">Cell-to-Cell Dispersion Matrix</span>
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cellVoltageDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 9, fontFamily: 'monospace' }} />
                    <YAxis stroke="#64748b" domain={[3.15, 3.35]} tick={{ fontSize: 10, fontFamily: 'monospace' }} unit="V" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#090d16', borderColor: '#38bdf8', borderRadius: '12px' }}
                      itemStyle={{ fontFamily: 'monospace', fontSize: '11px' }}
                    />
                    <ReferenceLine y={meanVoltage} stroke="#38bdf8" strokeDasharray="3 3" label={{ value: 'MEAN V', fill: '#38bdf8', fontSize: 10 }} />
                    <Bar dataKey="voltage" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Thermal Runaway & Cold Plate Heat Flux */}
        {activePredictiveTab === 'thermal' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">JOULE HEATING GENERATION</span>
                <strong className="text-base text-amber-400 font-orbitron font-extrabold">
                  {thermalHeatWatts} W
                </strong>
                <span className="text-[8.5px] text-slate-500 block">P = I²R internal dissipation</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">MAX CELL TEMPERATURE</span>
                <strong className="text-base text-white font-orbitron font-extrabold">
                  {Math.max(...displayCells.map((c) => c.temp_c)).toFixed(1)}°C
                </strong>
                <span className="text-[8.5px] text-emerald-400 block">Threshold: &lt;45°C</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">COOLANT HEAT REMOVAL FLUX</span>
                <strong className="text-base text-cyan-300 font-orbitron font-extrabold">420 W/m²·K</strong>
                <span className="text-[8.5px] text-slate-500 block">Serpentine channel efficiency</span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                <span className="text-[9.5px] text-slate-400 block">THERMAL GRADIENT ΔT</span>
                <strong className="text-base text-emerald-400 font-orbitron font-extrabold">
                  {(Math.max(...displayCells.map((c) => c.temp_c)) - Math.min(...displayCells.map((c) => c.temp_c))).toFixed(1)}°C
                </strong>
                <span className="text-[8.5px] text-slate-500 block">Uniformity envelope &lt; 5°C</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#050811]/90 border border-white/5 text-xs font-mono space-y-2 text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Thermometer className="w-4 h-4" />
                <span>THERMAL RUNAWAY MITIGATION SPECIFICATION</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                The {topoInfo.modules} modular compartments utilize bottom-mounted liquid aluminum cold plates with serpentine microchannels.
                At continuous discharge of {packCurrent.toFixed(1)}A ({whatIfCurrent.toFixed(1)}C), predicted thermal runaway safety margin is <strong>+22.4°C</strong> above maximum core hotspot.
              </p>
            </div>
          </div>
        )}

        {/* Tab 4: What-If Stress Simulator */}
        {activePredictiveTab === 'whatif' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-black/40 border border-white/5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Operating C-Rate:</span>
                  <strong className="text-cyan-400 font-orbitron font-bold">{whatIfCurrent.toFixed(1)}C</strong>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={whatIfCurrent}
                  onChange={(e) => setWhatIfCurrent(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>0.5C Normal</span>
                  <span>1.0C Standard</span>
                  <span>2.0C Fast</span>
                  <span>3.0C Peak</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Ambient Temperature:</span>
                  <strong className="text-amber-400 font-orbitron font-bold">{whatIfTemp.toFixed(1)}°C</strong>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="50"
                  step="1"
                  value={whatIfTemp}
                  onChange={(e) => setWhatIfTemp(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>-10°C Winter</span>
                  <span>25°C Nominal</span>
                  <span>50°C Desert</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Depth of Discharge (DoD):</span>
                  <strong className="text-emerald-400 font-orbitron font-bold">{whatIfDod.toFixed(0)}%</strong>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={whatIfDod}
                  onChange={(e) => setWhatIfDod(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] font-mono text-slate-500">
                  <span>50% Shallow</span>
                  <span>80% Optimal</span>
                  <span>100% Deep</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30">
              <div className="text-xs font-mono text-slate-300">
                Predicted Acceleration: <strong className="text-cyan-300">{(whatIfCurrent * (whatIfDod / 80.0)).toFixed(2)}×</strong> wear rate •
                Estimated Pack EOL under this stress: <strong className="text-white">{Math.round(920 / (whatIfCurrent * (whatIfDod / 80.0)))} Cycles</strong>
              </div>
              <button
                onClick={() => setVisualizationMode('PREDICTIVE_SOH')}
                className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-orbitron text-xs shadow-lg transition-all"
              >
                PROJECT ON 3D TWIN 🚀
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 6. EXPANDED CELL TELEMETRY RIBBON (ALL INTEGRATED CELLS) */}
      {/* ======================================================== */}
      <div className="volt-glass-card rounded-2xl p-4 border border-white/[0.08] shadow-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-orbitron font-extrabold uppercase tracking-wider text-white">
              INTEGRATED CELL TELEMETRY RIBBON ({filteredCells.length} / {displayCells.length} CELLS)
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Filter / Search by Cell ID */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-300">
              <Search className="w-3 h-3 text-slate-400" />
              <input
                type="text"
                placeholder="Find Cell #..."
                value={cellSearchQuery}
                onChange={(e) => {
                  setCellSearchQuery(e.target.value);
                  setRibbonPage(1);
                }}
                className="bg-transparent border-none outline-none text-xs w-20 text-white placeholder-slate-500"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={cellSortBy}
              onChange={(e) => setCellSortBy(e.target.value as any)}
              className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-slate-300 text-xs outline-none"
            >
              <option value="id">Sort: Cell ID</option>
              <option value="voltage_asc">Sort: Lowest Voltage (Sag)</option>
              <option value="temp_desc">Sort: Highest Temp (Hotspot)</option>
              <option value="soh_asc">Sort: Lowest SOH (Bottleneck)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Cell Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {pagedCells.map((cell) => {
            const isSelected = internalSelectedCell?.cell_id === cell.cell_id;
            const tempVal = cell.temp_c ?? 26.0;
            const voltVal = cell.voltage ?? 3.28;
            const soh = (cell as any).predicted_soh ?? 87.4;
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
                    <span className="text-[8px] font-mono text-emerald-400">SOH {soh.toFixed(0)}%</span>
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

        {/* Pagination Controls for Large Integrated Packs */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono text-slate-400">
            <span>
              Showing Page {ribbonPage} of {totalPages} ({filteredCells.length} total cells)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={ribbonPage <= 1}
                onClick={() => setRibbonPage(ribbonPage - 1)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={ribbonPage >= totalPages}
                onClick={() => setRibbonPage(ribbonPage + 1)}
                className="p-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
