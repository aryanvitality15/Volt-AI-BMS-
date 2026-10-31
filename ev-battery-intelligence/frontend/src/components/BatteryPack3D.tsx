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
  Info,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { CellTelemetry } from '../types';

// ==========================================
// 1. TOPOLOGY & VISUALIZATION MODE DEFINITIONS
// ==========================================
export type PackTopology =
  | '8S1P'
  | '12S1P'
  | '16S1P'
  | '16S2P'
  | '24S2P'
  | '32S2P'
  | '48S2P'
  | '32S4P'
  | 'CUSTOM';

export type VisualizationMode =
  | 'NORMAL'
  | 'PREDICTIVE_SOH'
  | 'THERMAL'
  | 'VOLTAGE_DISPERSION'
  | 'RUL'
  | 'EXPLODED'
  | 'CELL_INSPECT'
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
  '12S1P': {
    id: '12S1P',
    name: '12S1P Light Spec',
    series: 12,
    parallel: 1,
    totalCells: 12,
    modules: 2,
    cellsPerModule: 6,
    nominalVoltage: 38.4,
    capacityAh: 40.0,
    energyKwh: 1.536,
    description: '12 Series × 1 Parallel • 38.4V Light ESS / Micro-Mobility (2 Modules)'
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
    description: '16 Series × 1 Parallel • 51.2V 2.05 kWh Urban Mobility Spec (2 Modules)'
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
    description: '24 Series × 2 Parallel • 76.8V 6.14 kWh Performance Architecture (4 Modules)'
  },
  '32S2P': {
    id: '32S2P',
    name: '32S2P Commercial',
    series: 32,
    parallel: 2,
    totalCells: 64,
    modules: 4,
    cellsPerModule: 16,
    nominalVoltage: 102.4,
    capacityAh: 80.0,
    energyKwh: 8.192,
    description: '32 Series × 2 Parallel • 102.4V 8.19 kWh Commercial Delivery Van (4 Modules)'
  },
  '48S2P': {
    id: '48S2P',
    name: '48S2P Long-Range',
    series: 48,
    parallel: 2,
    totalCells: 96,
    modules: 8,
    cellsPerModule: 12,
    nominalVoltage: 153.6,
    capacityAh: 80.0,
    energyKwh: 12.288,
    description: '48 Series × 2 Parallel • 153.6V 12.29 kWh High-Voltage Passenger EV (8 Modules)'
  },
  '32S4P': {
    id: '32S4P',
    name: '32S4P Heavy Fleet',
    series: 32,
    parallel: 4,
    totalCells: 128,
    modules: 8,
    cellsPerModule: 16,
    nominalVoltage: 102.4,
    capacityAh: 160.0,
    energyKwh: 16.384,
    description: '32 Series × 4 Parallel • 102.4V 16.38 kWh Commercial Fleet & Bus Grade (8 Modules)'
  },
  'CUSTOM': {
    id: 'CUSTOM',
    name: 'Custom Architecture',
    series: 8,
    parallel: 1,
    totalCells: 8,
    modules: 2,
    cellsPerModule: 4,
    nominalVoltage: 25.6,
    capacityAh: 40.0,
    energyKwh: 1.024,
    description: 'Dynamic user-customized cell count & topology configuration'
  }
};

/**
 * Resolves a dynamic topology configuration matching user-customized cell count or incoming telemetry.
 */
export function resolveDynamicTopology(
  cellCount: number,
  customSeries?: number,
  customParallel?: number
): TopologyDetails {
  const count = Math.max(1, cellCount);
  let series = customSeries ?? count;
  let parallel = customParallel ?? 1;

  if (!customSeries) {
    if (count <= 16) {
      series = count;
      parallel = 1;
    } else if (count <= 32) {
      parallel = count % 2 === 0 ? 2 : 1;
      series = Math.floor(count / parallel);
    } else if (count <= 64) {
      parallel = 2;
      series = Math.floor(count / 2);
    } else if (count <= 96) {
      parallel = 2;
      series = Math.floor(count / 2);
    } else {
      parallel = 4;
      series = Math.floor(count / 4);
    }
  }

  const effectiveTotal = customSeries && customParallel ? customSeries * customParallel : count;

  let modules = 2;
  if (effectiveTotal <= 4) modules = 1;
  else if (effectiveTotal <= 8) modules = 2;
  else if (effectiveTotal <= 16) modules = 2;
  else if (effectiveTotal <= 32) modules = 4;
  else if (effectiveTotal <= 64) modules = 4;
  else if (effectiveTotal <= 96) modules = 8;
  else if (effectiveTotal <= 128) modules = 8;
  else modules = 12;

  const cellsPerModule = Math.ceil(effectiveTotal / modules);
  const nominalVoltage = series * 3.2;
  const capacityAh = 40.0 * parallel;
  const energyKwh = (nominalVoltage * capacityAh) / 1000.0;

  return {
    id: 'CUSTOM',
    name: `Custom ${series}S${parallel}P (${effectiveTotal} Cells)`,
    series,
    parallel,
    totalCells: effectiveTotal,
    modules,
    cellsPerModule,
    nominalVoltage: Number(nominalVoltage.toFixed(1)),
    capacityAh: Number(capacityAh.toFixed(1)),
    energyKwh: Number(energyKwh.toFixed(3)),
    description: `User-Configured Architecture: ${series} Series × ${parallel} Parallel (${modules} Modules, ${cellsPerModule} cells/mod)`
  };
}

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

