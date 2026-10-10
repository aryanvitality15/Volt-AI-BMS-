import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows, Html } from '@react-three/drei';
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
  Gauge,
  Info
} from 'lucide-react';
import { CellTelemetry } from '../types';

export type PackTopology = '8S1P' | '16S1P' | '16S2P' | '24S2P' | '32S4P';
export type RenderMode = 'REALISTIC' | 'THERMAL' | 'XRAY' | 'VOLTAGE';

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

interface BatteryCell3DProps {
  cell: CellTelemetry;
  position: [number, number, number];
  index: number;
  exploded: boolean;
  bankIndex: number;
  renderMode: RenderMode;
  isSelected: boolean;
  meanVoltage: number;
  showLabels?: boolean;
  onSelect: (cell: CellTelemetry) => void;
}

function BatteryCell3D({
  cell,
  position,
  index,
  exploded,
  bankIndex,
  renderMode,
  isSelected,
  meanVoltage,
  showLabels = true,
  onSelect
}: BatteryCell3DProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const [hovered, setHovered] = useState(false);

  const temp = cell.temp_c ?? (cell as any).temperature ?? 25.0;
  const resistance = cell.internal_resistance_mohm ?? (cell as any).internal_resistance ?? 32.0;
  const voltage = cell.voltage ?? 3.20;
  const soc = cell.soc ?? 70.0;

  const status = useMemo(() => {
    if (temp > 45 || voltage > 3.65 || voltage < 2.5 || resistance > 50) return 'CRITICAL';
    if (temp > 38 || voltage > 3.45 || voltage < 2.9 || resistance > 40) return 'WARNING';
    return 'NOMINAL';
  }, [temp, voltage, resistance]);

  // Color calculation based on render mode
  const cellColor = useMemo(() => {
    if (renderMode === 'THERMAL') {
      // Thermal Gradient: Blue (<25°C) -> Emerald (30°C) -> Amber (38°C) -> Crimson (>45°C)
      if (temp > 48) return new THREE.Color('#ef4444');
      if (temp > 42) return new THREE.Color('#f97316');
      if (temp > 36) return new THREE.Color('#f59e0b');
      if (temp > 29) return new THREE.Color('#10b981');
      return new THREE.Color('#06b6d4');
    }
    if (renderMode === 'VOLTAGE') {
      // Voltage Gradient: Red (<2.9V) -> Amber (2.9-3.15V) -> Green (3.15-3.35V) -> Cyan (>3.35V)
      if (voltage > 3.42) return new THREE.Color('#06b6d4');
      if (voltage > 3.22) return new THREE.Color('#10b981');
      if (voltage > 3.0) return new THREE.Color('#f59e0b');
      return new THREE.Color('#f43f5e');
    }
    if (renderMode === 'XRAY') {
      return new THREE.Color('#38bdf8');
    }
    // Realistic mode: Status driven
    if (status === 'CRITICAL') return new THREE.Color('#ef4444');
    if (status === 'WARNING') return new THREE.Color('#f59e0b');
    return new THREE.Color('#10b981');
  }, [renderMode, temp, voltage, status]);

  const socFill = Math.max(0.12, Math.min(1.0, soc / 100));

  // Exploded view animation lerping with real-time responsive damping
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    // Calculate target position based on exploded bifurcation offset
    const explodeOffsetZ = exploded ? (bankIndex === 0 ? -0.85 : 0.85) : 0;
    const explodeOffsetY = exploded ? 0.35 : 0;
    const isRaised = isSelected || hovered;
    const raiseY = isRaised ? 0.22 : 0;

    const targetX = position[0];
    const targetY = position[1] + explodeOffsetY + raiseY;
    const targetZ = position[2] + explodeOffsetZ;

    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, targetX, 10, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 10, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 10, delta);

    // Subtle gentle float for selected/hovered cell
    if (isRaised) {
      groupRef.current.position.y += Math.sin(t * 5 + index * 0.3) * 0.005;
    }
  });

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(cell);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Outer Prismatic Casing with Sleek Futuristic Edges */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.42, 1.25, 0.38]} />
        <meshStandardMaterial
          color={renderMode === 'XRAY' ? '#0369a1' : '#1e293b'}
          metalness={renderMode === 'XRAY' ? 0.1 : 0.4}
          roughness={renderMode === 'XRAY' ? 0.1 : 0.3}
          transparent
          opacity={renderMode === 'XRAY' ? 0.25 : renderMode === 'THERMAL' ? 0.5 : 0.65}
          wireframe={renderMode === 'XRAY'}
        />
      </mesh>

      {/* Futuristic Glowing Edge Accent Ring around Cell Body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.425, 1.255, 0.385]} />
        <meshBasicMaterial
          color={cellColor}
          wireframe
          transparent
          opacity={hovered || isSelected ? 0.9 : 0.45}
        />
      </mesh>

      {/* Internal Active Core (SOC Fill Height & Vivid Glow) */}
      <mesh position={[0, -0.625 + (1.2 * socFill) / 2, 0]}>
        <boxGeometry args={[0.39, 1.2 * socFill, 0.35]} />
        <meshStandardMaterial
          color={cellColor}
          emissive={cellColor}
          emissiveIntensity={
            hovered || isSelected
              ? 2.6
              : status === 'CRITICAL'
              ? 2.2
              : status === 'WARNING'
              ? 1.5
              : 0.95
          }
          transparent
          opacity={0.92}
          metalness={0.2}
          roughness={0.2}
        />
      </mesh>

      {/* Internal Cathode/Anode Jellyroll Layers (Visible in XRAY/THERMAL) */}
      {(renderMode === 'XRAY' || renderMode === 'THERMAL') && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 1.15, 0.3]} />
          <meshBasicMaterial
            color={cellColor}
            wireframe
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      {/* Warning Beacon Pulse for Faulted / Anomaly Cells */}
      {(status === 'CRITICAL' || status === 'WARNING') && (
        <mesh position={[0, 0.88, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshStandardMaterial
            color={status === 'CRITICAL' ? '#ef4444' : '#f59e0b'}
            emissive={status === 'CRITICAL' ? '#ef4444' : '#f59e0b'}
            emissiveIntensity={3.5}
          />
        </mesh>
      )}

      {/* Positive Pole Terminal (+ Anode, Laser Welded Copper) */}
      <mesh position={[0.11, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.11, 20]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.95} roughness={0.1} emissive="#b45309" emissiveIntensity={0.15} />
      </mesh>
      {/* Positive Terminal Base Ring */}
      <mesh position={[0.11, 0.63, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.015, 20]} />
        <meshStandardMaterial color="#b45309" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Negative Pole Terminal (- Cathode, Laser Welded Nickel/Aluminum) */}
      <mesh position={[-0.11, 0.68, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.11, 20]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.1} emissive="#64748b" emissiveIntensity={0.15} />
      </mesh>
      {/* Negative Terminal Base Ring */}
      <mesh position={[-0.11, 0.63, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.015, 20]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Pressure Relief Safety Vent Disk with Scored Rupture Diaphragm */}
      <mesh position={[0, 0.635, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.018, 20]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.645, 0]}>
        <ringGeometry args={[0.015, 0.035, 16]} />
        <meshBasicMaterial color="#64748b" wireframe />
      </mesh>

      {/* Base Status Glow Aura */}
      <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.21, 0.025, 16, 32]} />
        <meshStandardMaterial
          color={cellColor}
          emissive={cellColor}
          emissiveIntensity={hovered || isSelected ? 3.5 : 1.2}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Target Reticle / Selection Wireframe Bounding Cage */}
      {(hovered || isSelected) && (
        <group>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.5, 1.38, 0.46]} />
            <meshBasicMaterial
              color={isSelected ? '#10b981' : cellColor}
              wireframe
              transparent
              opacity={0.85}
            />
          </mesh>
          {/* Top Hologram Marker */}
          <mesh position={[0, 0.85, 0]} rotation={[0, 0, Math.PI / 4]}>
            <octahedronGeometry args={[0.06]} />
            <meshBasicMaterial color={isSelected ? '#10b981' : '#38bdf8'} wireframe />
          </mesh>
        </group>
      )}

      {/* 3D Cell ID Floating Label */}
      {showLabels && (
        <Html position={[0, -0.92, 0]} center distanceFactor={8}>
          <div
            className={`pointer-events-none select-none font-mono text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all duration-200 ${
              hovered || isSelected
                ? 'bg-emerald-500/90 text-slate-950 border-white shadow-[0_0_12px_rgba(16,185,129,0.9)] scale-110'
                : status === 'CRITICAL'
                ? 'bg-rose-950/90 text-rose-300 border-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                : status === 'WARNING'
                ? 'bg-amber-950/90 text-amber-300 border-amber-500/80'
                : 'bg-slate-900/80 text-slate-300 border-slate-700/60'
            }`}
          >
            C{cell.cell_id}
            <span className="text-[7.5px] opacity-75 ml-1">{voltage.toFixed(2)}V</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// Authentic Inter-Cell Series Jumpers & Parallel Bridge Busbars
function ModularBusbars({
  cellsPerBank,
  bankCount,
  cellSpacingX,
  bankSpacingZ,
  exploded,
  packCurrent
}: {
  cellsPerBank: number;
  bankCount: number;
  cellSpacingX: number;
  bankSpacingZ: number;
  exploded: boolean;
  packCurrent: number;
}) {
  const totalW = (cellsPerBank - 1) * cellSpacingX;
  const startX = -totalW / 2;

  // Generate series links (+ to - alternating jumpers)
  const seriesBars = useMemo(() => {
    const bars: Array<{ key: string; start: [number, number, number]; end: [number, number, number]; bank: number }> = [];
    for (let b = 0; b < bankCount; b++) {
      const zBase = (b - (bankCount - 1) / 2) * bankSpacingZ;
      for (let i = 0; i < cellsPerBank - 1; i++) {
        // Link cell i (+ terminal) to cell i+1 (- terminal)
        const x1 = startX + i * cellSpacingX + 0.11;
        const x2 = startX + (i + 1) * cellSpacingX - 0.11;
        const y = 0.73;
        bars.push({
          key: `series-bus-${b}-${i}`,
          start: [x1, y, zBase],
          end: [x2, y, zBase],
          bank: b
        });
      }
    }
    return bars;
  }, [cellsPerBank, bankCount, cellSpacingX, bankSpacingZ, startX]);

  // Parallel interconnects across banks (if multi-bank parallel topology)
  const parallelBars = useMemo(() => {
    if (bankCount <= 1) return [];
    const bars: Array<{ key: string; start: [number, number, number]; end: [number, number, number] }> = [];
    for (let i = 0; i < cellsPerBank; i += Math.max(1, Math.floor(cellsPerBank / 4))) {
      const x = startX + i * cellSpacingX;
      const z1 = -((bankCount - 1) / 2) * bankSpacingZ;
      const z2 = ((bankCount - 1) / 2) * bankSpacingZ;
      bars.push({
        key: `parallel-bus-${i}`,
        start: [x, 0.75, z1],
        end: [x, 0.75, z2]
      });
    }
    return bars;
  }, [cellsPerBank, bankCount, cellSpacingX, bankSpacingZ, startX]);

  const busbarGlow = Math.abs(packCurrent) > 25 ? '#f59e0b' : '#b45309';

  return (
    <group>
      {/* Series Inter-Cell Busbars */}
      {seriesBars.map((bar) => {
        const midX = (bar.start[0] + bar.end[0]) / 2;
        const midY = bar.start[1];
        const midZ = bar.start[2] + (exploded ? (bar.bank === 0 ? -0.85 : 0.85) : 0);
        const len = Math.abs(bar.end[0] - bar.start[0]);

        return (
          <group key={bar.key} position={[midX, midY, midZ]}>
            <mesh castShadow>
              <boxGeometry args={[len + 0.08, 0.035, 0.09]} />
              <meshStandardMaterial
                color="#d97706"
                metalness={0.95}
                roughness={0.15}
                emissive={busbarGlow}
                emissiveIntensity={0.25}
              />
            </mesh>
            {/* Terminal Bolt Mount Fasteners */}
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

      {/* Parallel Cross-Bank Links */}
      {!exploded &&
        parallelBars.map((pBar) => {
          const midX = pBar.start[0];
          const midY = pBar.start[1];
          const midZ = (pBar.start[2] + pBar.end[2]) / 2;
          const depth = Math.abs(pBar.end[2] - pBar.start[2]);

          return (
            <mesh key={pBar.key} position={[midX, midY, midZ]}>
              <boxGeometry args={[0.06, 0.025, depth]} />
              <meshStandardMaterial color="#b45309" metalness={0.95} roughness={0.2} />
            </mesh>
          );
        })}
    </group>
  );
}

// Structural Enclosure, Liquid Cooling Cold Plate & HV Junction Box
function BifurcationStructure({
  cellsPerBank,
  bankCount,
  cellSpacingX,
  bankSpacingZ,
  exploded
}: {
  cellsPerBank: number;
  bankCount: number;
  cellSpacingX: number;
  bankSpacingZ: number;
  exploded: boolean;
  packCurrent: number;
}) {
  const totalW = (cellsPerBank - 1) * cellSpacingX + 0.85;
  const totalD = (bankCount - 1) * bankSpacingZ + 0.95;

  return (
    <group>
      {/* Central Longitudinal Fire-Retardant Bifurcation Divider (Separating Banks) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[totalW + 0.4, 1.4, 0.08]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.8}
          roughness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Module Perimeter Aluminum Protective Enclosure Frame */}
      <mesh position={[0, -0.75, 0]}>
        <boxGeometry args={[totalW + 0.6, 0.1, totalD + (exploded ? 1.7 : 0.2)]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Bottom Liquid Cooling Cold Plate with Serpentine Heat Exchanger Channels */}
      <group position={[0, -0.86, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[totalW + 0.8, 0.09, totalD + (exploded ? 1.9 : 0.4)]} />
          <meshStandardMaterial
            color="#091322"
            metalness={0.96}
            roughness={0.1}
          />
        </mesh>

        {/* Extruded Coolant Flow Channels (Cyan Glowing Stream) */}
        {[-0.32, 0, 0.32].map((zOffset, idx) => (
          <mesh key={idx} position={[0, 0.05, zOffset]}>
            <boxGeometry args={[totalW + 0.65, 0.015, 0.045]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={1.35}
            />
          </mesh>
        ))}

        {/* Coolant Inlet & Outlet Ports (Anodized Aluminum Couplers) */}
        <mesh position={[-totalW / 2 - 0.45, 0, -0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[-totalW / 2 - 0.45, 0, 0.2]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.12, 16]} />
          <meshStandardMaterial color="#06b6d4" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* High-Voltage Junction Box (HVJB) & BMS Master Distribution Controller (End of Pack) */}
      <group position={[totalW / 2 + 0.58, 0, 0]}>
        {/* Main Controller Cast Aluminum Enclosure */}
        <mesh castShadow>
          <boxGeometry args={[0.55, 1.25, totalD * 0.92]} />
          <meshStandardMaterial color="#0b1329" metalness={0.88} roughness={0.22} />
        </mesh>

        {/* Main Positive HV Orange Conduit Connector */}
        <mesh position={[0.28, 0.38, -0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 0.12, 16]} />
          <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} emissive="#c2410c" emissiveIntensity={0.2} />
        </mesh>

        {/* Main Negative HV Orange Conduit Connector */}
        <mesh position={[0.28, 0.38, 0.22]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.048, 0.048, 0.12, 16]} />
          <meshStandardMaterial color="#ea580c" metalness={0.7} roughness={0.3} emissive="#c2410c" emissiveIntensity={0.2} />
        </mesh>

        {/* Pyrofuse / Manual Service Disconnect (MSD) Switch Handle */}
        <mesh position={[0.28, -0.25, 0]}>
          <boxGeometry args={[0.06, 0.18, 0.22]} />
          <meshStandardMaterial color="#dc2626" metalness={0.5} roughness={0.4} />
        </mesh>

        {/* Live BMS Status Multi-Color LEDs */}
        {[-0.2, 0, 0.2].map((z, i) => (
          <mesh key={i} position={[0.29, 0.1 - i * 0.16, z]}>
            <sphereGeometry args={[0.028, 16, 16]} />
            <meshStandardMaterial
              color={i === 0 ? '#10b981' : i === 1 ? '#38bdf8' : '#f59e0b'}
              emissive={i === 0 ? '#10b981' : i === 1 ? '#38bdf8' : '#f59e0b'}
              emissiveIntensity={2.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Dynamic Animated Current / Electron Particles
function CurrentFlowParticles({
  cellsPerBank,
  bankCount,
  cellSpacingX,
  bankSpacingZ,
  currentA
}: {
  cellsPerBank: number;
  bankCount: number;
  cellSpacingX: number;
  bankSpacingZ: number;
  currentA: number;
}) {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 140;
  const totalW = (cellsPerBank - 1) * cellSpacingX;
  const startX = -totalW / 2;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const b = Math.floor(Math.random() * bankCount);
      const z = (b - (bankCount - 1) / 2) * bankSpacingZ;
      arr[i * 3] = startX + Math.random() * totalW;
      arr[i * 3 + 1] = 0.73;
      arr[i * 3 + 2] = z;
    }
    return arr;
  }, [count, bankCount, bankSpacingZ, startX, totalW]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const isStationary = Math.abs(currentA) < 0.1;
    const speed = isStationary ? 0 : (currentA >= 0 ? 1 : -1) * Math.min(2.0, Math.max(0.3, Math.abs(currentA) * 0.035)) * delta;

    for (let i = 0; i < count; i++) {
      arr[i * 3] += speed;
      if (arr[i * 3] > totalW / 2) arr[i * 3] = -totalW / 2;
      if (arr[i * 3] < -totalW / 2) arr[i * 3] = totalW / 2;
    }
    posAttr.needsUpdate = true;
  });

  const particleColor = currentA >= 0 ? '#10b981' : '#38bdf8';

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.055}
        color={particleColor}
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Camera Auto-Focuser for Smooth Transitions
function CameraRig({
  selectedCell,
  cellsLayout
}: {
  selectedCell: CellTelemetry | null;
  cellsLayout: Array<{ cell: CellTelemetry; position: [number, number, number] }>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (selectedCell) {
      const match = cellsLayout.find((c) => c.cell.cell_id === selectedCell.cell_id);
      if (match) {
        const targetX = match.position[0] * 0.4;
        const targetY = 2.0;
        const targetZ = 4.6;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, targetX, 4, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetY, 4, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetZ, 4, delta);
      }
    }
  });

  return null;
}

interface BatteryPack3DProps {
  cells: CellTelemetry[];
  packCurrent?: number;
  packVoltage?: number;
  activeTopology?: PackTopology;
  onTopologyChange?: (t: PackTopology) => void;
  selectedCell?: CellTelemetry | null;
  onCellSelect?: (cell: CellTelemetry | null) => void;
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
  const [exploded, setExploded] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const controlsRef = useRef<any>(null);

  // Sync internal topology with prop if controlled
  useEffect(() => {
    if (activeTopology && activeTopology !== topology) {
      setTopology(activeTopology);
    }
  }, [activeTopology]);

  const handleTopologySelect = (t: PackTopology) => {
    setTopology(t);
    if (onTopologyChange) onTopologyChange(t);
  };

  // Mean voltage across available cells
  const meanVoltage = useMemo(() => {
    if (!cells || cells.length === 0) return 3.20;
    const sum = cells.reduce((acc, c) => acc + (c.voltage ?? 3.2), 0);
    return sum / cells.length;
  }, [cells]);

  // Generate pack layout dynamically based on selected topology
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
        // Direct 1-to-1 mapping to live cell telemetry when in 8S1P or mapping modulo
        const sourceIndex = (cellId - 1) % (cells.length || 1);
        const liveCell = cells[sourceIndex];

        const baseCell: CellTelemetry = liveCell || {
          cell_id: cellId,
          voltage: 3.20 + (i % 2 === 0 ? 0.005 : -0.005),
          current: packCurrent / bankCount,
          temp_c: 26.0 + (i * 0.1) + (b * 0.2),
          soc: 70.0,
          internal_resistance_mohm: 32.0 + (i * 0.2),
          health_status: 'NORMAL'
        };

        const cellData: CellTelemetry = {
          ...baseCell,
          cell_id: cellId,
          voltage: baseCell.voltage ?? 3.20,
          temp_c: baseCell.temp_c ?? (baseCell as any).temperature ?? 26.0,
          internal_resistance_mohm: baseCell.internal_resistance_mohm ?? (baseCell as any).internal_resistance ?? 32.0,
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
      bankSpacingZ
    };
  }, [topology, cells, packCurrent]);

  const handleCellClick = (cell: CellTelemetry) => {
    if (onCellSelect) {
      if (selectedCell?.cell_id === cell.cell_id) {
        onCellSelect(null);
      } else {
        onCellSelect(cell);
      }
    }
  };

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    if (onCellSelect) {
      onCellSelect(null);
    }
  };

  const topoInfo = TOPOLOGY_PRESETS[topology] || TOPOLOGY_PRESETS['8S1P'];

  return (
    <div className="w-full h-[360px] sm:h-[460px] lg:h-[520px] rounded-2xl overflow-hidden glass-panel relative border border-slate-700/50 shadow-2xl">
      {/* 3D Canvas Viewport */}
      <Canvas
        camera={{ position: [0, 2.5, 6.0], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, #030712 100%)' }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[6, 10, 6]} intensity={1.6} castShadow />
        <directionalLight position={[-6, -4, -4]} intensity={0.7} />
        <pointLight position={[-4, 4, 6]} intensity={1.5} color="#10b981" />
        <pointLight position={[4, 2, 6]} intensity={1.5} color="#38bdf8" />
        <pointLight position={[0, 5, -3]} intensity={1.0} color="#06b6d4" />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          autoRotate={autoRotate}
          autoRotateSpeed={1.4}
          maxPolarAngle={Math.PI / 2 + 0.12}
          minDistance={2.2}
          maxDistance={14}
        />

        <CameraRig selectedCell={selectedCell} cellsLayout={packLayout.cells} />

        <Float speed={autoRotate ? 0 : 0.8} rotationIntensity={0.07} floatIntensity={0.1}>
          <group rotation={[0.08, 0.22, 0]}>
            {/* Battery Prismatic Cells */}
            {packLayout.cells.map(({ cell, position, bankIndex }, i) => (
              <BatteryCell3D
                key={`cell-${cell.cell_id}`}
                cell={cell}
                position={position}
                index={i}
                exploded={exploded}
                bankIndex={bankIndex}
                renderMode={renderMode}
                isSelected={selectedCell?.cell_id === cell.cell_id}
                meanVoltage={meanVoltage}
                showLabels={showLabels}
                onSelect={handleCellClick}
              />
            ))}

            {/* Modular Series / Parallel Busbars */}
            <ModularBusbars
              cellsPerBank={packLayout.cellsPerBank}
              bankCount={packLayout.bankCount}
              cellSpacingX={packLayout.cellSpacingX}
              bankSpacingZ={packLayout.bankSpacingZ}
              exploded={exploded}
              packCurrent={packCurrent}
            />

            {/* Structural Enclosure, Cooling Plate & HVJB */}
            <BifurcationStructure
              cellsPerBank={packLayout.cellsPerBank}
              bankCount={packLayout.bankCount}
              cellSpacingX={packLayout.cellSpacingX}
              bankSpacingZ={packLayout.bankSpacingZ}
              exploded={exploded}
              packCurrent={packCurrent}
            />

            {/* Dynamic Real-Time Electron Flow Particles */}
            <CurrentFlowParticles
              cellsPerBank={packLayout.cellsPerBank}
              bankCount={packLayout.bankCount}
              cellSpacingX={packLayout.cellSpacingX}
              bankSpacingZ={packLayout.bankSpacingZ}
              currentA={packCurrent}
            />
          </group>
        </Float>

        <ContactShadows
          position={[0, -1.35, 0]}
          opacity={0.45}
          scale={11}
          blur={2.5}
          far={4.8}
          color="#06b6d4"
        />
      </Canvas>

      {/* Top HUD Controls Overlay */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pointer-events-auto z-10">
        {/* Topology Selector & Real-Time Specifications */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-emerald-500/25 shadow-xl overflow-x-auto max-w-full custom-scrollbar">
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
                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.6)] scale-105'
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

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-blue-500/25 shadow-xl self-start sm:self-auto overflow-x-auto max-w-full custom-scrollbar">
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
                  ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.5)]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Selected Cell Real-Time Telemetry HUD Overlay */}
      {selectedCell && (
        <div className="absolute top-16 left-3 p-3.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-emerald-500/30 text-white font-mono z-20 shadow-2xl max-w-xs animate-in fade-in slide-in-from-left-2">
          <div className="flex items-center justify-between gap-3 mb-2 border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-orbitron font-bold text-xs text-emerald-400">CELL {selectedCell.cell_id} INSPECTOR</span>
            </div>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
              {selectedCell.health_status || 'NOMINAL'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
            <div>
              <span className="text-slate-500 block text-[8px]">VOLTAGE</span>
              <span className="font-bold text-white text-xs">{selectedCell.voltage?.toFixed(3)} V</span>
              <span className="text-[8px] text-slate-400 ml-1">
                ({selectedCell.voltage ? ((selectedCell.voltage - meanVoltage) * 1000).toFixed(0) : 0} mV)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">TEMPERATURE</span>
              <span className={`font-bold text-xs ${(selectedCell.temp_c ?? 25) > 40 ? 'text-rose-400' : 'text-slate-200'}`}>
                {(selectedCell.temp_c ?? (selectedCell as any).temperature ?? 25.0)?.toFixed(1)} °C
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">AC-IR RESISTANCE</span>
              <span className="font-bold text-slate-200 text-xs">
                {(selectedCell.internal_resistance_mohm ?? (selectedCell as any).internal_resistance ?? 32.0)?.toFixed(1)} mΩ
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[8px]">STATE OF CHARGE</span>
              <span className="font-bold text-emerald-400 text-xs">{selectedCell.soc?.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Interactive Toolbar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-10">
        {/* Real-time Status Badge & Navigation Hint */}
        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span className="text-emerald-400 font-semibold font-orbitron text-[9px]">REAL-TIME 60 FPS</span>
          <span className="text-slate-600">│</span>
          <span className="hidden md:inline text-slate-400">Drag: Rotate • Scroll: Zoom • Click cell: Inspect</span>
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

          {/* Exploded / Bifurcated View Button */}
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

          {/* Reset View */}
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
