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
  Cpu,
  Radio,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { CellTelemetry } from '../types';

// ==========================================
// 1. TOPOLOGY & RENDER MODE DEFINITIONS
// ==========================================
export type PackTopology = '8S1P' | '16S1P' | '16S2P' | '24S2P' | '32S4P';
export type RenderMode = 'REALISTIC' | 'THERMAL' | 'XRAY' | 'VOLTAGE';
export type DrillStage = 'OVERVIEW' | 'CHASSIS' | 'PACK_MODULE' | 'SINGLE_CELL';

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

// Thermal Color Mapping
function getThermalColor(tempC: number): THREE.Color {
  if (tempC >= 45) return new THREE.Color('#ef4444');
  if (tempC >= 39) return new THREE.Color('#f97316');
  if (tempC >= 33) return new THREE.Color('#f59e0b');
  if (tempC >= 27) return new THREE.Color('#10b981');
  return new THREE.Color('#06b6d4');
}

// Voltage Delta Color Mapping
function getVoltageColor(voltage: number): THREE.Color {
  if (voltage >= 3.32) return new THREE.Color('#06b6d4');
  if (voltage >= 3.23) return new THREE.Color('#10b981');
  if (voltage >= 3.16) return new THREE.Color('#f59e0b');
  return new THREE.Color('#f43f5e');
}

// ==========================================
// 2. CURVED CYAN DATA TRANSFER ARROW
// ==========================================
function CurvedTransferArrow({
  start,
  mid,
  end
}: {
  start: [number, number, number];
  mid: [number, number, number];
  end: [number, number, number];
}) {
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...start),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...end)
      ),
    [start, mid, end]
  );

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.016, 8, false), [curve]);

  const tangent = useMemo(() => curve.getTangent(1).normalize(), [curve]);
  const arrowRot = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    return new THREE.Euler().setFromQuaternion(q);
  }, [tangent]);

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={2.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Arrowhead */}
      <mesh position={end} rotation={arrowRot}>
        <coneGeometry args={[0.065, 0.18, 16]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={2.8}
        />
      </mesh>
    </group>
  );
}

