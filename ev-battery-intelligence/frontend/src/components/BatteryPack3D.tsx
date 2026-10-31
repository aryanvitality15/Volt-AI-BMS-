import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Flame,
  Zap,
  Layers,
  Eye,
  Cpu,
  Radio,
  ChevronRight,
  ShieldCheck,
  Activity,
  Sliders,
  Compass,
  AlertTriangle,
  Info
} from 'lucide-react';
import { CellTelemetry } from '../types';

// ==========================================
// 1. TOPOLOGY & VISUALIZATION MODE DEFINITIONS
// ==========================================
export type PackTopology = '8S1P' | '16S1P' | '16S2P' | '24S2P' | '32S4P';

export type VisualizationMode =
  | 'NORMAL'
  | 'EXPLODED'
  | 'CELL_INSPECT'
  | 'THERMAL'
  | 'ELECTRICAL'
  | 'HEALTH'
  | 'XRAY';

export type CameraViewPreset = 'ISOMETRIC' | 'TOP' | 'FRONT' | 'SIDE';

export interface TopologyDetails {
  id: PackTopology;
  name: string;
  series: number;
  parallel: number;
  totalCells: number;
  modules: number;
  cellsPerModule: number;
  nominalVoltage: number;
  capacityAh: number;
  energyKwh: number;
  description: string;
}

export const TOPOLOGY_PRESETS: Record<PackTopology, TopologyDetails> = {
  '8S1P': {
    id: '8S1P',
    name: '8S1P Baseline',
    series: 8,
    parallel: 1,
    totalCells: 8,
    modules: 2,
    cellsPerModule: 4,
    nominalVoltage: 25.6,
    capacityAh: 40.0,
    energyKwh: 1.024,
    description: '8 Series × 1 Parallel • Standard LFP 25.6V Reference Pack (2 Modules)'
  },
  '16S1P': {
    id: '16S1P',
    name: '16S1P Medium',
    series: 16,
    parallel: 1,
    totalCells: 16,
    modules: 2,
    cellsPerModule: 8,
    nominalVoltage: 51.2,
    capacityAh: 40.0,
    energyKwh: 2.048,
    description: '16 Series × 1 Parallel • 51.2V 2.05 kWh Urban Mobility Spec'
  },
  '16S2P': {
    id: '16S2P',
    name: '16S2P Dual-Bank',
    series: 16,
    parallel: 2,
    totalCells: 32,
    modules: 4,
    cellsPerModule: 8,
    nominalVoltage: 51.2,
    capacityAh: 80.0,
    energyKwh: 4.096,
    description: '16 Series × 2 Parallel • 51.2V 4.10 kWh Light EV Platform (4 Modules)'
  },
  '24S2P': {
    id: '24S2P',
    name: '24S2P High-Energy',
    series: 24,
    parallel: 2,
    totalCells: 48,
    modules: 4,
    cellsPerModule: 12,
    nominalVoltage: 76.8,
    capacityAh: 80.0,
    energyKwh: 6.144,
    description: '24 Series × 2 Parallel • 76.8V 6.14 kWh Performance Architecture'
  },
  '32S4P': {
    id: '32S4P',
    name: '32S4P EV Grade',
    series: 32,
    parallel: 4,
    totalCells: 128,
    modules: 8,
    cellsPerModule: 16,
    nominalVoltage: 102.4,
    capacityAh: 160.0,
    energyKwh: 16.384,
    description: '32 Series × 4 Parallel • 102.4V 16.38 kWh Commercial EV Grade'
  }
};

// ==========================================
// 2. COLOR PALETTES & REALISTIC ENGINEERING MAPPERS
// ==========================================
export function getThermalColor(tempC: number): THREE.Color {
  if (tempC >= 52) return new THREE.Color('#ef4444'); // Critical Thermal Runaway Threat
  if (tempC >= 42) return new THREE.Color('#f97316'); // Warning Elevated
  if (tempC >= 34) return new THREE.Color('#f59e0b'); // Moderate Warm
  if (tempC >= 27) return new THREE.Color('#10b981'); // Optimal Operating Window
  return new THREE.Color('#06b6d4'); // Cold / Ambient
}

export function getHealthColor(soh: number): THREE.Color {
  if (soh >= 90) return new THREE.Color('#10b981'); // Grade A
  if (soh >= 80) return new THREE.Color('#06b6d4'); // Grade B
  if (soh >= 70) return new THREE.Color('#f59e0b'); // Grade C
  return new THREE.Color('#ef4444'); // Critical EOL Degradation
}

export function getVoltageColor(voltage: number, avgVoltage: number = 3.28): THREE.Color {
  const delta = Math.abs(voltage - avgVoltage);
  if (delta >= 0.12) return new THREE.Color('#ef4444'); // Critical Imbalance
  if (delta >= 0.06) return new THREE.Color('#f59e0b'); // Warning Imbalance
  if (delta >= 0.02) return new THREE.Color('#06b6d4'); // Slight Deviation
  return new THREE.Color('#10b981'); // Balanced Nominal
}

// ==========================================
// 3. CAMERA CONTROLLER COMPONENT
// ==========================================
interface CameraControllerProps {
  viewPreset: CameraViewPreset | null;
  onPresetComplete: () => void;
  targetPosition: [number, number, number] | null;
  controlsRef: React.RefObject<any>;
}