export function getRulColor(rulCycles: number): THREE.Color {
  if (rulCycles >= 400) return new THREE.Color('#10b981'); // Long Horizon
  if (rulCycles >= 250) return new THREE.Color('#06b6d4'); // Nominal Horizon
  if (rulCycles >= 150) return new THREE.Color('#f59e0b'); // Warning Aging
  return new THREE.Color('#ef4444'); // Near EOL
}

export function getVoltageColor(voltage: number, avgVoltage: number = 3.28): THREE.Color {
  const delta = Math.abs(voltage - avgVoltage);
  if (delta >= 0.12) return new THREE.Color('#ef4444'); // Critical Imbalance
  if (delta >= 0.06) return new THREE.Color('#f59e0b'); // Warning Imbalance
  if (delta >= 0.02) return new THREE.Color('#06b6d4'); // Slight Deviation
  return new THREE.Color('#10b981'); // Balanced Nominal
}

// ==========================================
// 3. WEBGL ERROR BOUNDARY FOR ROBUST CRASH RECOVERY
// ==========================================
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class WebGLErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Three.js WebGL rendering error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center bg-[#030712] text-slate-300 p-6 space-y-4 rounded-2xl border border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-base font-orbitron font-extrabold text-white uppercase tracking-wider">
              3D WebGL Canvas Paused
            </h3>
            <p className="text-xs font-mono text-slate-400 max-w-md">
              The WebGL graphics pipeline recovered from an operating system driver context switch.
              Click the button below to restore the interactive 3D digital twin.
            </p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-orbitron font-bold text-xs shadow-lg transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-initialize 3D Viewport</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 4. CAMERA CONTROLLER COMPONENT
// ==========================================
interface CameraControllerProps {
  viewPreset: CameraViewPreset | null;
  onPresetComplete: () => void;
  selectedCellId: number | null;
  targetPosition: [number, number, number] | null;
  controlsRef: React.RefObject<any>;
  camScale?: number;
}

function CameraController({
  viewPreset,
  onPresetComplete,
  selectedCellId,
  targetPosition,
  controlsRef,
  camScale = 1.0
}: CameraControllerProps) {
  const { camera } = useThree();
  const isTransitioningRef = useRef<boolean>(false);
  const transitionEndTimeRef = useRef<number>(0);
  const prevCellIdRef = useRef<number | null>(null);
  const targetCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(3.8 * camScale, 3.2 * camScale, 4.4 * camScale));
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  // User input cancels camera animation
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const handleStart = () => {
      isTransitioningRef.current = false;
    };
    controls.addEventListener('start', handleStart);
    return () => {
      controls.removeEventListener('start', handleStart);
    };
  }, [controlsRef]);

  // View preset transitions scaled dynamically to pack dimensions
  useEffect(() => {
    if (viewPreset) {
      isTransitioningRef.current = true;
      transitionEndTimeRef.current = performance.now() + 850;
      const s = camScale;
      if (viewPreset === 'ISOMETRIC') {
        targetCamPosRef.current.set(3.8 * s, 3.2 * s, 4.4 * s);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'TOP') {
        targetCamPosRef.current.set(0, 6.2 * s, 0.01);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'FRONT') {
        targetCamPosRef.current.set(0, 1.2 * s, 5.2 * s);
        targetLookAtRef.current.set(0, 0, 0);
      } else if (viewPreset === 'SIDE') {
        targetCamPosRef.current.set(5.6 * s, 1.2 * s, 0);
        targetLookAtRef.current.set(0, 0, 0);
      }
    }
  }, [viewPreset, camScale]);

  // Focus transition on cell when target position changes
  useEffect(() => {
    if (selectedCellId !== null && selectedCellId !== prevCellIdRef.current && targetPosition) {
      prevCellIdRef.current = selectedCellId;
      isTransitioningRef.current = true;
      transitionEndTimeRef.current = performance.now() + 850;
      targetLookAtRef.current.set(targetPosition[0], 0.25, targetPosition[2]);
      targetCamPosRef.current.set(
        targetPosition[0] + 1.8,
        2.2,
        targetPosition[2] + 2.2
      );
    } else if (selectedCellId === null) {
      prevCellIdRef.current = null;
    }
  }, [selectedCellId, targetPosition]);

  useFrame((_, delta) => {
    if (isTransitioningRef.current) {
      const now = performance.now();
      if (now >= transitionEndTimeRef.current || camera.position.distanceTo(targetCamPosRef.current) < 0.04) {
        isTransitioningRef.current = false;
        onPresetComplete();
        return;
      }

      camera.position.lerp(targetCamPosRef.current, Math.min(delta * 4.5, 0.25));

      if (controlsRef.current) {
        controlsRef.current.target.lerp(targetLookAtRef.current, Math.min(delta * 4.5, 0.25));
        controlsRef.current.update();
      }
    }
  });

  return null;
}