// ==========================================
// 3. STAGE 1: GHOSTED EV CHASSIS SKATEBOARD (LEFT)
// ==========================================
function EVChassisGhost({
  onSelect,
  renderMode
}: {
  onSelect: () => void;
  renderMode: RenderMode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={[-4.5, -0.15, 0]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Aerodynamic Ghost Car Body Shell */}
      <group position={[0, 0.48, 0]}>
        {/* Fuselage & Sleek Hood */}
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[4.4, 0.52, 1.88]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.16}
            roughness={0.15}
            metalness={0.1}
            clearcoat={1.0}
            depthWrite={false}
          />
          <Edges color="#38bdf8" threshold={20} opacity={0.4} transparent />
        </mesh>

        {/* Roofline & Pillars */}
        <mesh position={[0.18, 0.68, 0]}>
          <boxGeometry args={[2.3, 0.44, 1.55]} />
          <meshPhysicalMaterial
            color="#60a5fa"
            transparent
            opacity={0.14}
            roughness={0.1}
            metalness={0.05}
            clearcoat={1.0}
            depthWrite={false}
          />
          <Edges color="#60a5fa" threshold={18} opacity={0.45} transparent />
        </mesh>

        {/* Windshield Slopes */}
        <mesh position={[-1.15, 0.48, 0]} rotation={[0, 0, Math.PI / 4.4]}>
          <boxGeometry args={[0.035, 0.62, 1.52]} />
          <meshPhysicalMaterial color="#93c5fd" transparent opacity={0.22} depthWrite={false} />
        </mesh>
        <mesh position={[1.5, 0.48, 0]} rotation={[0, 0, -Math.PI / 4.6]}>
          <boxGeometry args={[0.035, 0.64, 1.52]} />
          <meshPhysicalMaterial color="#93c5fd" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      </group>

      {/* 4 Detailed Alloy Wheels with Rubber Tires */}
      {[
        [-1.55, -0.12, 1.02],
        [1.55, -0.12, 1.02],
        [-1.55, -0.12, -1.02],
        [1.55, -0.12, -1.02]
      ].map(([wx, wy, wz], i) => (
        <group key={i} position={[wx, wy, wz]}>
          {/* Rubber Tire */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.39, 0.39, 0.22, 24]} />
            <meshStandardMaterial color="#0f172a" roughness={0.7} metalness={0.2} />
          </mesh>
          {/* Alloy Rim */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 0.225, 18]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Cyan Hub Ring */}
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, wz > 0 ? 0.12 : -0.12]}>
            <cylinderGeometry args={[0.07, 0.07, 0.02, 16]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={1.2} />
          </mesh>
          {/* Caliper */}
          <mesh position={[0.14, 0.1, wz > 0 ? 0.05 : -0.05]}>
            <boxGeometry args={[0.12, 0.14, 0.1]} />
            <meshStandardMaterial color="#06b6d4" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Front & Rear Drive Motors */}
      <group position={[-1.55, -0.1, 0]}>
        <mesh>
          <cylinderGeometry args={[0.24, 0.24, 0.68, 18]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          <Edges color="#38bdf8" threshold={25} opacity={0.4} transparent />
        </mesh>
      </group>
      <group position={[1.55, -0.1, 0]}>
        <mesh>
          <cylinderGeometry args={[0.25, 0.25, 0.76, 18]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
          <Edges color="#38bdf8" threshold={25} opacity={0.4} transparent />
        </mesh>
      </group>

      {/* Central Orange HV Spine Conduit */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[2.9, 0.04, 0.05]} />
        <meshStandardMaterial
          color="#ea580c"
          emissive="#f97316"
          emissiveIntensity={1.4}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>

      {/* Underfloor Battery Pack Floor with Glowing Modular Bays */}
      <group position={[0, -0.18, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[2.5, 0.14, 1.38]} />
          <meshStandardMaterial
            color={hovered ? '#0f172a' : '#080d16'}
            metalness={0.95}
            roughness={0.12}
            emissive={hovered ? '#0284c7' : '#0369a1'}
            emissiveIntensity={hovered ? 0.4 : 0.12}
          />
        </mesh>

        {/* Modular Floor Bays */}
        {[-0.72, -0.24, 0.24, 0.72].map((bx, idx) => (
          <mesh key={idx} position={[bx, 0.08, 0]}>
            <boxGeometry args={[0.42, 0.03, 1.18]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#06b6d4"
              emissiveIntensity={hovered ? 2.0 : 1.1}
            />
          </mesh>
        ))}

        {hovered && (
          <mesh position={[0, 0.22, 0]}>
            <boxGeometry args={[2.65, 0.28, 1.48]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.6} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ==========================================
// 4. STAGE 2: SKATEBOARD TRAY & ELEVATED BATTERY MODULES (CENTER)
// ==========================================
function SkateboardTrayWithModules({
  onSelectCell,
  renderMode,
  exploded
}: {
  onSelectCell: (cellId: number) => void;
  renderMode: RenderMode;
  exploded: boolean;
}) {
  const trayW = 2.8;
  const trayD = 1.6;

  // Elevating modules out of the tray with smooth float
  const moduleElevationY = exploded ? 0.75 : 0.42;

  return (
    <group position={[0.2, -0.15, 0]}>
      {/* Extruded Aluminum Skateboard Enclosure Tray */}
      <group position={[0, -0.45, 0]}>
        {/* Main Floor Tray Enclosure */}
        <mesh receiveShadow>
          <boxGeometry args={[trayW, 0.12, trayD]} />
          <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.18} />
          <Edges color="#38bdf8" threshold={20} opacity={0.4} transparent />
        </mesh>

        {/* Front Chamfered Nose Plate */}
        <mesh position={[-trayW / 2 - 0.14, 0, 0]} rotation={[0, 0, Math.PI / 10]}>
          <boxGeometry args={[0.18, 0.11, trayD * 0.9]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Bottom Liquid Cooling Blue Recess Cavities */}
        <mesh position={[0, 0.055, 0]}>
          <boxGeometry args={[trayW - 0.2, 0.02, trayD - 0.2]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={renderMode === 'THERMAL' ? 1.4 : 0.6}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>

        {/* Extruded Coolant Flow Ribs */}
        {[-0.45, -0.15, 0.15, 0.45].map((z, idx) => (
          <mesh key={idx} position={[0, 0.068, z]}>
            <boxGeometry args={[trayW - 0.3, 0.012, 0.04]} />
            <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={2.0} />
          </mesh>
        ))}

        {/* Quick Disconnect Coolant Couplers (Front Left) */}
        <mesh position={[-trayW / 2 - 0.1, 0.02, -0.25]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.038, 0.038, 0.12, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[-trayW / 2 - 0.1, 0.02, 0.25]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.038, 0.038, 0.12, 16]} />
          <meshStandardMaterial color="#06b6d4" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Master BMS / BDU High Voltage Junction Box (Front Center) */}
        <group position={[-trayW / 2 - 0.08, 0.04, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.16, 0.34]} />
            <meshStandardMaterial color="#ea580c" metalness={0.8} roughness={0.25} emissive="#c2410c" emissiveIntensity={0.2} />
          </mesh>
          {/* Dual Orange HV Connectors */}
          <mesh position={[0, 0.09, -0.08]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 14]} />
            <meshStandardMaterial color="#ea580c" metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.09, 0.08]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.08, 14]} />
            <meshStandardMaterial color="#ea580c" metalness={0.7} />
          </mesh>
        </group>

        {/* Central Orange HV Spine Harness */}
        <mesh position={[0.2, 0.075, 0]}>
          <boxGeometry args={[trayW - 0.6, 0.025, 0.05]} />
          <meshStandardMaterial color="#ea580c" emissive="#f97316" emissiveIntensity={1.2} />
        </mesh>
      </group>

      {/* Holographic Vertical Guide Rails / Elevation Rays */}
      {[-0.6, 0.6].map((x, xi) =>
        [-0.45, 0.45].map((z, zi) => (
          <mesh key={`${xi}-${zi}`} position={[x, moduleElevationY / 2 - 0.2, z]}>
            <cylinderGeometry args={[0.006, 0.006, moduleElevationY + 0.3, 8]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
          </mesh>
        ))
      )}

      {/* Elevated Modular Battery Bay Units Hovering Above the Tray */}
      <group position={[0, moduleElevationY, 0]}>
        {/* Module Bank 1 (Left / Front) */}
        <group
          position={[-0.55, 0, -0.38]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectCell(1);
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`m1-c-${i}`} position={[(i - 2.5) * 0.17, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 0.58, 0.32]} />
              <meshStandardMaterial
                color={renderMode === 'THERMAL' ? '#10b981' : '#1e40af'}
                metalness={0.5}
                roughness={0.2}
              />
              <Edges color="#38bdf8" threshold={15} />
            </mesh>
          ))}
          {/* Top Series Copper Busbars */}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.02, 0.02, 0.08]} />
            <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.12} emissive="#b45309" emissiveIntensity={0.25} />
          </mesh>
        </group>

        {/* Module Bank 2 (Right / Front) */}
        <group
          position={[0.55, 0, -0.38]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectCell(2);
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <mesh key={`m2-c-${i}`} position={[(i - 2.5) * 0.17, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 0.58, 0.32]} />
              <meshStandardMaterial
                color={renderMode === 'THERMAL' ? '#06b6d4' : '#1e40af'}
                metalness={0.5}
                roughness={0.2}
              />
              <Edges color="#38bdf8" threshold={15} />
            </mesh>
          ))}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.02, 0.02, 0.08]} />
            <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.12} emissive="#b45309" emissiveIntensity={0.25} />
          </mesh>
        </group>

        {/* Module Bank 3 (Elevated Active Target Module, Rear) */}
        <group
          position={[0.2, 0.12, 0.38]}
          onClick={(e) => {
            e.stopPropagation();
            onSelectCell(3);
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={`m3-c-${i}`} position={[(i - 3.5) * 0.17, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 0.58, 0.32]} />
              <meshStandardMaterial
                color={renderMode === 'THERMAL' ? '#10b981' : '#2563eb'}
                emissive="#0284c7"
                emissiveIntensity={0.3}
                metalness={0.6}
                roughness={0.18}
              />
              <Edges color="#60a5fa" threshold={15} />
            </mesh>
          ))}
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[1.36, 0.02, 0.08]} />
            <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.12} emissive="#b45309" emissiveIntensity={0.3} />
          </mesh>
          {/* Active Module Indicator Light */}
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.025, 12, 12]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ==========================================
// 5. STAGE 3: SINGLE CELL INTERNAL BIFURCATION & HUD TARGET (RIGHT)
// ==========================================
function SingleCellHeroAssembly({
  cell,
  renderMode,
  showLabels
}: {
  cell: CellTelemetry;
  renderMode: RenderMode;
  showLabels: boolean;
}) {
  const soc = cell.soc ?? 64.0;
  const voltage = cell.voltage ?? 3.227;
  const temp = cell.temp_c ?? 26.5;

  return (
    <group position={[4.0, 0.12, 0]}>
      {/* ----------------------------------------------------------------- */}
      {/* PART A: LATERALLY EXPANDED INTERNAL SUB-LAYERS (SPACED OUT) */}
      {/* ----------------------------------------------------------------- */}
      <group position={[-0.45, 0, 0]}>
        {/* SUB-LAYER 1: OUTER BLUE PET INSULATION SLEEVE & ALUMINUM CAN */}
        <group position={[-0.7, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.22, 1.25, 0.55]} />
            <meshStandardMaterial
              color="#1e40af"
              metalness={0.4}
              roughness={0.2}
              transparent
              opacity={0.88}
            />
            <Edges color="#38bdf8" threshold={15} />
          </mesh>
          {/* Clear Staggered Label 1: Placed cleanly below with no overlap */}
          <Html position={[0, -0.85, 0]} center distanceFactor={8}>
            <div className="pointer-events-none select-none font-mono text-[9px] font-bold px-2.5 py-1 rounded-lg bg-[#040911]/95 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.4)] whitespace-nowrap">
              1. PET INSULATION & CAN
            </div>
          </Html>
        </group>

        {/* SUB-LAYER 2: INTERNAL WOUND/STACKED JELLY-ROLL (ANODE/SEPARATOR/CATHODE) */}
        <group position={[0, 0, 0]}>
          {/* Wound Jelly-Roll Core */}
          <mesh castShadow>
            <boxGeometry args={[0.18, 1.15, 0.48]} />
            <meshStandardMaterial
              color={renderMode === 'THERMAL' ? getThermalColor(temp) : '#0284c7'}
              emissive={renderMode === 'THERMAL' ? getThermalColor(temp) : '#06b6d4'}
              emissiveIntensity={1.6}
              metalness={0.2}
              roughness={0.15}
            />
          </mesh>
          {/* Internal Wireframe Texture */}
          <mesh>
            <boxGeometry args={[0.185, 1.16, 0.485]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.45} />
          </mesh>
          {/* Clear Staggered Label 2: Placed staggered lower so it NEVER collides with #1 or #4 */}
          <Html position={[0, -1.18, 0]} center distanceFactor={8}>
            <div className="pointer-events-none select-none font-mono text-[9.5px] font-bold px-3 py-1 rounded-lg bg-[#040911]/95 text-cyan-200 border border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.5)] whitespace-nowrap">
              2. ELECTRODE JELLY-ROLL (SOC {soc.toFixed(0)}%)
            </div>
          </Html>
        </group>

        {/* SUB-LAYER 4: SIDE CURRENT COLLECTORS & TOP TERMINAL PLATE */}
        <group position={[0.65, 0, 0]}>
          {/* Copper Foil Collector Tab */}
          <mesh position={[-0.03, 0.05, 0]}>
            <boxGeometry args={[0.025, 0.95, 0.16]} />
            <meshStandardMaterial color="#d97706" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Aluminum Foil Collector Tab */}
          <mesh position={[0.03, 0.05, 0]}>
            <boxGeometry args={[0.025, 0.95, 0.16]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
          </mesh>
          {/* Top Laser Welded Assembly Header Plate */}
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[0.24, 0.03, 0.52]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
          </mesh>
          {/* Laser Welded Copper Terminal Post */}
          <mesh position={[0, 0.67, -0.14]}>
            <cylinderGeometry args={[0.038, 0.038, 0.07, 16]} />
            <meshStandardMaterial color="#d97706" metalness={0.9} />
          </mesh>
          {/* Laser Welded Nickel Terminal Post */}
          <mesh position={[0, 0.67, 0.14]}>
            <cylinderGeometry args={[0.038, 0.038, 0.07, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.9} />
          </mesh>
          {/* Clear Staggered Label 4: Placed staggered below #4 without overlap */}
          <Html position={[0, -1.48, 0]} center distanceFactor={8}>
            <div className="pointer-events-none select-none font-mono text-[9px] font-bold px-2.5 py-1 rounded-lg bg-[#2b1607]/95 text-amber-300 border border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.4)] whitespace-nowrap">
              4. CURRENT COLLECTORS
            </div>
          </Html>
        </group>
      </group>

      {/* ----------------------------------------------------------------- */}
      {/* PART B: INTACT ISOLATED PRISMATIC CELL WITH CONCENTRIC HUD RINGS */}
      {/* ----------------------------------------------------------------- */}
      <group position={[1.45, 0, 0]}>
        {/* Cell Casing */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.26, 1.35, 0.62]} />
          <meshStandardMaterial
            color={renderMode === 'THERMAL' ? getThermalColor(temp) : '#1e3a8a'}
            metalness={0.65}
            roughness={0.18}
            emissive={renderMode === 'THERMAL' ? getThermalColor(temp) : '#0284c7'}
            emissiveIntensity={0.25}
          />
          <Edges color="#38bdf8" threshold={15} />
        </mesh>

        {/* Top Brushed Aluminum Header Cap */}
        <mesh position={[0, 0.68, 0]}>
          <boxGeometry args={[0.265, 0.025, 0.625]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Positive Pole Collar (+ Red Base Ring) */}
        <group position={[0, 0.73, -0.18]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
            <meshStandardMaterial color="#d97706" metalness={0.95} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.015, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
        </group>

        {/* Negative Pole Collar (- Black Base Ring) */}
        <group position={[0, 0.73, 0.18]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.045, 0.045, 0.08, 16]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.95} />
          </mesh>
          <mesh position={[0, -0.035, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.015, 16]} />
            <meshStandardMaterial color="#0f172a" />
          </mesh>
        </group>

        {/* Central Safety Rupture Vent */}
        <mesh position={[0, 0.695, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.015, 16]} />
          <meshStandardMaterial color="#475569" metalness={0.8} />
        </mesh>

        {/* Futuristic Concentric Circular HUD Target Rings Around Top Terminals */}
        <group position={[0, 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.42, 0.44, 48]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.8} wireframe />
          </mesh>
          <mesh>
            <ringGeometry args={[0.55, 0.57, 48]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.5} wireframe />
          </mesh>
        </group>

        {/* Futuristic Concentric Circular HUD Target Rings Around Base */}
        <group position={[0, -0.7, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.48, 0.5, 48]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.85} wireframe />
          </mesh>
          <mesh>
            <ringGeometry args={[0.65, 0.67, 64]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.45} wireframe />
          </mesh>
        </group>

        {/* Staggered Glassmorphic ID Tags matching reference image */}
        {showLabels && (
          <>
            {/* Top C1 Tag */}
            <Html position={[0, 0.95, -0.22]} center distanceFactor={7}>
              <div className="pointer-events-none select-none font-mono text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/90 text-slate-950 border border-white shadow-[0_0_10px_rgba(16,185,129,0.8)]">
                C1
              </div>
            </Html>
            {/* Front C4 3.23V Target Tag */}
            <Html position={[-0.32, -0.2, 0.15]} center distanceFactor={7}>
              <div className="pointer-events-none select-none font-mono text-[9px] font-bold px-2 py-1 rounded-lg bg-emerald-950/90 text-emerald-300 border border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] flex flex-col items-center">
                <span className="text-[10px] font-extrabold text-white">C4</span>
                <span className="text-[8px] text-emerald-400 opacity-90">{voltage.toFixed(2)}V</span>
              </div>
            </Html>
          </>
        )}
      </group>
    </group>
  );
}