function CameraController({
  viewPreset,
  onPresetComplete,
  targetPosition,
  controlsRef
}: CameraControllerProps) {
  const { camera } = useThree();
  const isTransitioningRef = useRef<boolean>(false);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(3.8, 3.2, 4.4));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  useEffect(() => {
    if (viewPreset) {
      isTransitioningRef.current = true;
      if (viewPreset === 'ISOMETRIC') {
        targetCamPosRef.current.set(3.8, 3.2, 4.4);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'TOP') {
        targetCamPosRef.current.set(0, 5.6, 0.01);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'FRONT') {
        targetCamPosRef.current.set(0, 0.9, 4.8);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'SIDE') {
        targetCamPosRef.current.set(5.2, 0.9, 0);
        targetLookAtRef.current.set(0, 0, 0);
      }
    }
  }, [viewPreset]);

  useEffect(() => {
    if (targetPosition) {
      isTransitioningRef.current = true;
      targetLookAtRef.current.set(targetPosition[0], 0.25, targetPosition[2]);
      targetCamPosRef.current.set(
        targetPosition[0] + 2.0,
        2.4,
        targetPosition[2] + 2.6
      );
    }
  }, [targetPosition]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      camera.position.lerp(targetCamPosRef.current, Math.min(delta * 5.0, 0.2));

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAtRef.current, Math.min(delta * 5.0, 0.2));
        controlsRef.current.update();
      }

      if (camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
        isTransitioningRef.current = false;
        onPresetComplete();
      }
    }
  });

  return null;
}

// ==========================================
// 4. PRISMATIC CELL COMPONENT
// ==========================================
interface PrismaticCellProps {
  cell: CellTelemetry;
  position: [number, number, number];
  dimensions: [number, number, number]; // [width, height, depth]
  isSelected: boolean;
  isHovered: boolean;
  isHighlighted?: boolean;
  highlightReason?: string;
  mode: VisualizationMode;
  avgVoltage: number;
  packSoh: number;
  explodeFactor: number;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}