// ==========================================
// 5. PRISMATIC CELL COMPONENT
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

  const voltVal = cell.voltage ?? 3.28;
  const tempVal = cell.temp_c ?? (cell as any).temperature ?? 26.0;
  const cellResistance = cell.internal_resistance_mohm ?? (cell as any).internal_resistance ?? 32.0;

  // Accurate individual cell SOH derived from resistance growth and voltage delta
  const computedCellSoh = useMemo(() => {
    if ((cell as any).soh !== undefined && (cell as any).soh !== null) {
      return Number((cell as any).soh);
    }
    const resistancePenalty = Math.max(0, ((cellResistance - 32.0) / 32.0) * 12.0);
    const voltageSagPenalty = Math.max(0, (Math.abs(voltVal - avgVoltage) / 0.08) * 6.0);
    return Math.max(50.0, Math.min(100.0, packSoh - resistancePenalty - voltageSagPenalty));
  }, [cell, cellResistance, voltVal, avgVoltage, packSoh]);

  const isFaultStatus = cell.health_status === 'CRITICAL' || cell.health_status === 'FAULT';
  const isCritical = tempVal >= 52 || Math.abs(voltVal - avgVoltage) >= 0.12;
  const isThermalFault = tempVal >= 42.0;
  const isVoltageFault = Math.abs(voltVal - avgVoltage) >= 0.050;
  const isProblemHighlight = Boolean(
    isHighlighted &&
    highlightReason &&
    (highlightReason.toLowerCase().includes('fault') ||
     highlightReason.toLowerCase().includes('defect') ||
     highlightReason.toLowerCase().includes('overheat') ||
     highlightReason.toLowerCase().includes('warning') ||
     highlightReason.toLowerCase().includes('imbalance'))
  );

  const isProblematic = isFaultStatus || isCritical || isThermalFault || isVoltageFault || isProblemHighlight;

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

    if (mode === 'HEALTH' || mode === 'PREDICTIVE_SOH') {
      const color = getHealthColor(computedCellSoh);
      return (
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={computedCellSoh < 80 ? 1.4 : 0.7}
          metalness={0.5}
          roughness={0.2}
        />
      );
    }

    if (mode === 'RUL') {
      const rulCycles = (cell as any).predicted_rul ?? (computedCellSoh > 85 ? 450 : computedCellSoh > 80 ? 280 : 120);
      const rulColor = getRulColor(rulCycles);
      return (
        <meshStandardMaterial
          color={rulColor}
          emissive={rulColor}
          emissiveIntensity={rulCycles < 200 ? 1.5 : 0.75}
          metalness={0.5}
          roughness={0.2}
        />
      );
    }

    if (mode === 'ELECTRICAL' || mode === 'VOLTAGE_DISPERSION') {
      const voltColor = getVoltageColor(voltVal, avgVoltage);
      return (
        <meshStandardMaterial
          color="#1e293b"
          emissive={voltColor}
          emissiveIntensity={isSelected ? 1.5 : 0.65}
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

    // NORMAL / EXPLODED / CELL_INSPECT: Metallic Anodized PET Film
    return (
      <meshStandardMaterial
        color={isSelected ? '#0284c7' : isHovered ? '#1e40af' : '#0f2952'}
        emissive={isSelected ? '#38bdf8' : isHovered ? '#06b6d4' : '#0369a1'}
        emissiveIntensity={isSelected ? 1.2 : isHovered ? 0.7 : 0.22}
        metalness={0.85}
        roughness={0.22}
      />
    );
  }, [mode, tempVal, voltVal, computedCellSoh, isSelected, isHovered, isCritical, isProblematic, avgVoltage, cell]);

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
      {/* 1. Main Prismatic Aluminum Casing */}
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

      {/* 2. Laser-Welded Top Header Plate */}
      <mesh position={[0, h / 2 + 0.01, 0]}>
        <boxGeometry args={[w * 0.96, 0.018, d * 0.94]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.12} />
      </mesh>

      {/* 3. Positive Terminal Post (Copper + Red Ring) */}
      <group position={[-w * 0.24, h / 2 + 0.035, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[w * 0.14, w * 0.14, 0.045, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[0, -0.018, 0]}>
          <cylinderGeometry args={[w * 0.18, w * 0.18, 0.012, 16]} />
          <meshStandardMaterial color="#dc2626" roughness={0.3} />
        </mesh>
      </group>

      {/* 4. Negative Terminal Post (Nickel Plated + Black Ring) */}
      <group position={[w * 0.24, h / 2 + 0.035, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[w * 0.14, w * 0.14, 0.045, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
        </mesh>
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

      {/* 8. 3D Warning Beacon Graphic for Problematic / Defective Cell */}
      {isProblematic && (
        <group position={[0, h / 2 + 0.04, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[w * 0.35, w * 0.48, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[w * 0.48, w * 0.62, 32]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.5} />
          </mesh>

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

      {/* 9. Floating Cell Badge for Selected or Hovered Cell */}
      {(isSelected || isHovered) && !isProblematic && (
        <Html position={[0, h / 2 + 0.08, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
          <div
            className={`pointer-events-none select-none font-mono text-[9.5px] font-bold px-2.5 py-1.5 rounded-xl backdrop-blur-md border transition-all whitespace-nowrap shadow-2xl flex flex-col gap-0.5 ${
              isSelected
                ? 'bg-cyan-950/95 text-cyan-200 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.8)]'
                : 'bg-[#040911]/95 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
            }`}
          >
            <div className="flex items-center gap-1.5 border-b border-white/10 pb-0.5">
              <span className="text-white font-extrabold">CELL #{cell.cell_id}</span>
              <span className="text-[8px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                SOH: {computedCellSoh.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-slate-300 pt-0.5">
              <span>{voltVal.toFixed(3)}V</span>
              <span>•</span>
              <span className={tempVal > 34 ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                {tempVal.toFixed(1)}°C
              </span>
              <span>•</span>
              <span>{cellResistance.toFixed(1)}mΩ</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ==========================================
// 6. SERIES COPPER BUSBAR CONNECTOR
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
  const busbarYOffset = explodeFactor * 0.85;

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
      {/* Laser-Weld Connection Terminals */}
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
// 7. INTER-MODULE HIGH-VOLTAGE BRIDGE CONDUIT
// ==========================================
function InterModuleBusbar({
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
  const busbarYOffset = explodeFactor * 0.75;
  const midX = (startPos[0] + endPos[0]) / 2;
  const midY = (startPos[1] + endPos[1]) / 2 + busbarYOffset + 0.035;
  const midZ = (startPos[2] + endPos[2]) / 2;

  const dx = endPos[0] - startPos[0];
  const dz = endPos[2] - startPos[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  const isElectrical = mode === 'ELECTRICAL';

  return (
    <group position={[midX, midY, midZ]} rotation={[0, -angle, 0]}>
      <mesh castShadow>
        <boxGeometry args={[length + 0.06, 0.024, 0.045]} />
        <meshStandardMaterial
          color="#ea580c"
          emissive="#f97316"
          emissiveIntensity={isElectrical ? 2.2 : 0.8}
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>
      <mesh position={[-length / 2, 0.015, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.1} />
      </mesh>
      <mesh position={[length / 2, 0.015, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.96} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ==========================================
// 8. MODULAR BATTERY BANK & ENCLOSURE ASSEMBLY
// Supports dynamic 2D grid geometry for EVERY topology preset & custom hardware counts
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
  const numModules = Math.max(1, topology.modules);
  const cellsPerModule = Math.max(1, topology.cellsPerModule);

  // Dynamic 2D module grid arrangement (cols along X, rows along Z)
  const { modCols, modRows } = useMemo(() => {
    if (numModules <= 1) return { modCols: 1, modRows: 1 };
    if (numModules === 2) return { modCols: 2, modRows: 1 };
    if (numModules === 3) return { modCols: 3, modRows: 1 };
    if (numModules === 4) return { modCols: 2, modRows: 2 };
    if (numModules === 6) return { modCols: 3, modRows: 2 };
    if (numModules === 8) return { modCols: 4, modRows: 2 };
    const cols = Math.ceil(Math.sqrt(numModules));
    const rows = Math.ceil(numModules / cols);
    return { modCols: cols, modRows: rows };
  }, [numModules]);

  // Dimensional parameters for realistic EV battery cells
  const cellW = 0.28;
  const cellH = 0.85;
  const cellD = 0.16;
  const cellGapZ = 0.035;

  const moduleDepth = cellsPerModule * (cellD + cellGapZ) + 0.12;
  const moduleWidth = cellW + 0.10;
  const moduleGapX = 0.22;
  const moduleGapZ = 0.26;

  const totalGridWidth = modCols * moduleWidth + (modCols - 1) * moduleGapX;
  const totalGridDepth = modRows * moduleDepth + (modRows - 1) * moduleGapZ;

  const packWidth = totalGridWidth + 0.40;
  const packLength = totalGridDepth + 0.70; // Additional forward bay for BDU
  const trayHeight = 0.14;

  // Exploded layer offsets
  const topCoverY = cellH / 2 + 0.08 + explodeFactor * 1.65;
  const bottomTrayY = -cellH / 2 - 0.06 - explodeFactor * 0.75;
  const coldPlateY = -cellH / 2 - 0.02 - explodeFactor * 0.35;

  // Generate dynamic 2D grid cell positions mapped across all modules
  const { cellLayout, moduleLayout } = useMemo(() => {
    const cellsList: Array<{
      cell: CellTelemetry;
      moduleIndex: number;
      localIndex: number;
      pos: [number, number, number];
      termPosA: [number, number, number];
      termPosB: [number, number, number];
    }> = [];

    const modulesList: Array<{
      moduleIndex: number;
      pos: [number, number, number];
      col: number;
      row: number;
    }> = [];

    for (let m = 0; m < numModules; m++) {
      const col = m % modCols;
      const row = Math.floor(m / modCols);

      const modX = (col - (modCols - 1) / 2) * (moduleWidth + moduleGapX);
      const modZ = (row - (modRows - 1) / 2) * (moduleDepth + moduleGapZ) - 0.18;

      modulesList.push({
        moduleIndex: m + 1,
        pos: [modX, 0, modZ],
        col,
        row
      });

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

        const cz = modZ + startZ + c * (cellD + cellGapZ);
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

        cellsList.push({
          cell: { ...cellData, cell_id: cellId },
          moduleIndex: m + 1,
          localIndex: c,
          pos,
          termPosA,
          termPosB
        });
      }
    }

    return { cellLayout: cellsList, moduleLayout: modulesList };
  }, [
    numModules,
    modCols,
    modRows,
    cellsPerModule,
    totalCells,
    cells,
    moduleWidth,
    moduleDepth,
    moduleGapX,
    moduleGapZ,
    cellW,
    cellH,
    cellD,
    cellGapZ
  ]);

  return (
    <group position={[0, 0, 0]}>
      {/* ======================================================== */}
      {/* 1. LOWER STRUCTURAL TRAY ENCLOSURE & CRASH SILLS         */}
      {/* Dynamically dimensioned to fit any 2D module grid        */}
      {/* ======================================================== */}
      <group position={[0, bottomTrayY, 0]}>
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

        {/* Internal Longitudinal Shear Beams separating Module Columns */}
        {Array.from({ length: Math.max(0, modCols - 1) }).map((_, i) => {
          const startX = -((modCols - 1) * (moduleWidth + moduleGapX)) / 2;
          const beamX = startX + i * (moduleWidth + moduleGapX) + (moduleWidth + moduleGapX) / 2;
          return (
            <mesh key={`beam-x-${i}`} position={[beamX, trayHeight * 0.35, 0]}>
              <boxGeometry args={[0.045, trayHeight * 0.9, packLength - 0.2]} />
              <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.2} />
              <Edges color="#38bdf8" threshold={20} opacity={0.3} transparent />
            </mesh>
          );
        })}

        {/* Internal Transverse Shear Beams separating Module Rows */}
        {Array.from({ length: Math.max(0, modRows - 1) }).map((_, i) => {
          const startZ = -((modRows - 1) * (moduleDepth + moduleGapZ)) / 2 - 0.18;
          const beamZ = startZ + i * (moduleDepth + moduleGapZ) + (moduleDepth + moduleGapZ) / 2;
          return (
            <mesh key={`beam-z-${i}`} position={[0, trayHeight * 0.35, beamZ]}>
              <boxGeometry args={[packWidth - 0.1, trayHeight * 0.9, 0.045]} />
              <meshStandardMaterial color="#334155" metalness={0.95} roughness={0.2} />
              <Edges color="#38bdf8" threshold={20} opacity={0.3} transparent />
            </mesh>
          );
        })}
      </group>

      {/* ======================================================== */}
      {/* 2. LIQUID COOLING COLD PLATE WITH SERPENTINE CHANNELS    */}
      {/* ======================================================== */}
      <group position={[0, coldPlateY, 0]}>
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

        {/* Serpentine Coolant Flow Ribs / Microchannels across grid */}
        {Array.from({ length: Math.max(6, modRows * 4) }).map((_, i) => {
          const zOffset = -packLength * 0.42 + (i * packLength * 0.84) / Math.max(5, modRows * 4 - 1);
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
      {/* 3. BATTERY MODULE FRAMES & SIDE COMPRESSION TIE-RODS     */}
      {/* ======================================================== */}
      {moduleLayout.map((mod) => {
        const isModuleSelected = selectedModuleId === mod.moduleIndex;
        const modX = mod.pos[0];
        const modZ = mod.pos[2];

        return (
          <group
            key={`module-${mod.moduleIndex}`}
            position={[modX, explodeFactor * 0.18, modZ]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectModule(mod.moduleIndex);
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

            {/* Slave BMS Telemetry Module Header & Status Indicator */}
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
      {/* 4. INDIVIDUAL PRISMATIC BATTERY CELLS                    */}
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
      {/* 5. ELECTRICAL BUSBARS & INTERCONNECTS                    */}
      {/* Intra-module series busbars + inter-module bridge cables */}
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

      {/* Inter-Module High-Voltage Bridge Cables across adjacent modules */}
      {moduleLayout.map((mod, mi) => {
        if (mi < moduleLayout.length - 1) {
          const currentLastCell = cellLayout.find(
            (c) => c.moduleIndex === mod.moduleIndex && c.localIndex === cellsPerModule - 1
          );
          const nextFirstCell = cellLayout.find(
            (c) => c.moduleIndex === moduleLayout[mi + 1].moduleIndex && c.localIndex === 0
          );
          if (currentLastCell && nextFirstCell) {
            return (
              <InterModuleBusbar
                key={`intermod-${mod.moduleIndex}-${moduleLayout[mi + 1].moduleIndex}`}
                startPos={currentLastCell.termPosB}
                endPos={nextFirstCell.termPosA}
                explodeFactor={explodeFactor}
                mode={mode}
              />
            );
          }
        }
        return null;
      })}

      {/* ======================================================== */}
      {/* 6. HIGH VOLTAGE DISTRIBUTION & MASTER BDU JUNCTION BOX   */}
      {/* ======================================================== */}
      <group position={[0, explodeFactor * 0.6, totalGridDepth / 2 + 0.16]}>
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
        <mesh position={[0, 0.04, -packLength * 0.22]}>
          <boxGeometry args={[0.065, 0.035, packLength * 0.44]} />
          <meshStandardMaterial
            color="#ea580c"
            emissive="#f97316"
            emissiveIntensity={mode === 'ELECTRICAL' ? 2.0 : 1.2}
          />
        </mesh>
      </group>

      {/* ======================================================== */}
      {/* 7. UPPER ENCLOSURE LID & PRESSURE EQUALIZATION VALVE     */}
      {/* ======================================================== */}
      <group position={[0, topCoverY, 0]}>
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

        {/* High Voltage Hazard Warning Placard */}
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
// 9. PRIMARY BATTERY PACK 3D COMPONENT
// ==========================================
export interface BatteryPack3DProps {
  cells?: CellTelemetry[];
  packCurrent?: number;
  packVoltage?: number;
  packSoh?: number;
  activeTopology?: PackTopology;
  customCellCount?: number;
  customSeries?: number;
  customParallel?: number;
  onTopologyChange?: (
    t: PackTopology,
    customCount?: number,
    series?: number,
    parallel?: number
  ) => void;
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
  dataSource?: string;
  isValidated?: boolean;
}

export const BatteryPack3D: React.FC<BatteryPack3DProps> = ({
  cells = [],
  packCurrent = 14.5,
  packVoltage = 25.6,
  packSoh = 87.4,
  activeTopology = '8S1P',
  customCellCount = 8,
  customSeries = 8,
  customParallel = 1,
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
  highlightReason,
  dataSource = 'MQTT_TELEMETRY',
  isValidated = true
}) => {
  const [internalTopology, setInternalTopology] = useState<PackTopology>(activeTopology);
  const [internalCustomCount, setInternalCustomCount] = useState<number>(customCellCount || 8);
  const [internalSeries, setInternalSeries] = useState<number>(customSeries || 8);
  const [internalParallel, setInternalParallel] = useState<number>(customParallel || 1);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState<boolean>(false);
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
    if (customCellCount && customCellCount !== internalCustomCount) {
      setInternalCustomCount(customCellCount);
    }
  }, [customCellCount]);

  useEffect(() => {
    if (customSeries && customSeries !== internalSeries) {
      setInternalSeries(customSeries);
    }
  }, [customSeries]);

  useEffect(() => {
    if (customParallel && customParallel !== internalParallel) {
      setInternalParallel(customParallel);
    }
  }, [customParallel]);

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

  // Determine active topology details: preset or user-configured
  const topoInfo = useMemo(() => {
    if (internalTopology === 'CUSTOM') {
      return resolveDynamicTopology(internalCustomCount, internalSeries, internalParallel);
    }
    return TOPOLOGY_PRESETS[internalTopology] || TOPOLOGY_PRESETS['8S1P'];
  }, [internalTopology, internalCustomCount, internalSeries, internalParallel]);

  const applyTopologyChange = (
    topo: PackTopology,
    count?: number,
    s?: number,
    p?: number
  ) => {
    setInternalTopology(topo);
    if (count !== undefined) setInternalCustomCount(count);
    if (s !== undefined) setInternalSeries(s);
    if (p !== undefined) setInternalParallel(p);
    if (onTopologyChange) {
      onTopologyChange(topo, count, s, p);
    }
  };

  const applyModeChange = (m: VisualizationMode) => {
    setInternalMode(m);
    if (onModeChange) onModeChange(m);
  };

  // Dynamic Camera Scaling based on pack dimensions
  const camScale = useMemo(() => {
    const total = topoInfo.totalCells;
    if (total <= 8) return 1.0;
    if (total <= 16) return 1.15;
    if (total <= 32) return 1.35;
    if (total <= 64) return 1.6;
    if (total <= 96) return 1.9;
    return 2.2;
  }, [topoInfo.totalCells]);

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
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    if (onCellSelect) onCellSelect(null);
    if (onModuleSelect) onModuleSelect(null);
  };

  // Compute exact target position for camera controller based on selected cell
  const selectedCellWorldPos = useMemo((): [number, number, number] | null => {
    if (!selectedCell) return null;
    const numMods = topoInfo.modules;
    const cellsPerMod = topoInfo.cellsPerModule;
    let modCols = 2;
    let modRows = 1;
    if (numMods <= 1) { modCols = 1; modRows = 1; }
    else if (numMods === 2) { modCols = 2; modRows = 1; }
    else if (numMods === 4) { modCols = 2; modRows = 2; }
    else if (numMods === 6) { modCols = 3; modRows = 2; }
    else if (numMods === 8) { modCols = 4; modRows = 2; }
    else {
      modCols = Math.ceil(Math.sqrt(numMods));
      modRows = Math.ceil(numMods / modCols);
    }

    const cellW = 0.28;
    const cellD = 0.16;
    const cellGapZ = 0.035;
    const moduleDepth = cellsPerMod * (cellD + cellGapZ) + 0.12;
    const moduleWidth = cellW + 0.10;
    const moduleGapX = 0.22;
    const moduleGapZ = 0.26;

    const globalIdx = selectedCell.cell_id - 1;
    const m = Math.floor(globalIdx / cellsPerMod);
    const c = globalIdx % cellsPerMod;

    const col = m % modCols;
    const row = Math.floor(m / modCols);

    const modX = (col - (modCols - 1) / 2) * (moduleWidth + moduleGapX);
    const modZ = (row - (modRows - 1) / 2) * (moduleDepth + moduleGapZ) - 0.18;
    const startZ = -((cellsPerMod - 1) * (cellD + cellGapZ)) / 2;
    const cz = modZ + startZ + c * (cellD + cellGapZ);

    return [modX, 0, cz];
  }, [selectedCell, topoInfo]);

  return (
    <WebGLErrorBoundary>
      <div className="w-full h-full min-h-[440px] sm:min-h-[540px] lg:min-h-[620px] rounded-2xl overflow-hidden bg-[#030712] border border-white/10 shadow-2xl relative select-none">
        {/* WebGL 3D Canvas */}
        <Canvas
          camera={{ position: [3.8 * camScale, 3.2 * camScale, 4.4 * camScale], fov: 38 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
          }}
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
            makeDefault
            enableDamping
            dampingFactor={0.06}
            autoRotate={autoRotate}
            autoRotateSpeed={1.0}
            minDistance={1.4}
            maxDistance={24.0}
            maxPolarAngle={Math.PI / 2 + 0.15}
          />

          <CameraController
            viewPreset={viewPreset}
            onPresetComplete={() => setViewPreset(null)}
            selectedCellId={selectedCell?.cell_id ?? null}
            targetPosition={selectedCellWorldPos}
            controlsRef={controlsRef}
            camScale={camScale}
          />

          {/* 3D Dynamic Geometry Battery Pack System */}
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

          {/* Ground Soft Contact Shadow */}
          <ContactShadows
            position={[0, -1.25, 0]}
            opacity={0.65}
            scale={Math.max(16, topoInfo.totalCells > 32 ? 26 : 16)}
            blur={2.4}
            far={6.0}
            color="#0284c7"
          />
        </Canvas>

        {/* ======================================================== */}
        {/* FLOATING HUD CONTROLS: TOP-BAR STATUS & TELEMETRY BADGE  */}
        {/* ======================================================== */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto z-10">
          {/* Left: Pack Topology & Real-Time Verified Origin Badge */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-white/10 shadow-xl">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-orbitron text-[10px] font-bold border ${
                isLiveConnected
                  ? dataSource === 'MQTT_TELEMETRY'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLiveConnected
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {isLiveConnected
                  ? dataSource === 'MQTT_TELEMETRY'
                    ? 'LIVE MQTT BROKER'
                    : 'HARDWARE VALIDATED'
                  : 'SIMULATOR MODE'}
              </span>
            </div>

            {isValidated && isLiveConnected && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>LFP VERIFIED</span>
              </span>
            )}

            {/* Clickable Customizer Badge */}
            <button
              onClick={() => setIsCustomizerOpen(!isCustomizerOpen)}
              className="px-2.5 py-1 text-[10px] font-mono rounded-lg hover:bg-white/10 text-slate-300 transition-all flex items-center gap-1.5 cursor-pointer border border-transparent hover:border-cyan-500/30 group"
              title="Click to customize cell count & pack architecture"
            >
              <Sliders className="w-3 h-3 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
              <strong className="text-white">{topoInfo.series}S{topoInfo.parallel}P</strong>
              <span className="text-cyan-300">({topoInfo.totalCells} Cells)</span>
              <span>•</span>
              <span>{topoInfo.nominalVoltage.toFixed(1)}V</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{topoInfo.energyKwh.toFixed(2)} kWh</span>
              <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-bold ml-1">
                {isCustomizerOpen ? 'Close ✕' : 'Customize ⚙️'}
              </span>
            </button>
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
                autoRotate
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
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
        {/* INTERACTIVE CELL & TOPOLOGY CUSTOMIZER POPOVER (3D HUD)  */}
        {/* ======================================================== */}
        {isCustomizerOpen && (
          <div className="absolute top-16 left-3 w-80 sm:w-[420px] max-w-[calc(100vw-24px)] p-4 rounded-2xl bg-[#040913]/95 backdrop-blur-2xl border border-cyan-500/40 shadow-[0_12px_45px_rgba(0,0,0,0.85)] z-20 space-y-3.5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span className="font-orbitron font-extrabold text-xs text-white uppercase tracking-wider">
                  BATTERY CELL & ARCHITECTURE CUSTOMIZER
                </span>
              </div>
              <button
                onClick={() => setIsCustomizerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Topology Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                INTEGRATED CELL PRESETS:
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['8S1P', '16S1P', '16S2P', '24S2P', '32S2P', '48S2P', '32S4P', 'CUSTOM'] as PackTopology[]).map((t) => {
                  const isCur = internalTopology === t;
                  const label =
                    t === '8S1P' ? '8 Cells' :
                    t === '16S1P' ? '16 Cells' :
                    t === '16S2P' ? '32 Cells' :
                    t === '24S2P' ? '48 Cells' :
                    t === '32S2P' ? '64 Cells' :
                    t === '48S2P' ? '96 Cells' :
                    t === '32S4P' ? '128 Cells' : 'Free Slider';
                  return (
                    <button
                      key={`btn-topo-${t}`}
                      onClick={() => {
                        if (t !== 'CUSTOM') {
                          const p = TOPOLOGY_PRESETS[t];
                          applyTopologyChange(t, p.totalCells, p.series, p.parallel);
                        } else {
                          applyTopologyChange('CUSTOM', internalCustomCount, internalSeries, internalParallel);
                        }
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[9.5px] font-mono font-bold transition-all text-center ${
                        isCur
                          ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      }`}
                    >
                      <div className="truncate">{t}</div>
                      <div className="text-[8px] opacity-75">{label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Total Cell Slider */}
            <div className="p-3 rounded-xl bg-black/60 border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">Customize Cell Quantity:</span>
                <span className="text-cyan-400 font-orbitron font-extrabold text-sm">
                  {topoInfo.totalCells} CELLS
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="128"
                step="2"
                value={topoInfo.totalCells}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  const p = val > 32 ? 2 : 1;
                  const s = Math.round(val / p);
                  applyTopologyChange('CUSTOM', val, s, p);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                <span>4 Cells</span>
                <span>32 Cells</span>
                <span>64 Cells</span>
                <span>96 Cells</span>
                <span>128 Cells</span>
              </div>
            </div>

            {/* Predictive Model View Modes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                VISUALIZE PREDICTIVE MODELS IN 3D:
              </span>
              <div className="grid grid-cols-3 gap-1.5 text-[9px] font-mono font-bold">
                {[
                  { id: 'NORMAL', label: '📦 Photoreal 3D' },
                  { id: 'PREDICTIVE_SOH', label: '💚 SOH Horizon' },
                  { id: 'THERMAL', label: '🌡️ Thermal Runaway' },
                  { id: 'VOLTAGE_DISPERSION', label: '⚡ Voltage Sag' },
                  { id: 'RUL', label: '⏳ RUL Bottleneck' },
                  { id: 'XRAY', label: '👁️ X-Ray Strata' }
                ].map((mBtn) => {
                  const isAct = internalMode === mBtn.id;
                  return (
                    <button
                      key={mBtn.id}
                      onClick={() => applyModeChange(mBtn.id as VisualizationMode)}
                      className={`p-1.5 rounded-lg border transition-all text-center ${
                        isAct
                          ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent hover:text-white'
                      }`}
                    >
                      {mBtn.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Electrical Specs Box */}
            <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-500 block text-[8px]">VOLTAGE</span>
                <strong className="text-white text-xs">{topoInfo.nominalVoltage.toFixed(1)}V</strong>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-500 block text-[8px]">CAPACITY</span>
                <strong className="text-cyan-300 text-xs">{topoInfo.capacityAh.toFixed(0)} Ah</strong>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                <span className="text-slate-500 block text-[8px]">ENERGY</span>
                <strong className="text-emerald-400 text-xs">{topoInfo.energyKwh.toFixed(2)} kWh</strong>
              </div>
            </div>

            <div className="text-[9.5px] font-mono text-slate-400 flex items-center justify-between px-1">
              <span>Arrangement: <strong className="text-white">{topoInfo.modules} modules</strong> ({topoInfo.cellsPerModule} cells/ea)</span>
              <button
                onClick={() => setIsCustomizerOpen(false)}
                className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-orbitron text-[9.5px] shadow-lg"
              >
                APPLY & CLOSE
              </button>
            </div>
          </div>
        )}



        {/* ======================================================== */}
        {/* FLOATING HUD CONTROLS: BOTTOM-BAR EXPLODED VIEW SLIDER   */}
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

          {/* Interactive Selection Target Indicator */}
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
    </WebGLErrorBoundary>
  );
};
