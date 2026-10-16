import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows, Html, Edges } from '@react-three/drei';
import * as THREE from 'three';
import {
  RotateCcw,
  Sparkles,
  Maximize2,
  Flame,
  Zap,
  Layers,
  Eye,
  Activity,
  Cpu,
  Radio,
  ChevronRight,
  ArrowLeft,
  ShieldAlert,
  Thermometer,
  Gauge,
  Compass,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CellTelemetry } from '../types';

// ==========================================
// 1. TOPOLOGY & RENDER MODE DEFINITIONS
// ==========================================
export type PackTopology = '8S1P' | '16S1P' | '16S2P' | '24S2P' | '32S4P';
export type RenderMode = 'REALISTIC' | 'THERMAL' | 'XRAY' | 'VOLTAGE';
export type DrillStage = 'CHASSIS' | 'PACK_MODULE' | 'SINGLE_CELL';

export interface TopologyDetails {
  id: PackTopology;
  name: string;
  series: number;
  parallel: number;
  totalCells: number;
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
    nominalVoltage: 25.6,
    capacityAh: 40.0,
    energyKwh: 1.024,
    description: '8 Series × 1 Parallel • Standard LFP 25.6V Reference Pack'
  },
  '16S1P': {
    id: '16S1P',
    name: '16S1P Medium',
    series: 16,
    parallel: 1,
    totalCells: 16,
    nominalVoltage: 51.2,
    capacityAh: 40.0,
    energyKwh: 2.048,
    description: '16 Series × 1 Parallel • 51.2V 2.05 kWh Urban Mobility'
  },
  '16S2P': {
    id: '16S2P',
    name: '16S2P Dual-Bank',
    series: 16,
    parallel: 2,
    totalCells: 32,
    nominalVoltage: 51.2,
    capacityAh: 80.0,
    energyKwh: 4.096,
    description: '16 Series × 2 Parallel • 51.2V 4.10 kWh Light EV Platform'
  },
  '24S2P': {
    id: '24S2P',
    name: '24S2P High-Energy',
    series: 24,
    parallel: 2,
    totalCells: 48,
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
    nominalVoltage: 102.4,
    capacityAh: 160.0,
    energyKwh: 16.384,
    description: '32 Series × 4 Parallel • 102.4V 16.38 kWh Commercial EV Spec'
  }
};

// Thermal Color Mapping Helper
function getThermalColor(tempC: number): THREE.Color {
  // 24°C Blue -> 30°C Emerald -> 36°C Amber -> 45°C+ Red
  if (tempC >= 46) return new THREE.Color('#ef4444');
  if (tempC >= 40) return new THREE.Color('#f97316');
  if (tempC >= 34) return new THREE.Color('#f59e0b');
  if (tempC >= 28) return new THREE.Color('#10b981');
  return new THREE.Color('#06b6d4');
}

// Voltage Delta Color Mapping Helper
function getVoltageColor(voltage: number): THREE.Color {
  // 3.15V (rose) -> 3.22V (amber) -> 3.28V (green) -> 3.35V+ (cyan)
  if (voltage >= 3.34) return new THREE.Color('#06b6d4');
  if (voltage >= 3.24) return new THREE.Color('#10b981');
  if (voltage >= 3.16) return new THREE.Color('#f59e0b');
  return new THREE.Color('#f43f5e');
}

// ==========================================
// 2. STAGE 1: TRANSLUCENT EV CHASSIS SKATEBOARD
// ==========================================
interface EVChassisGhostProps {
  visible: boolean;
  opacity: number;
  onSelectPack: () => void;
  hoveredPack: boolean;
  setHoveredPack: (h: boolean) => void;
}