function PrismaticCell({
  cell,
  position,
  dimensions,
  isSelected,
  isHovered,
  isHighlighted = false,
  highlightReason,
  mode,
  avgVoltage,
  packSoh,
  explodeFactor,
  onHover,
  onSelect
}: PrismaticCellProps) {
  const [w, h, d] = dimensions;
  const meshRef = useRef<THREE.Mesh>(null!);

  const tempVal = cell.temp_c ?? (cell as any).temperature ?? 26.0;
  const voltVal = cell.voltage ?? 3.28;
  const cellSoh = cell.soc ?? packSoh ?? 87.4;
  const isCritical = tempVal >= 52 || Math.abs(voltVal - avgVoltage) >= 0.12;
  const isProblematic = isHighlighted || isCritical || tempVal >= 34 || Math.abs(voltVal - avgVoltage) >= 0.045;

  // Material color resolution depending on active visualization mode
  const cellMaterial = useMemo(() => {
    if (mode === 'THERMAL') {
      const color = getThermalColor(tempVal);
      return (
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isCritical ? 1.6 : 0.65}
          metalness={0.4}
          roughness={0.25}
        />
      );
    }

    if (mode === 'HEALTH') {
      const color = getHealthColor(cellSoh);
      return (
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          metalness={0.5}
          roughness={0.2}
        />
      );
    }

    if (mode === 'ELECTRICAL') {
      const voltColor = getVoltageColor(voltVal, avgVoltage);
      return (
        <meshStandardMaterial
          color="#1e293b"
          emissive={voltColor}
          emissiveIntensity={isSelected ? 1.4 : 0.4}
          metalness={0.8}
          roughness={0.2}
        />
      );
    }

    if (mode === 'XRAY') {
      return (
        <meshPhysicalMaterial
          color="#0ea5e9"
          emissive="#0284c7"
          emissiveIntensity={isSelected ? 1.2 : 0.3}
          metalness={0.3}
          roughness={0.1}
          transmission={0.65}
          transparent
          opacity={0.7}
          depthWrite={false}
        />
      );
    }

    // Normal / Exploded / Inspect: Highlight defective cell with energetic warning pulse
    if (isProblematic) {
      return (
        <meshStandardMaterial
          color={tempVal >= 40 ? '#ef4444' : '#f97316'}
          emissive={tempVal >= 40 ? '#dc2626' : '#ea580c'}
          emissiveIntensity={isSelected ? 1.6 : 1.15}
          metalness={0.75}
          roughness={0.25}
        />
      );
    }

    // NORMAL / EXPLODED / CELL_INSPECT: Realistic Metallic Anodized PET Film
    return (
      <meshStandardMaterial
        color={isSelected ? '#0284c7' : isHovered ? '#1e40af' : '#0f2952'}
        emissive={isSelected ? '#38bdf8' : isHovered ? '#06b6d4' : '#0369a1'}
        emissiveIntensity={isSelected ? 1.2 : isHovered ? 0.7 : 0.22}
        metalness={0.85}
        roughness={0.22}
      />
    );
  }, [mode, tempVal, voltVal, cellSoh, isSelected, isHovered, isCritical, isProblematic, avgVoltage]);

  // Exploded elevation offset for cell layer (elevates upward in exploded view)
  const cellYOffset = explodeFactor * 0.42;

  return (
    <group
      position={[position[0], position[1] + cellYOffset, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
    >
      {/* 1. Main Prismatic Aluminum Casing & Insulating Sleeve */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        {cellMaterial}
        <Edges
          color={isSelected ? '#38bdf8' : isHovered ? '#67e8f9' : '#0284c7'}
          threshold={25}
          opacity={isSelected ? 1.0 : isHovered ? 0.8 : 0.35}
          transparent
        />
      </mesh>

      {/* 2. Laser-Welded Top Header Plate (Silver Alloy) */}
      <mesh position={[0, h / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.018, d * 0.94]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.12} />
      </mesh>

      {/* 3. Positive Terminal Post (Copper + Red Ring) */}
      <group position={[-w * 0.24, h / 2 + 0.035, 0]}>
        {/* Terminal Post */}
        <mesh castShadow>
          <cylinderGeometry args={[w * 0.14, w * 0.14, 0.045, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Positive Red Polar Insulating Collar */}
        <mesh position={[0, -0.018, 0]}>
          <cylinderGeometry args={[w * 0.18, w * 0.18, 0.012, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.3} />
        </mesh>
      </group>

      {/* 4. Negative Terminal Post (Nickel Plated + Black Ring) */}
      <group position={[w * 0.24, h / 2 + 0.035, 0]}>
        {/* Terminal Post */}
        <mesh castShadow>
          <cylinderGeometry args={[w * 0.14, w * 0.14, 0.045, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Negative Black Polar Insulating Collar */}
        <mesh position={[0, -0.018, 0]}>
          <cylinderGeometry args={[w * 0.18, w * 0.18, 0.012, 16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.3} />
        </mesh>
      </group>

      {/* 5. Center Safety Pressure Relief Burst Vent */}
      <mesh position={[0, h / 2 + 0.021, 0]}>
        <cylinderGeometry args={[w * 0.12, w * 0.12, 0.01, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* 6. Underside Heat-Conductive Thermal Dissipation Pad */}
      <mesh position={[0, -h / 2 - 0.008, 0]}>
        <boxGeometry args={[w * 0.94, 0.014, d * 0.94]} />
        <meshStandardMaterial
          color="#0284c7"
          emissive="#0284c7"
          emissiveIntensity={mode === 'THERMAL' ? 1.0 : 0.3}
          metalness={0.4}
          roughness={0.4}
        />
      </mesh>

      {/* 7. Hover or Selected Holographic Target HUD Ring */}
      {(isSelected || isHovered) && (
        <group position={[0, h / 2 + 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[w * 0.42, w * 0.46, 32]} />
            <meshBasicMaterial
              color={isSelected ? '#38bdf8' : '#06b6d4'}
              transparent
              opacity={0.85}
              wireframe
            />
          </mesh>
        </group>
      )}

      {/* 8. 3D Warning Beacon Graphic for Problematic / Defective Cell (Anchored directly on cell) */}
      {isProblematic && (
        <group position={[0, h / 2 + 0.04, 0]}>
          {/* Glowing Warning Rings on Cell Terminal Deck */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[w * 0.35, w * 0.48, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[w * 0.48, w * 0.62, 32]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.5} />
          </mesh>

          {/* Compact Anchored Fault Pin directly on cell terminal */}
          <Html position={[0, 0.12, 0]} center distanceFactor={7.5} zIndexRange={[120, 0]}>
            <div className="pointer-events-none select-none flex flex-col items-center">
              <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white font-mono text-[10px] font-extrabold shadow-[0_0_18px_rgba(239,68,68,0.95)] border border-white flex items-center gap-1.5 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>FAULT: C{cell.cell_id}</span>
                <span className="px-1.5 py-0.2 rounded bg-black/60 text-[9px] text-amber-200">
                  {tempVal > 33 ? `${tempVal.toFixed(1)}°C` : `${voltVal.toFixed(3)}V`}
                </span>
              </div>
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[7px] border-t-red-600 drop-shadow-[0_2px_4px_rgba(239,68,68,0.8)]" />
            </div>
          </Html>
        </group>
      )}

      {/* 9. 3D Floating Cell Badge ONLY for the single Selected or Hovered Cell (Prevents clutter) */}
      {(isSelected || isHovered) && !isProblematic && (
        <Html position={[0, h / 2 + 0.08, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div
            className={`pointer-events-none select-none font-mono text-[9.5px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-md border transition-all whitespace-nowrap shadow-xl flex items-center gap-1.5 ${
              isSelected
                ? 'bg-cyan-500 text-slate-950 border-white shadow-[0_0_16px_rgba(6,182,212,0.8)]'
                : 'bg-[#040911]/95 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
            }`}
          >
            <span>CELL #{cell.cell_id}</span>
            <span className="text-white opacity-95">{(cell.voltage ?? 3.28).toFixed(3)}V</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ==========================================
// 5. SERIES COPPER BUSBAR CONNECTOR
// ==========================================
function BusbarInterconnect({
  startPos,
  endPos,
  explodeFactor,
  mode
}: {
  startPos: [number, number, number];
  endPos: [number, number, number];
  explodeFactor: number;
  mode: VisualizationMode;
}) {
  const busbarYOffset = explodeFactor * 0.85; // Busbars hover higher in exploded mode

  const midX = (startPos[0] + endPos[0]) / 2;
  const midY = (startPos[1] + endPos[1]) / 2 + busbarYOffset;
  const midZ = (startPos[2] + endPos[2]) / 2;

  const dx = endPos[0] - startPos[0];
  const dz = endPos[2] - startPos[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const isElectrical = mode === 'ELECTRICAL';

  return (
    <group position={[midX, midY, midZ]} rotation={[0, -angle, 0]}>
      {/* Heavy-Duty Solid Copper Busbar Plate */}
      <mesh castShadow>
        <boxGeometry args={[length + 0.08, 0.016, 0.055]} />
        <meshStandardMaterial
          color={isElectrical ? '#f59e0b' : '#d97706'}
          emissive={isElectrical ? '#f59e0b' : '#b45309'}
          emissiveIntensity={isElectrical ? 1.5 : 0.3}
          metalness={0.96}
          roughness={0.12}
        />
      </mesh>
      {/* Dual Laser-Weld Boss Connection Terminals */}
      <mesh position={[-length / 2, 0.012, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
      </mesh>
      <mesh position={[length / 2, 0.012, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.012, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} />
      </mesh>
    </group>
  );
}

// ==========================================
// 6. MODULAR BATTERY BANK & ENCLOSURE ASSEMBLY (NO CHASSIS)
// ==========================================
interface AssembledBatteryPackProps {
  cells: CellTelemetry[];
  topology: TopologyDetails;
  mode: VisualizationMode;
  explodeFactor: number;
  selectedCellId: number | null;
  selectedModuleId: number | null;
  avgVoltage: number;
  packSoh: number;
  highlightedCellId?: number | null;
  highlightReason?: string;
  onSelectCell: (cell: CellTelemetry) => void;
  onSelectModule: (modIndex: number) => void;
}

function AssembledBatteryPack({
  cells,
  topology,
  mode,
  explodeFactor,
  selectedCellId,
  selectedModuleId,
  avgVoltage,
  packSoh,
  highlightedCellId = null,
  highlightReason,
  onSelectCell,
  onSelectModule
}: AssembledBatteryPackProps) {
  const [hoveredCellId, setHoveredCellId] = useState<number | null>(null);

  const totalCells = topology.totalCells;
  const numModules = topology.modules;
  const cellsPerModule = topology.cellsPerModule;

  // Dimensional parameters for realistic EV battery pack
  const cellW = 0.28;
  const cellH = 0.85;
  const cellD = 0.16;
  const cellGapZ = 0.035;

  const moduleDepth = cellsPerModule * (cellD + cellGapZ) + 0.12;
  const moduleWidth = cellW + 0.1;
  const moduleGapX = 0.32;

  const packWidth = numModules * moduleWidth + (numModules - 1) * moduleGapX + 0.45;
  const packLength = moduleDepth + 0.65;
  const trayHeight = 0.14;

  // Exploded layer offsets
  const topCoverY = cellH / 2 + 0.08 + explodeFactor * 1.65;
  const bottomTrayY = -cellH / 2 - 0.06 - explodeFactor * 0.75;
  const coldPlateY = -cellH / 2 - 0.02 - explodeFactor * 0.35;

  // Generate cell positions mapped across modules
  const cellLayout = useMemo(() => {
    const list: Array<{
      cell: CellTelemetry;
      moduleIndex: number;
      localIndex: number;
      pos: [number, number, number];
      termPosA: [number, number, number];
      termPosB: [number, number, number];
    }> = [];

    const startX = -((numModules - 1) * (moduleWidth + moduleGapX)) / 2;

    for (let m = 0; m < numModules; m++) {
      const modX = startX + m * (moduleWidth + moduleGapX);
      const startZ = -((cellsPerModule - 1) * (cellD + cellGapZ)) / 2;

      for (let c = 0; c < cellsPerModule; c++) {
        const globalIndex = m * cellsPerModule + c;
        if (globalIndex >= totalCells) break;

        const cellId = globalIndex + 1;
        const cellData = cells[globalIndex % (cells.length || 1)] || {
          cell_id: cellId,
          voltage: 3.28 + (globalIndex % 2 === 0 ? 0.006 : -0.006),
          current: 14.5,
          temp_c: 26.2 + (globalIndex * 0.05),
          soc: 64.8,
          internal_resistance_mohm: 32.0,
          health_status: 'NORMAL'
        };

        const cz = startZ + c * (cellD + cellGapZ);
        const pos: [number, number, number] = [modX, 0, cz];

        // Alternating polarities for series connection
        const isReversed = c % 2 === 1;
        const termPosA: [number, number, number] = [
          modX + (isReversed ? cellW * 0.24 : -cellW * 0.24),
          cellH / 2 + 0.035,
          cz
        ];
        const termPosB: [number, number, number] = [
          modX + (isReversed ? -cellW * 0.24 : cellW * 0.24),
          cellH / 2 + 0.035,
          cz
        ];

        list.push({
          cell: { ...cellData, cell_id: cellId },
          moduleIndex: m + 1,
          localIndex: c,
          pos,
          termPosA,
          termPosB
        });
      }
    }
    return list;
  }, [numModules, cellsPerModule, totalCells, cells, moduleWidth, moduleGapX, cellW, cellH, cellD, cellGapZ]);

  return (
    <group position={[0, 0, 0]}>
      {/* ======================================================== */}
      {/* 1. LOWER STRUCTURAL TRAY ENCLOSURE & CRASH SILLS (BOTTOM) */}
      {/* ======================================================== */}
      <group position={[0, bottomTrayY, 0]}>
        {/* Main Extruded Aluminum Pan */}
        <mesh receiveShadow position={[0, -trayHeight / 2, 0]}>
          <boxGeometry args={[packWidth, trayHeight, packLength]} />
          <meshStandardMaterial
            color="#0b1120"
            metalness={0.92}
            roughness={0.18}
            emissive="#0369a1"
            emissiveIntensity={0.12}
          />
          <Edges color="#38bdf8" threshold={25} opacity={0.4} transparent />
        </mesh>

        {/* Structural Perimeter Mounting Flange with Bolt Holes */}
        <mesh position={[0, -0.01, 0]}>
          <boxGeometry args={[packWidth + 0.16, 0.02, packLength + 0.16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.95} roughness={0.15} />
          <Edges color="#0284c7" threshold={30} opacity={0.45} transparent />
        </mesh>

        {/* Internal Longitudinal Shear Beams separating Module Bays */}
        {Array.from({ length: numModules - 1 }).map((_, i) => {
          const startX = -((numModules - 1) * (moduleWidth + moduleGapX)) / 2;
          const beamX = startX + i * (moduleWidth + moduleGapX) + (moduleWidth + moduleGapX) / 2;
          return (
            <mesh key={`beam-${i}`} position={[beamX, trayHeight * 0.35, 0]}>
              <boxGeometry args={[0.045, trayHeight * 0.9, packLength - 0.2]} />
              <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.2} />
              <Edges color="#38bdf8" threshold={20} opacity={0.3} transparent />
            </mesh>
          );
        })}

        {/* Transverse Cross-Members for Torsional Rigidity */}
        {[-packLength * 0.3, 0, packLength * 0.3].map((cz, i) => (
          <mesh key={`cross-${i}`} position={[0, trayHeight * 0.3, cz]}>
            <boxGeometry args={[packWidth - 0.1, trayHeight * 0.6, 0.035]} />
            <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* ======================================================== */}
      {/* 2. LIQUID COOLING COLD PLATE & SERPENTINE CHANNELS */}
      {/* ======================================================== */}
      <group position={[0, coldPlateY, 0]}>
        {/* Aluminum Cold Plate Body */}
        <mesh receiveShadow position={[0, -0.015, 0]}>
          <boxGeometry args={[packWidth - 0.08, 0.028, packLength - 0.14]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={mode === 'THERMAL' ? 1.4 : 0.5}
            metalness={0.88}
            roughness={0.15}
          />
        </mesh>

        {/* Serpentine Coolant Flow Ribs / Microchannels */}
        {Array.from({ length: 6 }).map((_, i) => {
          const zOffset = -packLength * 0.38 + (i * packLength * 0.76) / 5;
          return (
            <mesh key={`coolant-${i}`} position={[0, 0.002, zOffset]}>
              <boxGeometry args={[packWidth - 0.22, 0.01, 0.035]} />
              <meshStandardMaterial
                color="#06b6d4"
                emissive="#06b6d4"
                emissiveIntensity={mode === 'THERMAL' ? 2.2 : 1.2}
              />
            </mesh>
          );
        })}

        {/* Dual Quick-Disconnect Liquid Coolant Manifolds (Front-Left) */}
        <group position={[-packWidth / 2 - 0.06, 0.02, -packLength * 0.35]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.032, 0.032, 0.12, 16]} />
            <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.02, 16]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1.5} />
          </mesh>
        </group>
        <group position={[-packWidth / 2 - 0.06, 0.02, -packLength * 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <mesh>
            <cylinderGeometry args={[0.032, 0.032, 0.12, 16]} />
            <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.1} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 0.02, 16]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1.5} />
          </mesh>
        </group>
      </group>

      {/* ======================================================== */}
      {/* 3. BATTERY MODULE FRAMES & SIDE COMPRESSION PLATES */}
      {/* ======================================================== */}
      {Array.from({ length: numModules }).map((_, m) => {
        const startX = -((numModules - 1) * (moduleWidth + moduleGapX)) / 2;
        const modX = startX + m * (moduleWidth + moduleGapX);
        const isModuleSelected = selectedModuleId === m + 1;

        return (
          <group
            key={`module-${m}`}
            position={[modX, explodeFactor * 0.18, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectModule(m + 1);
            }}
          >
            {/* Front & Rear Structural End-Plates (Machined Aluminum) */}
            <mesh position={[0, 0, -moduleDepth / 2 - 0.015]} castShadow>
              <boxGeometry args={[moduleWidth, cellH * 0.94, 0.03]} />
              <meshStandardMaterial
                color={isModuleSelected ? '#0284c7' : '#1e293b'}
                emissive={isModuleSelected ? '#38bdf8' : '#0369a1'}
                emissiveIntensity={isModuleSelected ? 0.6 : 0.15}
                metalness={0.92}
                roughness={0.18}
              />
              <Edges color="#38bdf8" threshold={20} opacity={0.5} transparent />
            </mesh>
            <mesh position={[0, 0, moduleDepth / 2 + 0.015]} castShadow>
              <boxGeometry args={[moduleWidth, cellH * 0.94, 0.03]} />
              <meshStandardMaterial
                color={isModuleSelected ? '#0284c7' : '#1e293b'}
                emissive={isModuleSelected ? '#38bdf8' : '#0369a1'}
                emissiveIntensity={isModuleSelected ? 0.6 : 0.15}
                metalness={0.92}
                roughness={0.18}
              />
              <Edges color="#38bdf8" threshold={20} opacity={0.5} transparent />
            </mesh>

            {/* Side Steel Compression Tie-Rods */}
            {[-cellW / 2 - 0.025, cellW / 2 + 0.025].map((tx, ti) =>
              [-cellH * 0.35, cellH * 0.35].map((ty, tyi) => (
                <mesh key={`tierod-${ti}-${tyi}`} position={[tx, ty, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, moduleDepth + 0.06, 12]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
                </mesh>
              ))
            )}

            {/* Slave BMS Telemetry Module Header & Ribbon Connector */}
            <group position={[0, cellH / 2 + 0.04, -moduleDepth / 2 + 0.05]}>
              <mesh castShadow>
                <boxGeometry args={[moduleWidth * 0.65, 0.04, 0.08]} />
                <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
              </mesh>
              <mesh position={[0, 0.025, 0]}>
                <sphereGeometry args={[0.014, 12, 12]} />
                <meshBasicMaterial color={isModuleSelected ? '#38bdf8' : '#10b981'} />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* ======================================================== */}
      {/* 4. INDIVIDUAL PRISMATIC BATTERY CELLS */}
      {/* ======================================================== */}
      {cellLayout.map(({ cell, pos }) => (
        <PrismaticCell
          key={`cell-${cell.cell_id}`}
          cell={cell}
          position={pos}
          dimensions={[cellW, cellH, cellD]}
          isSelected={selectedCellId === cell.cell_id}
          isHovered={hoveredCellId === cell.cell_id}
          isHighlighted={highlightedCellId === cell.cell_id}
          highlightReason={highlightReason}
          mode={mode}
          avgVoltage={avgVoltage}
          packSoh={packSoh}
          explodeFactor={explodeFactor}
          onHover={(hovered) => setHoveredCellId(hovered ? cell.cell_id : null)}
          onSelect={() => onSelectCell(cell)}
        />
      ))}

      {/* ======================================================== */}
      {/* 5. ELECTRICAL BUSBARS & CONNECTIONS */}
      {/* ======================================================== */}
      {cellLayout.map((item, idx) => {
        // Connect consecutive cells within the same module in series
        if (item.localIndex < cellsPerModule - 1) {
          const nextItem = cellLayout[idx + 1];
          if (nextItem && nextItem.moduleIndex === item.moduleIndex) {
            return (
              <BusbarInterconnect
                key={`busbar-${item.cell.cell_id}-${nextItem.cell.cell_id}`}
                startPos={item.termPosB}
                endPos={nextItem.termPosA}
                explodeFactor={explodeFactor}
                mode={mode}
              />
            );
          }
        }
        return null;
      })}

      {/* ======================================================== */}
      {/* 6. HIGH VOLTAGE DISTRIBUTION & MASTER BDU JUNCTION BOX */}
      {/* ======================================================== */}
      <group position={[0, explodeFactor * 0.6, packLength / 2 - 0.22]}>
        {/* Master BMS / BDU High Voltage Junction Box Enclosure */}
        <mesh castShadow position={[0, 0.1, 0]}>
          <boxGeometry args={[packWidth * 0.72, 0.22, 0.28]} />
          <meshStandardMaterial
            color="#ea580c"
            metalness={0.85}
            roughness={0.2}
            emissive="#c2410c"
            emissiveIntensity={0.25}
          />
          <Edges color="#f97316" threshold={20} opacity={0.6} transparent />
        </mesh>

        {/* Master Contactor Sockets */}
        <group position={[-packWidth * 0.2, 0.12, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
            <meshStandardMaterial color="#ea580c" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>
        <group position={[packWidth * 0.2, 0.12, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
            <meshStandardMaterial color="#ea580c" metalness={0.9} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Orange HV Distribution Spine Conduits */}
        <mesh position={[0, 0.04, -packLength * 0.25]}>
          <boxGeometry args={[0.065, 0.035, packLength * 0.5]} />
          <meshStandardMaterial
            color="#ea580c"
            emissive="#f97316"
            emissiveIntensity={mode === 'ELECTRICAL' ? 2.0 : 1.2}
          />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 7. UPPER ENCLOSURE LID & PRESSURE EQUALIZATION VALVE */}
      {/* ======================================================== */}
      <group position={[0, topCoverY, 0]}>
        {/* Upper Protective Cover Lid */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[packWidth + 0.04, 0.06, packLength + 0.04]} />
          {mode === 'XRAY' || mode === 'THERMAL' || mode === 'CELL_INSPECT' ? (
            <meshPhysicalMaterial
              color="#38bdf8"
              transparent
              opacity={0.2}
              roughness={0.1}
              metalness={0.1}
              clearcoat={1.0}
              transmission={0.82}
              depthWrite={false}
            />
          ) : (
            <meshStandardMaterial
              color="#090d16"
              metalness={0.94}
              roughness={0.18}
              emissive="#0369a1"
              emissiveIntensity={0.15}
            />
          )}
          <Edges
            color="#38bdf8"
            threshold={25}
            opacity={mode === 'XRAY' || mode === 'THERMAL' || mode === 'CELL_INSPECT' ? 0.75 : 0.45}
            transparent
          />
        </mesh>

        {/* High Voltage Hazard Warning Emblem Placard */}
        <group position={[0, 0.035, 0]}>
          <mesh>
            <boxGeometry args={[0.55, 0.008, 0.32]} />
            <meshStandardMaterial
              color="#f59e0b"
              emissive="#d97706"
              emissiveIntensity={0.7}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        </group>

        {/* Pressure Equalization Membrane Gore-Tex Valve */}
        <mesh position={[packWidth * 0.35, 0.035, packLength * 0.35]}>
          <cylinderGeometry args={[0.04, 0.04, 0.015, 18]} />
          <meshStandardMaterial color="#475569" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 7. PRIMARY BATTERY PACK 3D COMPONENT
// ==========================================
export interface BatteryPack3DProps {
  cells?: CellTelemetry[];
  packCurrent?: number;
  packVoltage?: number;
  packSoh?: number;
  activeTopology?: PackTopology;
  onTopologyChange?: (t: PackTopology) => void;
  selectedCell?: CellTelemetry | null;
  onCellSelect?: (cell: CellTelemetry | null) => void;
  selectedModule?: number | null;
  onModuleSelect?: (modId: number | null) => void;
  mode?: VisualizationMode;
  onModeChange?: (m: VisualizationMode) => void;
  explodedProgress?: number; // 0.0 to 1.0
  onExplodedProgressChange?: (p: number) => void;
  isLiveConnected?: boolean;
  highlightedCellId?: number | null;
  highlightReason?: string;
}

export const BatteryPack3D: React.FC<BatteryPack3DProps> = ({
  cells = [],
  packCurrent = 14.5,
  packVoltage = 25.6,
  packSoh = 87.4,
  activeTopology = '8S1P',
  onTopologyChange,
  selectedCell = null,
  onCellSelect,
  selectedModule = null,
  onModuleSelect,
  mode = 'NORMAL',
  onModeChange,
  explodedProgress = 0,
  onExplodedProgressChange,
  isLiveConnected = true,
  highlightedCellId = null,
  highlightReason
}) => {
  const [internalTopology, setInternalTopology] = useState<PackTopology>(activeTopology);
  const [internalMode, setInternalMode] = useState<VisualizationMode>(mode);
  const [internalExplode, setInternalExplode] = useState<number>(explodedProgress);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [viewPreset, setViewPreset] = useState<CameraViewPreset | null>(null);

  const controlsRef = useRef<any>(null);

  // Synchronize internal and prop values smoothly
  useEffect(() => {
    if (activeTopology && activeTopology !== internalTopology) {
      setInternalTopology(activeTopology);
    }
  }, [activeTopology]);

  useEffect(() => {
    if (mode && mode !== internalMode) {
      setInternalMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (explodedProgress !== undefined && explodedProgress !== internalExplode) {
      setInternalExplode(explodedProgress);
    }
  }, [explodedProgress]);

  // When mode changes to EXPLODED, animate to 1.0
  useEffect(() => {
    if (internalMode === 'EXPLODED') {
      setInternalExplode(1.0);
      if (onExplodedProgressChange) onExplodedProgressChange(1.0);
    } else if (internalMode === 'NORMAL' && internalExplode > 0) {
      setInternalExplode(0.0);
      if (onExplodedProgressChange) onExplodedProgressChange(0.0);
    }
  }, [internalMode]);

  const topoInfo = TOPOLOGY_PRESETS[internalTopology] || TOPOLOGY_PRESETS['8S1P'];

  // Mean voltage across active cells
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.28;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.28), 0);
    return sum / cells.length;
  }, [cells]);

  const handleCellClick = (cell: CellTelemetry) => {
    if (onCellSelect) {
      if (selectedCell?.cell_id === cell.cell_id) {
        onCellSelect(null);
      } else {
        onCellSelect(cell);
      }
    }
  };

  const handleModuleClick = (modId: number) => {
    if (onModuleSelect) {
      if (selectedModule === modId) {
        onModuleSelect(null);
      } else {
        onModuleSelect(modId);
      }
    }
  };

  const handleResetCamera = () => {
    setViewPreset('ISOMETRIC');
    if (onCellSelect) onCellSelect(null);
    if (onModuleSelect) onModuleSelect(null);
  };

  const handleModeSelect = (newMode: VisualizationMode) => {
    setInternalMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  return (
    <div className="w-full h-full min-h-[440px] sm:min-h-[540px] lg:min-h-[620px] rounded-2xl overflow-hidden bg-[#030712] border border-white/10 shadow-2xl relative select-none">
      {/* WebGL 3D Canvas with High-Precision Shadows & Lab Studio Lighting */}
      <Canvas
        camera={{ position: [3.8, 3.2, 4.4], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{
          touchAction: 'none',
          background:
            'radial-gradient(ellipse at 50% 60%, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.4) 40%, #030712 90%)'
        }}
      >
        {/* Engineering Studio Lighting */}
        <ambientLight intensity={1.4} color="#f8fafc" />
        <directionalLight position={[6, 9, 7]} intensity={2.4} castShadow shadow-mapSize={1024} />
        <directionalLight position={[-7, 6, -5]} intensity={1.2} color="#38bdf8" />
        <pointLight position={[0, 4, 0]} intensity={1.8} color="#06b6d4" distance={9} />
        <pointLight position={[0, -2, 0]} intensity={1.2} color="#10b981" distance={6} />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          autoRotate={autoRotate}
          autoRotateSpeed={1.0}
          minDistance={1.8}
          maxDistance={12.0}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />

        <CameraController
          viewPreset={viewPreset}
          onPresetComplete={() => setViewPreset(null)}
          targetPosition={
            selectedCell
              ? [
                  ((Math.floor((selectedCell.cell_id - 1) / topoInfo.cellsPerModule)) - (topoInfo.modules - 1) / 2) * 0.7,
                  0,
                  (((selectedCell.cell_id - 1) % topoInfo.cellsPerModule) - (topoInfo.cellsPerModule - 1) / 2) * 0.195
                ]
              : null
          }
          controlsRef={controlsRef}
        />

        {/* 3D Assembled Battery Pack System */}
        <AssembledBatteryPack
          cells={cells}
          topology={topoInfo}
          mode={internalMode}
          explodeFactor={internalExplode}
          selectedCellId={selectedCell?.cell_id ?? null}
          selectedModuleId={selectedModule}
          avgVoltage={meanVoltage}
          packSoh={packSoh}
          highlightedCellId={highlightedCellId}
          highlightReason={highlightReason}
          onSelectCell={handleCellClick}
          onSelectModule={handleModuleClick}
        />

        {/* Ground Contact Soft Shadow */}
        <ContactShadows
          position={[0, -1.25, 0]}
          opacity={0.65}
          scale={14}
          blur={2.4}
          far={5.0}
          color="#0284c7"
        />
      </Canvas>

      {/* ======================================================== */}
      {/* FLOATING HUD CONTROLS: TOP-BAR STATUS & CAMERA PRESETS */}
      {/* ======================================================== */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto z-10">
        {/* Left: Pack Topology & Real-time Live Badge */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-orbitron text-[10px] font-bold">
            <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>{isLiveConnected ? 'TELEMETRY ONLINE' : 'SIMULATOR MODE'}</span>
          </div>

          <div className="px-2.5 py-1 text-[10px] font-mono text-slate-300">
            <strong className="text-white">{topoInfo.series}S{topoInfo.parallel}P</strong> • {topoInfo.nominalVoltage.toFixed(1)}V • {topoInfo.energyKwh.toFixed(2)} kWh
          </div>
        </div>

        {/* Right: Quick Camera View Presets */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-white/10 shadow-xl">
          {(['ISOMETRIC', 'TOP', 'FRONT', 'SIDE'] as CameraViewPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setViewPreset(preset)}
              className="px-2.5 py-1 rounded-lg text-[9.5px] font-orbitron font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              {preset}
            </button>
          ))}

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg text-[10px] font-mono transition-all flex items-center gap-1 ${
              autoRotate ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle 360° Auto-Rotate"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-all"
            title="Reset Camera View"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* FLOATING HUD CONTROLS: BOTTOM-BAR EXPLODED VIEW SLIDER */}
      {/* ======================================================== */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 pointer-events-auto z-10">
        {/* Exploded View Separation Slider */}
        <div className="w-full sm:w-auto flex items-center gap-3 px-3.5 py-2 rounded-xl bg-[#040911]/95 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="flex items-center gap-1.5 text-cyan-400 font-orbitron text-[10px] font-bold tracking-wider">
            <Layers className="w-3.5 h-3.5" />
            <span>EXPLODED VIEW:</span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={internalExplode}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setInternalExplode(val);
              if (onExplodedProgressChange) onExplodedProgressChange(val);
            }}
            className="w-32 sm:w-44 accent-cyan-400 cursor-pointer"
          />

          <span className="text-[10px] font-mono text-cyan-300 tabular-nums min-w-[38px] text-right">
            {(internalExplode * 100).toFixed(0)}%
          </span>

          <button
            onClick={() => {
              const next = internalExplode > 0.05 ? 0.0 : 1.0;
              setInternalExplode(next);
              if (onExplodedProgressChange) onExplodedProgressChange(next);
            }}
            className="px-2 py-0.5 rounded text-[9px] font-orbitron font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            {internalExplode > 0.05 ? 'Assemble' : 'Explode'}
          </button>
        </div>

        {/* Interactive Selection Quick Clear */}
        {(selectedCell || selectedModule) && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-[10px] font-mono shadow-xl">
            <span>
              Target: <strong className="text-white">{selectedCell ? `Cell C${selectedCell.cell_id}` : `Module ${selectedModule}`}</strong>
            </span>
            <button
              onClick={() => {
                if (onCellSelect) onCellSelect(null);
                if (onModuleSelect) onModuleSelect(null);
              }}
              className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-white text-[9px] font-bold"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