// ==========================================
// 6. CAMERA CONTROLLER
// ==========================================
function CameraRig({ drillStage }: { drillStage: DrillStage }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    let targetX = 0.4;
    let targetY = 2.4;
    let targetZ = 8.2;

    if (drillStage === 'CHASSIS') {
      targetX = -4.5;
      targetY = 1.9;
      targetZ = 4.8;
    } else if (drillStage === 'PACK_MODULE') {
      targetX = 0.2;
      targetY = 2.2;
      targetZ = 5.2;
    } else if (drillStage === 'SINGLE_CELL') {
      targetX = 4.0;
      targetY = 1.3;
      targetZ = 4.2;
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 3.5, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 3.5, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 3.5, delta);
  });

  return null;
}

// ==========================================
// 7. MAIN BATTERY PACK 3D COMPONENT
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
  onCellSelect
}) => {
  const [topology, setTopology] = useState<PackTopology>(activeTopology);
  const [renderMode, setRenderMode] = useState<RenderMode>('REALISTIC');
  const [drillStage, setDrillStage] = useState<DrillStage>('OVERVIEW');
  const [exploded, setExploded] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (activeTopology && activeTopology !== topology) {
      setTopology(activeTopology);
    }
  }, [activeTopology]);

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

  // Up/back navigation
  const handleNavigateUp = () => {
    if (drillStage === 'SINGLE_CELL') {
      setDrillStage('PACK_MODULE');
      if (onCellSelect) onCellSelect(null);
    } else if (drillStage === 'PACK_MODULE') {
      setDrillStage('CHASSIS');
    } else {
      setDrillStage('OVERVIEW');
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    setDrillStage('OVERVIEW');
    if (onCellSelect) onCellSelect(null);
  };

  const handleSelectCellById = (cellId: number) => {
    const target = cells.find((c) => c.cell_id === cellId) || {
      cell_id: cellId,
      voltage: 3.227,
      current: packCurrent,
      temp_c: 26.5,
      soc: 64.0,
      internal_resistance_mohm: 36.0,
      health_status: 'NOMINAL'
    };
    if (onCellSelect) onCellSelect(target);
    setDrillStage('SINGLE_CELL');
  };

  const activeCell: CellTelemetry =
    selectedCell ||
    cells[2] || {
      cell_id: 3,
      voltage: 3.227,
      current: packCurrent,
      temp_c: 26.5,
      soc: 64.0,
      internal_resistance_mohm: 36.0,
      health_status: 'NOMINAL'
    };

  return (
    <div className="w-full h-[440px] sm:h-[540px] lg:h-[620px] rounded-2xl overflow-hidden bms-3d-bezel bg-[#040911] border border-white/10 shadow-2xl relative select-none">
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0.4, 2.4, 8.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        style={{
          background:
            'radial-gradient(ellipse at 50% 65%, rgba(6, 182, 212, 0.14) 0%, rgba(99, 102, 241, 0.08) 35%, #040911 82%)'
        }}
      >
        <ambientLight intensity={1.7} />
        <directionalLight position={[0, 10, 8]} intensity={2.2} castShadow />
        <directionalLight position={[-8, 6, 4]} intensity={1.5} />
        <directionalLight position={[8, 6, 4]} intensity={1.5} />
        <pointLight position={[-4, 4, 5]} intensity={2.2} color="#06b6d4" />
        <pointLight position={[4, 4, 5]} intensity={2.2} color="#10b981" />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          maxPolarAngle={Math.PI / 2 + 0.12}
          minDistance={2.0}
          maxDistance={15}
        />

        <CameraRig drillStage={drillStage} />

        <Float speed={autoRotate ? 0 : 0.6} rotationIntensity={0.03} floatIntensity={0.05}>
          <group rotation={[0.07, 0.08, 0]}>
            {/* ---------------------------------------------------- */}
            {/* 1. LEFT STAGE: GHOSTED EV CHASSIS SKATEBOARD */}
            {/* ---------------------------------------------------- */}
            <EVChassisGhost
              onSelect={() => setDrillStage('CHASSIS')}
              renderMode={renderMode}
            />

            {/* Dotted Glowing Cyan Bezier Arrow (Chassis -> Tray) */}
            <CurvedTransferArrow
              start={[-3.1, -0.3, 0.2]}
              mid={[-1.9, -0.55, 0.8]}
              end={[-0.9, -0.35, 0.4]}
            />

            {/* ---------------------------------------------------- */}
            {/* 2. CENTER STAGE: SKATEBOARD TRAY & BATTERY MODULES */}
            {/* ---------------------------------------------------- */}
            <SkateboardTrayWithModules
              onSelectCell={handleSelectCellById}
              renderMode={renderMode}
              exploded={exploded}
            />

            {/* Dotted Glowing Cyan Bezier Arrow (Tray -> Single Cell) */}
            <CurvedTransferArrow
              start={[1.4, -0.1, 0.2]}
              mid={[2.4, -0.55, 0.8]}
              end={[3.0, -0.35, 0.4]}
            />

            {/* ---------------------------------------------------- */}
            {/* 3. RIGHT STAGE: SINGLE CELL BIFURCATION & HUD TARGET */}
            {/* ---------------------------------------------------- */}
            <SingleCellHeroAssembly
              cell={activeCell}
              renderMode={renderMode}
              showLabels={showLabels}
            />
          </group>
        </Float>

        <ContactShadows
          position={[0, -1.45, 0]}
          opacity={0.45}
          scale={15}
          blur={2.5}
          far={5.5}
          color="#06b6d4"
        />
      </Canvas>

      {/* ========================================== */}
      {/* TOP-LEFT TOPOLOGY & TOP-RIGHT RENDER MODES */}
      {/* ========================================== */}
      <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 right-2.5 sm:right-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pointer-events-auto z-10">
        {/* Topology Selector & Voltage/kWh Readout */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#040911]/90 backdrop-blur-md border border-emerald-500/25 shadow-xl overflow-x-auto max-w-full custom-scrollbar">
          <span className="text-[8.5px] sm:text-[9px] font-orbitron font-bold text-emerald-400 px-1.5 sm:px-2 py-0.5 flex items-center gap-1 flex-shrink-0">
            <Cpu className="w-3 h-3 text-emerald-400" />
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
            {topoInfo.nominalVoltage}V • {topoInfo.energyKwh.toFixed(2)} kWh ({topoInfo.totalCells} Cells)
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
        <button
          onClick={handleNavigateUp}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 text-[9px] font-orbitron font-bold shadow-lg transition"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>
            {drillStage === 'SINGLE_CELL'
              ? '← BACK TO MODULE'
              : drillStage === 'PACK_MODULE'
              ? '← BACK TO CHASSIS'
              : '← RESET OVERVIEW'}
          </span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950/85 border border-white/10 text-[9px] font-mono text-slate-300 backdrop-blur-md">
          <span
            onClick={() => setDrillStage('CHASSIS')}
            className={`cursor-pointer hover:text-cyan-300 ${drillStage === 'CHASSIS' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            CHASSIS
          </span>
          <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
          <span
            onClick={() => setDrillStage('PACK_MODULE')}
            className={`cursor-pointer hover:text-cyan-300 ${drillStage === 'PACK_MODULE' ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}
          >
            MODULE BAYS
          </span>
          <ChevronRight className="w-2.5 h-2.5 text-slate-600" />
          <span
            onClick={() => setDrillStage('SINGLE_CELL')}
            className={`cursor-pointer hover:text-cyan-300 ${drillStage === 'SINGLE_CELL' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}
          >
            CELL C{activeCell.cell_id}
          </span>
        </div>
      </div>

      {/* ========================================== */}
      {/* RIGHT-SIDE TELEMETRY INSPECTION DRAWER */}
      {/* ========================================== */}
      <div className="absolute top-14 right-3 p-3.5 rounded-2xl bg-[#040911]/95 backdrop-blur-xl border border-cyan-500/30 text-white font-mono z-20 shadow-2xl w-60 animate-in fade-in slide-in-from-right-3">
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
            <span className="font-bold text-white">M1</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Cell Target:</span>
            <span className="font-bold text-emerald-400">C{activeCell.cell_id}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Voltage:</span>
            <span className="font-bold text-white tabular-nums">
              {(activeCell.voltage ?? 3.227).toFixed(3)} V
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Temp:</span>
            <span className="font-bold text-slate-200 tabular-nums">
              {(activeCell.temp_c ?? 26.5).toFixed(1)} °C
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• State of Charge:</span>
            <span className="font-bold text-emerald-400 tabular-nums">
              {(activeCell.soc ?? 64.0).toFixed(1)}%
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• Internal IR:</span>
            <span className="font-bold text-slate-300 tabular-nums">
              {(activeCell.internal_resistance_mohm ?? 36.0).toFixed(2)} mΩ
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-slate-400">• State:</span>
            <span className="font-bold text-cyan-300 uppercase">
              {activeCell.health_status || 'BALANCED'}
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