function EVChassisGhost({
  visible,
  opacity,
  onSelectPack,
  hoveredPack,
  setHoveredPack
}: EVChassisGhostProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const targetScale = visible ? 1 : 0.85;
    groupRef.current.scale.x = THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4, delta);
    groupRef.current.scale.y = THREE.MathUtils.damp(groupRef.current.scale.y, targetScale, 4, delta);
    groupRef.current.scale.z = THREE.MathUtils.damp(groupRef.current.scale.z, targetScale, 4, delta);
  });

  if (!visible && opacity < 0.02) return null;

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Aerodynamic Ghost Car Body Shell */}
      <group position={[0, 0.45, 0]}>
        {/* Main Body Fuselage & Hood */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[4.8, 0.55, 1.95]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={opacity * 0.14}
            roughness={0.15}
            metalness={0.1}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
            depthWrite={false}
          />
          <Edges color="#38bdf8" threshold={20} opacity={opacity * 0.45} transparent />
        </mesh>

        {/* Aerodynamic Cabin Roof & Pillars */}
        <mesh position={[0.2, 0.72, 0]}>
          <boxGeometry args={[2.5, 0.48, 1.6]} />
          <meshPhysicalMaterial
            color="#60a5fa"
            transparent
            opacity={opacity * 0.12}
            roughness={0.1}
            metalness={0.05}
            clearcoat={1.0}
            depthWrite={false}
          />
          <Edges color="#60a5fa" threshold={18} opacity={opacity * 0.5} transparent />
        </mesh>

        {/* Front & Rear Windshield Slopes */}
        <mesh position={[-1.25, 0.52, 0]} rotation={[0, 0, Math.PI / 4.5]}>
          <boxGeometry args={[0.04, 0.65, 1.58]} />
          <meshPhysicalMaterial color="#93c5fd" transparent opacity={opacity * 0.25} depthWrite={false} />
        </mesh>
        <mesh position={[1.65, 0.52, 0]} rotation={[0, 0, -Math.PI / 4.8]}>
          <boxGeometry args={[0.04, 0.68, 1.58]} />
          <meshPhysicalMaterial color="#93c5fd" transparent opacity={opacity * 0.25} depthWrite={false} />
        </mesh>

        {/* Front Sculpted Nose Cone */}
        <mesh position={[-2.5, 0.12, 0]}>
          <boxGeometry args={[0.3, 0.35, 1.85]} />
          <meshPhysicalMaterial color="#38bdf8" transparent opacity={opacity * 0.18} depthWrite={false} />
          <Edges color="#38bdf8" threshold={15} opacity={opacity * 0.4} transparent />
        </mesh>
      </group>

      {/* 4 Detailed Alloy Wheels with Rubber Tires & Brake Calipers */}
      {[
        [-1.7, -0.15, 1.05],
        [1.7, -0.15, 1.05],
        [-1.7, -0.15, -1.05],
        [1.7, -0.15, -1.05]
      ].map(([wx, wy, wz], i) => (
        <group key={i} position={[wx, wy, wz]}>
          {/* Rubber Tire */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.42, 0.42, 0.24, 28]} />
            <meshStandardMaterial
              color="#0f172a"
              roughness={0.75}
              metalness={0.2}
              transparent
              opacity={opacity * 0.9}
            />
          </mesh>
          {/* Machined Multi-Spoke Alloy Rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.26, 0.26, 0.245, 20]} />
            <meshStandardMaterial
              color="#94a3b8"
              metalness={0.95}
              roughness={0.15}
              transparent
              opacity={opacity * 0.95}
            />
          </mesh>
          {/* Wheel Hub Cap (Cyan Glow) */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, wz > 0 ? 0.13 : -0.13]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={1.2}
              transparent
              opacity={opacity}
            />
          </mesh>
          {/* Cyan High-Performance Brake Caliper */}
          <mesh position={[0.16, 0.12, wz > 0 ? 0.05 : -0.05]}>
            <boxGeometry args={[0.14, 0.16, 0.12]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.8} roughness={0.2} transparent opacity={opacity} />
          </mesh>
          {/* Suspension Wishbone / Strut */}
          <mesh position={[0, 0.35, wz > 0 ? -0.12 : 0.12]} rotation={[0, 0, wz > 0 ? 0.1 : -0.1]}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 12]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.3} transparent opacity={opacity * 0.8} />
          </mesh>
        </group>
      ))}

      {/* Front and Rear High-Output Electric Drive Units (Motors & Inverters) */}
      <group position={[-1.7, -0.12, 0]}>
        <mesh>
          <cylinderGeometry args={[0.26, 0.26, 0.72, 20]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} transparent opacity={opacity * 0.9} />
          <Edges color="#38bdf8" threshold={25} opacity={opacity * 0.5} transparent />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.32, 0.22, 0.42]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.2} transparent opacity={opacity * 0.9} />
        </mesh>
      </group>

      <group position={[1.7, -0.12, 0]}>
        <mesh>
          <cylinderGeometry args={[0.28, 0.28, 0.82, 20]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.2} transparent opacity={opacity * 0.9} />
          <Edges color="#38bdf8" threshold={25} opacity={opacity * 0.5} transparent />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.36, 0.24, 0.48]} />
          <meshStandardMaterial color="#334155" metalness={0.85} roughness={0.2} transparent opacity={opacity * 0.9} />
        </mesh>
      </group>

      {/* Central High-Voltage (HV) Orange Bus Conduit Spine */}
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[3.2, 0.045, 0.06]} />
        <meshStandardMaterial
          color="#ea580c"
          emissive="#f97316"
          emissiveIntensity={1.2}
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={opacity}
        />
      </mesh>

      {/* Structural Floor-Mounted Skateboard Battery Enclosure Perimeter */}
      <group
        position={[0, -0.22, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectPack();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPack(true);
        }}
        onPointerOut={() => setHoveredPack(false)}
      >
        {/* Structural Underfloor Tray */}
        <mesh receiveShadow>
          <boxGeometry args={[2.7, 0.16, 1.45]} />
          <meshStandardMaterial
            color={hoveredPack ? '#0f172a' : '#090d16'}
            metalness={0.95}
            roughness={0.12}
            emissive={hoveredPack ? '#0284c7' : '#0369a1'}
            emissiveIntensity={hoveredPack ? 0.35 : 0.1}
            transparent
            opacity={opacity * 0.95}
          />
        </mesh>

        {/* Glowing Interactive Modular Bays Pattern in Floor */}
        {[-0.8, -0.26, 0.26, 0.8].map((bx, idx) => (
          <group key={idx} position={[bx, 0.09, 0]}>
            <mesh>
              <boxGeometry args={[0.48, 0.04, 1.25]} />
              <meshStandardMaterial
                color="#0284c7"
                emissive="#06b6d4"
                emissiveIntensity={hoveredPack ? 1.8 : 0.9}
                transparent
                opacity={opacity * 0.85}
              />
            </mesh>
          </group>
        ))}

        {/* Pulsing Hologram Frame on Hover */}
        {hoveredPack && (
          <mesh position={[0, 0.25, 0]}>
            <boxGeometry args={[2.85, 0.32, 1.55]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.65} />
          </mesh>
        )}

        {/* Hover Click Tooltip Badge */}
        {hoveredPack && visible && (
          <Html position={[0, 0.85, 0]} center distanceFactor={7}>
            <div className="pointer-events-none select-none font-orbitron text-[10px] font-bold px-3 py-1.5 rounded-xl bg-slate-950/95 text-cyan-300 border border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.8)] flex items-center gap-2 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>CLICK TO ENTER PACK & CELL-TO-PACK (CTP) STAGE</span>
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ==========================================
// 3. STAGE 2: SKATEBOARD TRAY & EXTRUDED ENCLOSURE
// ==========================================
interface SkateboardTrayProps {
  totalW: number;
  totalD: number;
  exploded: boolean;
  renderMode: RenderMode;
}

function SkateboardTray({ totalW, totalD, exploded, renderMode }: SkateboardTrayProps) {
  const coldPlateColor = renderMode === 'THERMAL' ? '#06b6d4' : '#081220';
  const coldPlateEmissive = renderMode === 'THERMAL' ? '#06b6d4' : '#0284c7';

  // Vertical explode offset for layer 5 (tray & cold plate)
  const trayOffsetY = exploded ? -0.85 : 0;

  return (
    <group position={[0, trayOffsetY, 0]}>
      {/* Extruded Aluminum Skateboard Enclosure Perimeter Flange */}
      <mesh position={[0, -0.74, 0]} receiveShadow>
        <boxGeometry args={[totalW + 0.9, 0.12, totalD + (exploded ? 1.8 : 0.45)]} />
        <meshStandardMaterial
          color="#1e293b"
          metalness={0.92}
          roughness={0.18}
          emissive="#091528"
          emissiveIntensity={0.2}
        />
        <Edges color="#38bdf8" threshold={20} opacity={0.35} transparent />
      </mesh>

      {/* Aerodynamic Front-Nose Chamfer Plate */}
      <mesh position={[-totalW / 2 - 0.52, -0.74, 0]} rotation={[0, 0, Math.PI / 12]}>
        <boxGeometry args={[0.22, 0.11, totalD + 0.38]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Layer 5: Bottom Liquid Cooling Cold Plate with Serpentine Flow Cavities */}
      <group position={[0, -0.84, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[totalW + 0.82, 0.08, totalD + (exploded ? 1.7 : 0.38)]} />
          <meshStandardMaterial
            color={coldPlateColor}
            metalness={0.95}
            roughness={0.15}
            emissive={coldPlateEmissive}
            emissiveIntensity={renderMode === 'THERMAL' ? 0.75 : 0.15}
          />
        </mesh>

        {/* Serpentine Cyan Liquid Coolant Micro-Channels */}
        {[-0.38, -0.12, 0.12, 0.38].map((zOffset, idx) => (
          <mesh key={idx} position={[0, 0.045, zOffset]}>
            <boxGeometry args={[totalW + 0.65, 0.015, 0.05]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={renderMode === 'THERMAL' ? 2.5 : 1.5}
            />
          </mesh>
        ))}

        {/* Blue / Cyan Quick-Disconnect Coolant Inlet & Outlet Manifolds (Left End) */}
        <mesh position={[-totalW / 2 - 0.48, 0, -0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.14, 20]} />
          <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.1} emissive="#0284c7" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[-totalW / 2 - 0.48, 0, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.042, 0.042, 0.14, 20]} />
          <meshStandardMaterial color="#06b6d4" metalness={0.95} roughness={0.1} emissive="#06b6d4" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Layer 4: Cyan Thermal Interface Material (TIM) Silicone Thermal Pad */}
      {exploded && (
        <group position={[0, -0.42, 0]}>
          <mesh>
            <boxGeometry args={[totalW + 0.6, 0.02, totalD + 0.25]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#0891b2"
              emissiveIntensity={0.65}
              transparent
              opacity={0.88}
              roughness={0.4}
            />
          </mesh>
          <Html position={[0, 0.06, 0]} center distanceFactor={8}>
            <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40 whitespace-nowrap">
              LAYER 4: CYAN SILICONE THERMAL INTERFACE MATERIAL (TIM) PAD
            </div>
          </Html>
        </group>
      )}

      {/* Master BMS / BDU (Battery Disconnect Unit) High Voltage Junction Box (Right End) */}
      <group position={[totalW / 2 + 0.58, -0.15, 0]}>
        {/* Cast Aluminum Housing */}
        <mesh castShadow>
          <boxGeometry args={[0.54, 1.05, totalD * 0.95]} />
          <meshStandardMaterial color="#0b1329" metalness={0.9} roughness={0.2} />
          <Edges color="#38bdf8" threshold={18} opacity={0.4} transparent />
        </mesh>

        {/* High Voltage Main Orange Quick-Connect Harnesses */}
        <mesh position={[0.28, 0.32, -0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.14, 20]} />
          <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} emissive="#f97316" emissiveIntensity={0.45} />
        </mesh>
        <mesh position={[0.28, 0.32, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.14, 20]} />
          <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} emissive="#f97316" emissiveIntensity={0.45} />
        </mesh>

        {/* Manual Service Disconnect (MSD) / Pyrofuse Switch Lever in Safety Red */}
        <mesh position={[0.28, -0.2, 0]}>
          <boxGeometry args={[0.07, 0.18, 0.22]} />
          <meshStandardMaterial color="#dc2626" metalness={0.6} roughness={0.3} emissive="#b91c1c" emissiveIntensity={0.3} />
        </mesh>

        {/* Master BMS Diagnostic LED Status Array */}
        {[-0.18, 0, 0.18].map((z, idx) => (
          <mesh key={idx} position={[0.28, 0.08 - idx * 0.14, z]}>
            <sphereGeometry args={[0.026, 16, 16]} />
            <meshStandardMaterial
              color={idx === 0 ? '#10b981' : idx === 1 ? '#38bdf8' : '#f59e0b'}
              emissive={idx === 0 ? '#10b981' : idx === 1 ? '#38bdf8' : '#f59e0b'}
              emissiveIntensity={2.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// ==========================================
// 4. STAGE 2: PRISMATIC CELL & 5-LAYER MATRIX
// ==========================================
interface PrismaticCellArrayProps {
  cells: Array<{ cell: CellTelemetry; position: [number, number, number]; bankIndex: number }>;
  cellsPerBank: number;
  bankCount: number;
  cellSpacingX: number;
  bankSpacingZ: number;
  exploded: boolean;
  renderMode: RenderMode;
  selectedCell: CellTelemetry | null;
  meanVoltage: number;
  showLabels: boolean;
  onCellClick: (cell: CellTelemetry) => void;
  packCurrent: number;
}

function PrismaticCellArray({
  cells,
  cellsPerBank,
  bankCount,
  cellSpacingX,
  bankSpacingZ,
  exploded,
  renderMode,
  selectedCell,
  meanVoltage,
  showLabels,
  onCellClick,
  packCurrent
}: PrismaticCellArrayProps) {
  const totalW = (cellsPerBank - 1) * cellSpacingX;
  const startX = -totalW / 2;

  // Layer vertical offsets during Exploded Bifurcation
  const cellLayerY = exploded ? 0.25 : 0;
  const busbarLayerY = exploded ? 0.65 : 0.72;
  const fpcLayerY = exploded ? 1.05 : 0.8;

  // Series busbars: Alternating + to - copper links
  const seriesBusbars = useMemo(() => {
    const bars: Array<{ key: string; start: [number, number, number]; end: [number, number, number]; bank: number }> = [];
    for (let b = 0; b < bankCount; b++) {
      const zBase = (b - (bankCount - 1) / 2) * bankSpacingZ;
      for (let i = 0; i < cellsPerBank - 1; i++) {
        const x1 = startX + i * cellSpacingX + 0.11;
        const x2 = startX + (i + 1) * cellSpacingX - 0.11;
        bars.push({
          key: `s-bus-${b}-${i}`,
          start: [x1, 0, zBase],
          end: [x2, 0, zBase],
          bank: b
        });
      }
    }
    return bars;
  }, [cellsPerBank, bankCount, cellSpacingX, bankSpacingZ, startX]);

  return (
    <group>
      {/* ---------------------------------------------------- */}
      {/* LAYER 3: PRISMATIC CELLS + AEROGEL BARRIER PADS */}
      {/* ---------------------------------------------------- */}
      <group position={[0, cellLayerY, 0]}>
        {cells.map(({ cell, position, bankIndex }, idx) => {
          const isSelected = selectedCell?.cell_id === cell.cell_id;
          const temp = cell.temp_c ?? (cell as any).temperature ?? 25.0;
          const voltage = cell.voltage ?? 3.20;
          const soc = cell.soc ?? 70.0;
          const socFill = Math.max(0.12, Math.min(1.0, soc / 100));

          // Color based on render mode
          let cellBodyColor = new THREE.Color('#1e40af'); // Deep blue PET wrap
          let emissiveColor = new THREE.Color('#1e3a8a');
          let emissivePower = 0.2;

          if (renderMode === 'THERMAL') {
            cellBodyColor = getThermalColor(temp);
            emissiveColor = cellBodyColor;
            emissivePower = 1.2;
          } else if (renderMode === 'VOLTAGE') {
            cellBodyColor = getVoltageColor(voltage);
            emissiveColor = cellBodyColor;
            emissivePower = 1.2;
          } else if (renderMode === 'XRAY') {
            cellBodyColor = new THREE.Color('#0284c7');
            emissiveColor = new THREE.Color('#38bdf8');
            emissivePower = 0.8;
          } else {
            // Realistic: check for anomalies
            if (temp > 45 || voltage > 3.65 || voltage < 2.5) {
              cellBodyColor = new THREE.Color('#ef4444');
              emissiveColor = new THREE.Color('#ef4444');
              emissivePower = 1.8;
            } else if (temp > 38 || voltage > 3.45) {
              cellBodyColor = new THREE.Color('#f59e0b');
              emissiveColor = new THREE.Color('#f59e0b');
              emissivePower = 1.2;
            }
          }

          // Lateral exploded offset when exploded mode is active
          const lateralZOffset = exploded ? (bankIndex % 2 === 0 ? -0.45 : 0.45) : 0;
          const posX = position[0];
          const posY = position[1];
          const posZ = position[2] + lateralZOffset;

          return (
            <group
              key={`cell-${cell.cell_id}`}
              position={[posX, posY, posZ]}
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(cell);
              }}
            >
              {/* Outer Prismatic Blue PET Insulation Sleeve */}
              <mesh castShadow receiveShadow>
                <boxGeometry args={[0.44, 1.25, 0.38]} />
                <meshStandardMaterial
                  color={cellBodyColor}
                  metalness={renderMode === 'XRAY' ? 0.1 : 0.4}
                  roughness={renderMode === 'XRAY' ? 0.1 : 0.25}
                  transparent={renderMode === 'XRAY'}
                  opacity={renderMode === 'XRAY' ? 0.18 : 0.95}
                  emissive={emissiveColor}
                  emissiveIntensity={emissivePower}
                />
                {renderMode === 'XRAY' && <Edges color="#38bdf8" threshold={15} />}
              </mesh>

              {/* Laser-Welded Brushed Aluminum Top Cap Header Plate */}
              <mesh position={[0, 0.63, 0]}>
                <boxGeometry args={[0.44, 0.025, 0.38]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.12} />
              </mesh>

              {/* Positive Pole Terminal Collar (Laser Welded Copper + Amber Base Ring) */}
              <group position={[0.11, 0.68, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.045, 0.045, 0.09, 18]} />
                  <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.12} />
                </mesh>
                <mesh position={[0, -0.04, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.02, 18]} />
                  <meshStandardMaterial color="#dc2626" />
                </mesh>
              </group>

              {/* Negative Pole Terminal Collar (Machined Aluminum + Black Base Ring) */}
              <group position={[-0.11, 0.68, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.045, 0.045, 0.09, 18]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.12} />
                </mesh>
                <mesh position={[0, -0.04, 0]}>
                  <cylinderGeometry args={[0.06, 0.06, 0.02, 18]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>

              {/* Anti-Explosion Safety Burst-Disc Vent with Scored Relief Pattern */}
              <mesh position={[0, 0.645, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.015, 20]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
              </mesh>

              {/* Internal Jelly-Roll SOC Glow (Visible in X-Ray / Voltage) */}
              {(renderMode === 'XRAY' || renderMode === 'VOLTAGE') && (
                <mesh position={[0, -0.625 + (1.2 * socFill) / 2, 0]}>
                  <boxGeometry args={[0.39, 1.2 * socFill, 0.33]} />
                  <meshStandardMaterial
                    color={cellBodyColor}
                    emissive={cellBodyColor}
                    emissiveIntensity={2.2}
                    transparent
                    opacity={0.85}
                  />
                </mesh>
              )}

              {/* Target Bounding Frame for Selected Cell */}
              {isSelected && (
                <group>
                  <mesh>
                    <boxGeometry args={[0.5, 1.38, 0.46]} />
                    <meshBasicMaterial color="#10b981" wireframe transparent opacity={0.95} />
                  </mesh>
                  {/* Holographic Guide Marker */}
                  <mesh position={[0, 0.88, 0]} rotation={[0, 0, Math.PI / 4]}>
                    <octahedronGeometry args={[0.08]} />
                    <meshBasicMaterial color="#10b981" wireframe />
                  </mesh>
                </group>
              )}

              {/* Smart Staggered Glassmorphic ID Tag */}
              {showLabels && (
                <Html
                  position={[0, -0.85, bankIndex % 2 === 0 ? -0.2 : 0.2]}
                  center
                  distanceFactor={8}
                >
                  <div
                    className={`pointer-events-none select-none font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all duration-200 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-110'
                        : 'bg-slate-950/85 text-slate-300 border-slate-700/60'
                    }`}
                  >
                    <span>C{cell.cell_id}</span>
                    <span className="text-[7.5px] opacity-75">{voltage.toFixed(2)}V</span>
                  </div>
                </Html>
              )}
            </group>
          );
        })}

        {/* Inter-cell Aerogel Thermal Insulation Barrier Sheets between Cells */}
        {cells.map(({ position, bankIndex }, i) => {
          if (i % cellsPerBank === cellsPerBank - 1) return null;
          const lateralZOffset = exploded ? (bankIndex % 2 === 0 ? -0.45 : 0.45) : 0;
          return (
            <mesh
              key={`aerogel-${i}`}
              position={[position[0] + cellSpacingX / 2, 0, position[2] + lateralZOffset]}
            >
              <boxGeometry args={[0.025, 1.15, 0.35]} />
              <meshStandardMaterial
                color="#f8fafc"
                roughness={0.8}
                metalness={0.05}
                transparent
                opacity={exploded ? 0.75 : 0.4}
              />
            </mesh>
          );
        })}
      </group>

      {/* ---------------------------------------------------- */}
      {/* LAYER 2: CONTOURED COPPER BUSBAR MATRIX */}
      {/* ---------------------------------------------------- */}
      <group position={[0, busbarLayerY, 0]}>
        {seriesBusbars.map((bar) => {
          const midX = (bar.start[0] + bar.end[0]) / 2;
          const lateralZOffset = exploded ? (bar.bank % 2 === 0 ? -0.45 : 0.45) : 0;
          const midZ = bar.start[2] + lateralZOffset;
          const len = Math.abs(bar.end[0] - bar.start[0]);

          return (
            <group key={bar.key} position={[midX, 0, midZ]}>
              <mesh castShadow>
                <boxGeometry args={[len + 0.08, 0.035, 0.09]} />
                <meshStandardMaterial
                  color="#d97706"
                  metalness={0.95}
                  roughness={0.12}
                  emissive="#b45309"
                  emissiveIntensity={0.25}
                />
              </mesh>
              {/* Terminal Bolt Fasteners */}
              <mesh position={[-len / 2 + 0.02, 0.025, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
              <mesh position={[len / 2 - 0.02, 0.025, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.02, 12]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          );
        })}
        {exploded && (
          <Html position={[0, 0.12, 0]} center distanceFactor={8}>
            <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/40 whitespace-nowrap">
              LAYER 2: CONTOURED COPPER BUSBAR MATRIX & TERMINAL BOLTS
            </div>
          </Html>
        )}
      </group>

      {/* ---------------------------------------------------- */}
      {/* LAYER 1: TOP FPC BMS SENSING HARNESS & KAPTON STRIP */}
      {/* ---------------------------------------------------- */}
      <group position={[0, fpcLayerY, 0]}>
        {Array.from({ length: bankCount }).map((_, b) => {
          const lateralZOffset = exploded ? (b % 2 === 0 ? -0.45 : 0.45) : 0;
          const zBase = (b - (bankCount - 1) / 2) * bankSpacingZ + lateralZOffset;
          return (
            <group key={`fpc-${b}`} position={[0, 0, zBase]}>
              {/* Amber Kapton Polyimide Film Ribbon */}
              <mesh>
                <boxGeometry args={[totalW + 0.35, 0.012, 0.08]} />
                <meshStandardMaterial
                  color="#d97706"
                  metalness={0.3}
                  roughness={0.2}
                  transparent
                  opacity={0.85}
                  emissive="#b45309"
                  emissiveIntensity={0.2}
                />
              </mesh>
              {/* Gold Copper Micro-Traces along FPC */}
              <mesh position={[0, 0.008, 0]}>
                <boxGeometry args={[totalW + 0.3, 0.004, 0.03]} />
                <meshStandardMaterial color="#fbbf24" metalness={0.98} roughness={0.1} />
              </mesh>
            </group>
          );
        })}
        {exploded && (
          <Html position={[0, 0.12, 0]} center distanceFactor={8}>
            <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-yellow-950/80 text-yellow-300 border border-yellow-500/40 whitespace-nowrap">
              LAYER 1: TOP FPC BMS SENSING HARNESS & KAPTON PROTECTION STRIP
            </div>
          </Html>
        )}
      </group>
    </group>
  );
}

// ==========================================
// 5. STAGE 3: SINGLE CELL ISOLATION & LATERAL BIFURCATION
// ==========================================
interface SingleCellInspectorProps {
  cell: CellTelemetry;
  renderMode: RenderMode;
  onBack: () => void;
}

function SingleCellInspector({ cell, renderMode, onBack }: SingleCellInspectorProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const temp = cell.temp_c ?? (cell as any).temperature ?? 28.5;
  const voltage = cell.voltage ?? 3.235;
  const soc = cell.soc ?? 78.4;
  const socFill = Math.max(0.12, Math.min(1.0, soc / 100));

  // Charge-flow animation in jelly-roll
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle floating
    groupRef.current.position.y = 0.15 + Math.sin(t * 2) * 0.03;
  });

  return (
    <group ref={groupRef} position={[0.7, 0.15, 0]}>
      {/* ---------------------------------------------------- */}
      {/* SUB-LAYER 1: OUTER BLUE PET SLEEVE & ALUMINUM CAN (LEFT) */}
      {/* ---------------------------------------------------- */}
      <group position={[-0.75, 0, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.38, 1.45, 0.38]} />
          <meshStandardMaterial
            color="#1e40af"
            metalness={0.4}
            roughness={0.2}
            transparent
            opacity={0.88}
          />
          <Edges color="#38bdf8" threshold={15} />
        </mesh>
        <Html position={[0, -0.9, 0]} center distanceFactor={6}>
          <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-500/40 whitespace-nowrap">
            1. PET INSULATION & CAN
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* SUB-LAYER 2: INTERNAL WOUND/STACKED JELLY-ROLL (CENTER) */}
      {/* ---------------------------------------------------- */}
      <group position={[0, 0, 0]}>
        {/* Active Cathode/Anode Stack */}
        <mesh castShadow>
          <boxGeometry args={[0.32, 1.35 * socFill, 0.32]} />
          <meshStandardMaterial
            color={renderMode === 'THERMAL' ? getThermalColor(temp) : '#0284c7'}
            emissive={renderMode === 'THERMAL' ? getThermalColor(temp) : '#06b6d4'}
            emissiveIntensity={1.8}
            metalness={0.2}
            roughness={0.15}
          />
        </mesh>
        {/* Spiral Jelly-Roll Wireframe Texture */}
        <mesh>
          <boxGeometry args={[0.33, 1.36 * socFill, 0.33]} />
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.45} />
        </mesh>
        <Html position={[0, -0.9, 0]} center distanceFactor={6}>
          <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-cyan-950/90 text-cyan-300 border border-cyan-500/40 whitespace-nowrap">
            2. ELECTRODE JELLY-ROLL (SOC {soc.toFixed(0)}%)
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* SUB-LAYER 3: TOP LASER-WELDED CAP & SAFETY VENT (TOP) */}
      {/* ---------------------------------------------------- */}
      <group position={[0, 0.95, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.04, 0.38]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Terminals */}
        <mesh position={[0.1, 0.06, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh position={[-0.1, 0.06, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Burst Safety Vent */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.02, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
        <Html position={[0, 0.22, 0]} center distanceFactor={6}>
          <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-600/40 whitespace-nowrap">
            3. CAP & BURST VENT
          </div>
        </Html>
      </group>

      {/* ---------------------------------------------------- */}
      {/* SUB-LAYER 4: SIDE CURRENT COLLECTOR FOIL TABS (RIGHT) */}
      {/* ---------------------------------------------------- */}
      <group position={[0.75, 0, 0]}>
        {/* Copper Anode Collector Tab */}
        <mesh position={[-0.04, 0.1, 0]}>
          <boxGeometry args={[0.03, 1.1, 0.12]} />
          <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.1} />
        </mesh>
        {/* Aluminum Cathode Collector Tab */}
        <mesh position={[0.04, 0.1, 0]}>
          <boxGeometry args={[0.03, 1.1, 0.12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>
        <Html position={[0, -0.9, 0]} center distanceFactor={6}>
          <div className="font-mono text-[8px] font-bold px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-500/40 whitespace-nowrap">
            4. CURRENT COLLECTORS
          </div>
        </Html>
      </group>

      {/* Concentric Futuristic HUD Target Reticle Rings around Isolated Cell */}
      <group position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[0.95, 0.98, 48]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.65} wireframe />
        </mesh>
        <mesh>
          <ringGeometry args={[1.2, 1.23, 64]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.4} wireframe />
        </mesh>
      </group>
    </group>
  );
}

// ==========================================
// 6. CAMERA RIG & SMOOTH TRANSITION CONTROLLER
// ==========================================
function CameraRig({
  drillStage,
  selectedCell,
  exploded
}: {
  drillStage: DrillStage;
  selectedCell: CellTelemetry | null;
  exploded: boolean;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    let targetX = 0;
    let targetY = 2.4;
    let targetZ = 5.6;

    if (drillStage === 'CHASSIS') {
      // Sweeping isometric overview of the EV body
      targetX = -3.2;
      targetY = 2.8;
      targetZ = 4.8;
    } else if (drillStage === 'PACK_MODULE') {
      // Centered top-down perspective on battery modules
      targetX = 0;
      targetY = exploded ? 3.4 : 2.5;
      targetZ = exploded ? 4.9 : 4.4;
    } else if (drillStage === 'SINGLE_CELL') {
      // Zoomed-in right-aligned focus framing the isolated cell and HUD
      targetX = 0.8;
      targetY = 0.9;
      targetZ = 2.8;
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.5, delta);
  });

  return null;
}

// ==========================================
// 7. COMPONENT PROPS & MAIN DIGITAL TWIN COMPONENT
// ==========================================
export interface BatteryPack3DProps {
  cells?: CellTelemetry[];
  packCurrent?: number;
  packVoltage?: number;
  activeTopology?: PackTopology;
  onTopologyChange?: (t: PackTopology) => void;
  selectedCell?: CellTelemetry | null;
  onCellSelect?: (cell: CellTelemetry | null) => void;
  telemetryData?: any;
}

export const BatteryPack3D: React.FC<BatteryPack3DProps> = ({
  cells = [],
  packCurrent = 14.5,
  packVoltage = 25.6,
  activeTopology = '8S1P',
  onTopologyChange,
  selectedCell = null,
  onCellSelect,
  telemetryData
}) => {
  const [topology, setTopology] = useState<PackTopology>(activeTopology);
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC');
  const [drillStage, setDrillStage] = useState<DrillStage>('PACK_MODULE');
  const [exploded, setExploded] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [hoveredPack, setHoveredPack] = useState<boolean>(false);

  const controlsRef = useRef<any>(null);

  // Sync internal topology with prop if controlled
  useEffect(() => {
    if (activeTopology && activeTopology !== topology) {
      setTopology(activeTopology);
    }
  }, [activeTopology]);

  // Sync stage if selectedCell is changed externally
  useEffect(() => {
    if (selectedCell) {
      setDrillStage('SINGLE_CELL');
    }
  }, [selectedCell]);

  const handleTopologySelect = (t: PackTopology) => {
    setTopology(t);
    if (onTopologyChange) onTopologyChange(t);
  };

  const topoInfo = TOPOLOGY_PRESETS[topology] || TOPOLOGY_PRESETS['8S1P'];

  // Mean voltage calculation
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.20;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.2), 0);
    return sum / cells.length;
  }, [cells]);

  // Multi-topology cell matrix generation
  const packLayout = useMemo(() => {
    let cellCount = 8;
    let bankCount = 1;
    let cellsPerBank = 8;

    if (topology === '8S1P') {
      cellCount = 8;
      bankCount = 1;
      cellsPerBank = 8;
    } else if (topology === '16S1P') {
      cellCount = 16;
      bankCount = 1;
      cellsPerBank = 16;
    } else if (topology === '16S2P') {
      cellCount = 32;
      bankCount = 2;
      cellsPerBank = 16;
    } else if (topology === '24S2P') {
      cellCount = 48;
      bankCount = 2;
      cellsPerBank = 24;
    } else if (topology === '32S4P') {
      cellCount = 128;
      bankCount = 4;
      cellsPerBank = 32;
    }

    const generatedCells: Array<{ cell: CellTelemetry; position: [number, number, number]; bankIndex: number }> = [];
    const cellSpacingX = cellCount > 24 ? 0.48 : 0.58;
    const bankSpacingZ = 0.65;
    const totalW = (cellsPerBank - 1) * cellSpacingX;
    const startX = -totalW / 2;

    for (let b = 0; b < bankCount; b++) {
      const zPos = (b - (bankCount - 1) / 2) * bankSpacingZ;
      for (let i = 0; i < cellsPerBank; i++) {
        const cellId = b * cellsPerBank + i + 1;
        const sourceIndex = (cellId - 1) % (cells.length || 1);
        const liveCell = cells[sourceIndex];

        const baseCell: CellTelemetry = liveCell || {
          cell_id: cellId,
          voltage: 3.20 + (i % 2 === 0 ? 0.005 : -0.005),
          current: packCurrent / bankCount,
          temp_c: 26.0 + i * 0.1 + b * 0.2,
          soc: 70.0,
          internal_resistance_mohm: 32.0 + i * 0.2,
          health_status: 'NORMAL'
        };

        const cellData: CellTelemetry = {
          ...baseCell,
          cell_id: cellId,
          voltage: baseCell.voltage ?? 3.20,
          temp_c: baseCell.temp_c ?? (baseCell as any).temperature ?? 26.0,
          internal_resistance_mohm:
            baseCell.internal_resistance_mohm ?? (baseCell as any).internal_resistance ?? 32.0,
          soc: baseCell.soc ?? 70.0
        };

        const xPos = startX + i * cellSpacingX;
        generatedCells.push({
          cell: cellData,
          position: [xPos, 0, zPos],
          bankIndex: b
        });
      }
    }

    return {
      cells: generatedCells,
      cellCount,
      bankCount,
      cellsPerBank,
      cellSpacingX,
      bankSpacingZ,
      totalW,
      totalD: (bankCount - 1) * bankSpacingZ + 0.95
    };
  }, [topology, cells, packCurrent]);

  // Handle cell click (transitions to SINGLE_CELL)
  const handleCellClick = (cell: CellTelemetry) => {
    if (onCellSelect) {
      onCellSelect(cell);
    }
    setDrillStage('SINGLE_CELL');
  };

  // Up/back navigation handler
  const handleNavigateUp = () => {
    if (drillStage === 'SINGLE_CELL') {
      setDrillStage('PACK_MODULE');
      if (onCellSelect) onCellSelect(null);
    } else if (drillStage === 'PACK_MODULE') {
      setDrillStage('CHASSIS');
    }
  };

  // Reset Camera View
  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setDrillStage('PACK_MODULE');
    if (onCellSelect) onCellSelect(null);
  };

  // Focused cell for micro-telemetry drawer
  const activeInspectedCell: CellTelemetry =
    selectedCell ||
    packLayout.cells[0]?.cell || {
      cell_id: 1,
      voltage: 3.235,
      current: packCurrent,
      temp_c: 28.5,
      soc: 78.4,
      internal_resistance_mohm: 0.45,
      health_status: 'NOMINAL'
    };

  return (
    <div className="w-full h-[400px] sm:h-[500px] lg:h-[580px] rounded-2xl overflow-hidden bms-3d-bezel bg-[#040911] border border-white/10 shadow-2xl relative select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [-3.2, 2.8, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{
          background:
            'radial-gradient(ellipse at 50% 65%, rgba(6, 182, 212, 0.12) 0%, rgba(99, 102, 241, 0.08) 35%, #040911 82%)'
        }}
      >
        <ambientLight intensity={1.6} />
        <directionalLight position={[0, 9, 8]} intensity={2.2} castShadow />
        <directionalLight position={[-6, 6, 4]} intensity={1.4} />
        <directionalLight position={[6, 6, 4]} intensity={1.4} />
        <pointLight position={[-3, 4, 5]} intensity={2.0} color="#06b6d4" />
        <pointLight position={[3, 4, 5]} intensity={2.0} color="#10b981" />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          autoRotate={autoRotate}
          autoRotateSpeed={1.4}
          maxPolarAngle={Math.PI / 2 + 0.12}
          minDistance={2.0}
          maxDistance={14}
        />

        <CameraRig
          drillStage={drillStage}
          selectedCell={selectedCell}
          exploded={exploded}
        />

        <Float speed={autoRotate ? 0 : 0.7} rotationIntensity={0.05} floatIntensity={0.08}>
          <group rotation={[0.08, 0.1, 0]}>
            {/* Stage 1: EV Chassis Overview */}
            <EVChassisGhost
              visible={drillStage === 'CHASSIS'}
              opacity={drillStage === 'CHASSIS' ? 1.0 : 0.0}
              onSelectPack={() => setDrillStage('PACK_MODULE')}
              hoveredPack={hoveredPack}
              setHoveredPack={setHoveredPack}
            />

            {/* Stage 2: Skateboard Tray & Prismatic Array */}
            <group
              visible={drillStage !== 'CHASSIS'}
              position={drillStage === 'SINGLE_CELL' ? [-2.2, 0, -1.2] : [0, 0, 0]}
              scale={drillStage === 'SINGLE_CELL' ? [0.65, 0.65, 0.65] : [1, 1, 1]}
            >
              <SkateboardTray
                totalW={packLayout.totalW}
                totalD={packLayout.totalD}
                exploded={exploded}
                renderMode={renderMode}
              />
              <PrismaticCellArray
                cells={packLayout.cells}
                cellsPerBank={packLayout.cellsPerBank}
                bankCount={packLayout.bankCount}
                cellSpacingX={packLayout.cellSpacingX}
                bankSpacingZ={packLayout.bankSpacingZ}
                exploded={exploded}
                renderMode={renderMode}
                selectedCell={selectedCell}
                meanVoltage={meanVoltage}
                showLabels={showLabels && drillStage === 'PACK_MODULE'}
                onCellClick={handleCellClick}
                packCurrent={packCurrent}
              />
            </group>

            {/* Stage 3: Isolated Single Cell Inspector */}
            {drillStage === 'SINGLE_CELL' && (
              <SingleCellInspector
                cell={activeInspectedCell}
                renderMode={renderMode}
                onBack={handleNavigateUp}
              />
            )}
          </group>
        </Float>

        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.45}
          scale={12}
          blur={2.5}
          far={5}
          color="#06b6d4"
        />
      </Canvas>

      {/* ========================================== */}
      {/* TOP-LEFT & TOP-RIGHT HUD OVERLAYS */}
      {/* ========================================== */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pointer-events-auto z-10">
        {/* Topology Selector & Real-Time Metrics */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-emerald-500/25 shadow-xl overflow-x-auto max-w-full custom-scrollbar">
          <span className="text-[8.5px] sm:text-[9px] font-orbitron font-bold text-emerald-400 px-1.5 sm:px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span className="hidden xs:inline">TOPOLOGY:</span>
          </span>
          {(['8S1P', '16S1P', '16S2P', '24S2P', '32S4P'] as PackTopology[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTopologySelect(t)}
              className={`px-2 sm:px-2.5 py-1 text-[8.5px] sm:text-[9px] font-orbitron font-bold rounded-lg transition-all flex-shrink-0 ${
                topology === t
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.7)] scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {t}
            </button>
          ))}
          <span className="text-[8.5px] sm:text-[9px] font-mono text-slate-400 pl-2 pr-2 border-l border-slate-700/60 hidden md:inline-block flex-shrink-0">
            {topoInfo.nominalVoltage}V • {topoInfo.energyKwh.toFixed(2)} kWh ({packLayout.cellCount} Cells)
          </span>
        </div>

        {/* Render Modes Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-cyan-500/25 shadow-xl self-start sm:self-auto overflow-x-auto max-w-full custom-scrollbar">
          {(
            [
              { mode: 'REALISTIC', label: '3D Pack', icon: <Layers className="w-3 h-3" /> },
              { mode: 'THERMAL', label: 'Thermal', icon: <Flame className="w-3 h-3 text-amber-400" /> },
              { mode: 'VOLTAGE', label: 'Voltage', icon: <Zap className="w-3 h-3 text-cyan-400" /> },
              { mode: 'XRAY', label: 'X-Ray', icon: <Eye className="w-3 h-3 text-purple-400" /> }
            ] as Array<{ mode: RenderMode; label: string; icon: React.ReactNode }>
          ).map((m) => (
            <button
              key={m.mode}
              onClick={() => setRenderMode(m.mode)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 text-[8.5px] sm:text-[9px] font-orbitron font-bold rounded-lg transition-all flex-shrink-0 ${
                renderMode === m.mode
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.6)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========================================== */}
      {/* 3-TIER DRILL-DOWN BREADCRUMB & BACK BUTTON */}
      {/* ========================================== */}
      <div className="absolute top-14 left-3 flex items-center gap-2 pointer-events-auto z-10">
        {drillStage !== 'CHASSIS' && (
          <button
            onClick={handleNavigateUp}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 text-[9px] font-orbitron font-bold shadow-lg transition"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{drillStage === 'SINGLE_CELL' ? '← BACK TO MODULE' : '← BACK TO CHASSIS'}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/85 border border-white/10 text-[9px] font-mono text-slate-300 backdrop-blur-md">
          <span
            onClick={() => setDrillStage('CHASSIS')}
            className={`cursor-pointer hover:text-cyan-300 ${drillStage === 'CHASSIS' ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}
          >
            CHASSIS
          </span>
          <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
          <span
            onClick={() => setDrillStage('PACK_MODULE')}
            className={`cursor-pointer hover:text-cyan-300 ${drillStage === 'PACK_MODULE' ? 'text-cyan-400 font-bold' : 'text-slate-500'}`}
          >
            MODULE BAYS
          </span>
          {drillStage === 'SINGLE_CELL' && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
              <span className="text-emerald-400 font-bold">CELL C{activeInspectedCell.cell_id}</span>
            </>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT-SIDE TELEMETRY INSPECTION DRAWER */}
      {/* ========================================== */}
      <div className="absolute top-14 right-3 p-3.5 rounded-2xl bg-[#040911]/95 backdrop-blur-xl border border-cyan-500/30 text-white font-mono z-20 shadow-2xl max-w-xs animate-in fade-in slide-in-from-right-3">
        <div className="flex items-center justify-between gap-3 mb-2.5 border-b border-cyan-500/20 pb-1.5">
          <span className="font-orbitron font-bold text-[10px] tracking-wider text-cyan-400">
            CELL & MODULE TELEMETRY
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <ul className="space-y-1.5 text-[9.5px]">
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Pack Stage:</span>
            <span className="font-bold text-cyan-300">
              {drillStage === 'CHASSIS' ? 'Chassis' : drillStage === 'PACK_MODULE' ? 'Module' : 'Single Cell'}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Active Module:</span>
            <span className="font-bold text-white">
              M{Math.ceil(activeInspectedCell.cell_id / packLayout.cellsPerBank)}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Cell Target:</span>
            <span className="font-bold text-emerald-400">C{activeInspectedCell.cell_id}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Voltage:</span>
            <span className="font-bold text-white tabular-nums">
              {activeInspectedCell.voltage?.toFixed(3)} V
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Temp:</span>
            <span
              className={`font-bold tabular-nums ${(activeInspectedCell.temp_c ?? 25) > 40 ? 'text-rose-400' : 'text-slate-200'}`}
            >
              {(activeInspectedCell.temp_c ?? 25).toFixed(1)} °C
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• State of Charge:</span>
            <span className="font-bold text-emerald-400 tabular-nums">
              {(activeInspectedCell.soc ?? 70).toFixed(1)}%
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Internal IR:</span>
            <span className="font-bold text-slate-300 tabular-nums">
              {(activeInspectedCell.internal_resistance_mohm ?? 0.45).toFixed(2)} mΩ
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• State:</span>
            <span className="font-bold text-cyan-300 uppercase">
              {activeInspectedCell.voltage && activeInspectedCell.voltage > meanVoltage + 0.008
                ? 'BALANCING'
                : 'BALANCED'}
            </span>
          </li>
        </ul>
      </div>

      {/* ========================================== */}
      {/* BOTTOM INTERACTIVE TOOLBAR */}
      {/* ========================================== */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
        {/* Real-time Status Badge & Navigation Hint */}
        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 bg-[#040911]/90 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-emerald-400 font-semibold font-orbitron text-[9px]">REAL-TIME 60 FPS</span>
          <span className="text-slate-600">│</span>
          <span className="hidden md:inline text-slate-400">
            Drag: Rotate • Scroll: Zoom • Click cell/module to expand
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Toggle Labels */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-orbitron font-bold border transition-all ${
              showLabels
                ? 'bg-blue-600/25 border-blue-500 text-blue-300'
                : 'bg-slate-950/85 border-slate-700/60 text-slate-400 hover:text-white'
            }`}
            title="Toggle Cell ID Tags"
          >
            <Radio className="w-3 h-3" />
            <span className="hidden sm:inline">LABELS</span>
          </button>

          {/* Explode Bifurcations Toggle */}
          <button
            onClick={() => setExploded(!exploded)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-orbitron font-bold border transition-all ${
              exploded
                ? 'bg-purple-600/30 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'bg-slate-950/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>{exploded ? 'COLLAPSE' : 'EXPLODE BIFURCATIONS'}</span>
          </button>

          {/* Auto Rotate 360 Toggle */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-orbitron font-bold border transition-all ${
              autoRotate
                ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-950/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <RotateCcw className={`w-3 h-3 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>360° SPIN</span>
          </button>

          {/* Reset Camera View */}
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-xl bg-slate-950/85 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white transition"
            title="Reset Camera & Selection"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
