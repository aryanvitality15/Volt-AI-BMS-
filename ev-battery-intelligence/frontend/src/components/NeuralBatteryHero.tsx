import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, ContactShadows, Edges } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Zap,
  Flame,
  Activity,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Sliders,
  Thermometer,
  ShieldCheck,
  Maximize2
} from 'lucide-react';
import { BatteryState, CellTelemetry } from '../types';

export type HeroRenderMode = 'REALISTIC' | 'THERMAL' | 'VOLTAGE' | 'XRAY';

interface NeuralBatteryHeroProps {
  data: BatteryState;
  onNavigateTo3D: () => void;
  onSelectCell?: (cell: CellTelemetry) => void;
}

// ─── Thermal & Voltage Color Mappers for 3D Shaders ───
function getThermalShaderColor(tempC: number): THREE.Color {
  if (tempC >= 42) return new THREE.Color('#f43f5e'); // Rose Critical
  if (tempC >= 36) return new THREE.Color('#f59e0b'); // Amber Warning
  if (tempC >= 30) return new THREE.Color('#10b981'); // Emerald Optimal
  return new THREE.Color('#06b6d4'); // Cyan Nominal
}

function getVoltageShaderColor(voltage: number): THREE.Color {
  if (voltage >= 3.32) return new THREE.Color('#06b6d4'); // High SOC
  if (voltage >= 3.20) return new THREE.Color('#10b981'); // Balanced Nominal
  if (voltage >= 3.10) return new THREE.Color('#f59e0b'); // Sagging
  return new THREE.Color('#f43f5e'); // Imbalanced Low
}

// ─── Animated High-Voltage Energy Arcs ───
function EnergyFlowBeam({
  isCharging,
  isDischarging
}: {
  isCharging: boolean;
  isDischarging: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);

  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, 0.45, 0.6),
      new THREE.Vector3(-1.2, 0.75, 0.4),
      new THREE.Vector3(0.0, 0.55, 0.5),
      new THREE.Vector3(1.2, 0.75, 0.4),
      new THREE.Vector3(2.4, 0.45, 0.6)
    ]);
  }, []);

  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 48, 0.022, 8, false), [curve]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    if (mat) {
      const t = state.clock.getElapsedTime();
      const pulseSpeed = isCharging ? 4 : isDischarging ? 3 : 1;
      mat.emissiveIntensity = 1.2 + Math.sin(t * pulseSpeed) * 0.8;
    }
  });

  const beamColor = isCharging ? '#10b981' : isDischarging ? '#06b6d4' : '#6366f1';

  return (
    <mesh ref={meshRef} geometry={tubeGeo}>
      <meshStandardMaterial
        color={beamColor}
        emissive={beamColor}
        emissiveIntensity={1.8}
        transparent
        opacity={0.85}
        roughness={0.2}
      />
    </mesh>
  );
}

// ─── Individual 3D Prismatic Cell Component ───
function PrismaticCell3D({
  cell,
  index,
  totalCells,
  isHovered,
  isSelected,
  exploded,
  renderMode,
  onHover,
  onSelect
}: {
  cell: CellTelemetry;
  index: number;
  totalCells: number;
  isHovered: boolean;
  isSelected: boolean;
  exploded: boolean;
  renderMode: HeroRenderMode;
  onHover: (hovered: boolean) => void;
  onSelect: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null!);

  const voltage = Number(cell.voltage ?? 3.20);
  const tempC = Number(cell.temp_c ?? 26.0);

  // Position calculation across X-axis (-1.8 to +1.8)
  const spacing = 0.48;
  const startX = -((totalCells - 1) * spacing) / 2;
  const targetX = startX + index * spacing;
  const targetY = isHovered || isSelected ? 0.12 : 0;
  const targetZ = exploded ? (index % 2 === 0 ? 0.22 : -0.22) : 0;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, targetY, 10, delta);
    groupRef.current.position.z = THREE.MathUtils.damp(groupRef.current.position.z, targetZ, 8, delta);
  });

  // Material derivation based on Active Render Mode
  const cellColor = useMemo(() => {
    if (renderMode === 'THERMAL') return getThermalShaderColor(tempC);
    if (renderMode === 'VOLTAGE') return getVoltageShaderColor(voltage);
    if (renderMode === 'XRAY') return new THREE.Color('#38bdf8');
    // REALISTIC MODE
    if (isHovered || isSelected) return new THREE.Color('#38bdf8');
    return new THREE.Color('#1e293b');
  }, [renderMode, tempC, voltage, isHovered, isSelected]);

  return (
    <group
      ref={groupRef}
      position={[targetX, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
      }}
      onPointerOut={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* 1. Main Prismatic Aluminum Cell Body */}
      <mesh castShadow receiveShadow position={[0, 0.42, 0]}>
        <boxGeometry args={[0.38, 0.84, 0.52]} />
        {renderMode === 'XRAY' ? (
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            roughness={0.1}
            metalness={0.1}
            clearcoat={1.0}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color={cellColor}
            metalness={renderMode === 'REALISTIC' ? 0.85 : 0.4}
            roughness={renderMode === 'REALISTIC' ? 0.22 : 0.35}
            emissive={
              renderMode === 'REALISTIC'
                ? isHovered || isSelected
                  ? '#06b6d4'
                  : '#000000'
                : cellColor
            }
            emissiveIntensity={
              renderMode === 'REALISTIC'
                ? isHovered || isSelected
                  ? 0.4
                  : 0.05
                : 0.85
            }
          />
        )}
        <Edges
          color={isHovered || isSelected ? '#38bdf8' : renderMode === 'XRAY' ? '#38bdf8' : '#64748b'}
          threshold={25}
          opacity={isHovered || isSelected ? 0.9 : 0.4}
          transparent
        />
      </mesh>

      {/* 2. Top Terminal Cap (Header Plate) */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[0.37, 0.03, 0.51]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* 3. Positive Cathode Terminal (Copper Stud) */}
      <mesh position={[-0.1, 0.9, 0.12]}>
        <cylinderGeometry args={[0.032, 0.032, 0.08, 16]} />
        <meshStandardMaterial color="#f97316" metalness={0.85} roughness={0.2} />
      </mesh>

      {/* 4. Negative Anode Terminal (Nickel Stud) */}
      <mesh position={[0.1, 0.9, 0.12]}>
        <cylinderGeometry args={[0.032, 0.032, 0.08, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* 5. Center Safety Pressure Vent */}
      <mesh position={[0, 0.87, -0.08]}>
        <cylinderGeometry args={[0.024, 0.024, 0.02, 12]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* 6. Interconnecting Busbar Strip (linking to adjacent cell) */}
      {index < totalCells - 1 && (
        <mesh position={[spacing / 2, 0.92, 0.12]}>
          <boxGeometry args={[spacing - 0.04, 0.016, 0.05]} />
          <meshStandardMaterial
            color="#f97316"
            metalness={0.9}
            roughness={0.18}
            emissive="#ea580c"
            emissiveIntensity={0.2}
          />
        </mesh>
      )}

      {/* 7. Internal Wound Core (Visible in XRAY mode) */}
      {renderMode === 'XRAY' && (
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.72, 16]} />
          <meshStandardMaterial
            color="#22d3ee"
            wireframe
            emissive="#06b6d4"
            emissiveIntensity={1.5}
            transparent
            opacity={0.7}
          />
        </mesh>
      )}

      {/* 8. Underside Heat Dissipation Pad */}
      <mesh position={[0, -0.015, 0]}>
        <boxGeometry args={[0.36, 0.02, 0.48]} />
        <meshStandardMaterial
          color="#0ea5e9"
          emissive="#0284c7"
          emissiveIntensity={isHovered ? 1.2 : 0.3}
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

// ─── 3D Battery Pack Skateboard Enclosure & Tray ───
function BatteryPackEnclosure({
  totalCells,
  exploded
}: {
  totalCells: number;
  exploded: boolean;
}) {
  const coverY = exploded ? 1.55 : 0.98;
  const coverRef = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    if (!coverRef.current) return;
    coverRef.current.position.y = THREE.MathUtils.damp(coverRef.current.position.y, coverY, 6, delta);
  });

  const trayWidth = totalCells * 0.48 + 0.55;

  return (
    <group>
      {/* Lower Titanium Alloy Battery Tray */}
      <mesh receiveShadow position={[0, -0.08, 0]}>
        <boxGeometry args={[trayWidth, 0.12, 0.88]} />
        <meshStandardMaterial
          color="#090d16"
          metalness={0.92}
          roughness={0.18}
          emissive="#0369a1"
          emissiveIntensity={0.12}
        />
        <Edges color="#38bdf8" threshold={30} opacity={0.35} transparent />
      </mesh>

      {/* Bottom Liquid Cooling Flow Ribs */}
      {[-0.24, 0, 0.24].map((z, idx) => (
        <mesh key={idx} position={[0, -0.03, z]}>
          <boxGeometry args={[trayWidth - 0.2, 0.02, 0.04]} />
          <meshStandardMaterial
            color="#06b6d4"
            emissive="#06b6d4"
            emissiveIntensity={1.2}
          />
        </mesh>
      ))}

      {/* Translucent Polycarbonate Upper Cover (Elevates on Exploded View) */}
      <group ref={coverRef} position={[0, coverY, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[trayWidth + 0.04, 0.06, 0.92]} />
          <meshPhysicalMaterial
            color="#38bdf8"
            transparent
            opacity={0.32}
            roughness={0.12}
            metalness={0.1}
            clearcoat={1.0}
            transmission={0.65}
            depthWrite={false}
          />
          <Edges color="#38bdf8" threshold={20} opacity={0.55} transparent />
        </mesh>

        {/* High Voltage Hazard Warning Emblem on Cover */}
        <mesh position={[0, 0.035, 0]}>
          <boxGeometry args={[0.42, 0.005, 0.22]} />
          <meshStandardMaterial
            color="#f59e0b"
            emissive="#d97706"
            emissiveIntensity={0.8}
            metalness={0.4}
            roughness={0.3}
          />
        </mesh>
      </group>

      {/* Terminal Block Connectors (Left - & Right +) */}
      <group position={[-(trayWidth / 2) - 0.08, 0.42, 0]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.35, 16]} />
          <meshStandardMaterial color="#3b82f6" emissive="#1d4ed8" emissiveIntensity={0.6} />
        </mesh>
      </group>
      <group position={[trayWidth / 2 + 0.08, 0.42, 0]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.35, 16]} />
          <meshStandardMaterial color="#f97316" emissive="#c2410c" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// ─── Main 3D Canvas Scene ───
function BatteryPack3DScene({
  cells,
  exploded,
  renderMode,
  isCharging,
  isDischarging,
  autoRotate,
  hoveredCellId,
  selectedCellId,
  onHoverCell,
  onSelectCell
}: {
  cells: CellTelemetry[];
  exploded: boolean;
  renderMode: HeroRenderMode;
  isCharging: boolean;
  isDischarging: boolean;
  autoRotate: boolean;
  hoveredCellId: number | null;
  selectedCellId: number | null;
  onHoverCell: (id: number | null) => void;
  onSelectCell: (cell: CellTelemetry) => void;
}) {
  const totalCells = cells.length || 8;

  return (
    <>
      <OrbitControls
        enableZoom={true}
        minDistance={2.4}
        maxDistance={6.5}
        enablePan={false}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        dampingFactor={0.08}
        minPolarAngle={Math.PI / 4.8}
        maxPolarAngle={Math.PI / 2.05}
      />

      {/* Atmospheric Cinematic Studio Lighting */}
      <ambientLight intensity={0.65} color="#cbd5e1" />
      <directionalLight position={[4, 6, 4]} intensity={1.5} color="#ffffff" castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.7} color="#38bdf8" />
      <pointLight position={[0, 2.5, 0]} intensity={1.8} color="#06b6d4" distance={5} />
      <pointLight
        position={[0, -0.6, 0]}
        intensity={1.2}
        color={isCharging ? '#10b981' : isDischarging ? '#06b6d4' : '#6366f1'}
        distance={4}
      />

      <Float speed={1.2} rotationIntensity={0.12} floatIntensity={0.15}>
        <group position={[0, -0.25, 0]}>
          {/* 3D Tray & Elevating Enclosure */}
          <BatteryPackEnclosure totalCells={totalCells} exploded={exploded} />

          {/* Individual Cells Array */}
          {cells.map((cell, idx) => (
            <PrismaticCell3D
              key={cell.cell_id}
              cell={cell}
              index={idx}
              totalCells={totalCells}
              isHovered={hoveredCellId === cell.cell_id}
              isSelected={selectedCellId === cell.cell_id}
              exploded={exploded}
              renderMode={renderMode}
              onHover={(h) => onHoverCell(h ? cell.cell_id : null)}
              onSelect={() => onSelectCell(cell)}
            />
          ))}

          {/* Glowing Energy Plasma Beam */}
          <EnergyFlowBeam isCharging={isCharging} isDischarging={isDischarging} />
        </group>
      </Float>

      {/* Soft Contact Shadow beneath Pack */}
      <ContactShadows
        position={[0, -0.85, 0]}
        opacity={0.65}
        scale={8}
        blur={2.4}
        far={3.5}
        color="#06b6d4"
      />
    </>
  );
}

// ─── Primary Exported NeuralBatteryHero Component ───
export const NeuralBatteryHero: React.FC<NeuralBatteryHeroProps> = ({
  data,
  onNavigateTo3D,
  onSelectCell
}) => {
  const [renderMode, setRenderMode] = useState<HeroRenderMode>('REALISTIC');
  const [exploded, setExploded] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [hoveredCellId, setHoveredCellId] = useState<number | null>(null);
  const [selectedCellId, setSelectedCellId] = useState<number | null>(1);
  const [webglFailed, setWebglFailed] = useState<boolean>(false);

  const pack = data.pack || ({} as any);
  const cells = data.cells || [];

  const voltage = Number(pack.voltage ?? pack.pack_voltage ?? 25.6);
  const current = Number(pack.current ?? pack.pack_current ?? 14.5);
  const temp = Number(pack.avg_temp ?? pack.avg_temperature ?? 26.2);
  const maxImbalance = Number(pack.max_imbalance ?? pack.max_cell_imbalance ?? 0.012);
  const mode = pack.mode || (current < -0.1 ? 'CHARGING' : current > 0.1 ? 'DISCHARGING' : 'IDLE');
  const isCharging = mode === 'CHARGING' || current < -0.1;
  const isDischarging = mode === 'DISCHARGING' || current > 0.1;

  // Active cell telemetry lookup
  const activeCell = useMemo(() => {
    const targetId = hoveredCellId || selectedCellId || 1;
    return cells.find((c) => c.cell_id === targetId) || cells[0] || ({ cell_id: 1, voltage: 3.20, temp_c: 26.0, soc: 70.0 } as CellTelemetry);
  }, [cells, hoveredCellId, selectedCellId]);

  const handleCellClick = (cell: CellTelemetry) => {
    setSelectedCellId(cell.cell_id);
    if (onSelectCell) onSelectCell(cell);
  };

  return (
    <div className="volt-glass-card volt-glass-card-interactive rounded-2xl p-4 sm:p-6 lg:p-7 relative overflow-hidden border border-white/[0.10] shadow-2xl">
      {/* Dynamic Background Ambient Gradient Orbs */}
      <div
        className={`absolute -top-24 -right-24 w-96 h-96 rounded-full blur-[110px] pointer-events-none transition-all duration-700 ${
          isCharging
            ? 'bg-emerald-500/20'
            : isDischarging
            ? 'bg-cyan-500/20'
            : 'bg-indigo-500/15'
        }`}
      />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      {/* ─── Top Header & Controls Bar ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 mb-4 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-orbitron font-extrabold uppercase tracking-wider text-white">
                INTERACTIVE 3D BATTERY PACK DIGITAL TWIN
              </h3>
              <span className="text-[9px] font-orbitron font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                8S1P REAL WEBGL
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              Terminal: <strong className="text-slate-100 font-bold">{voltage.toFixed(2)} V</strong> • Net Current:{' '}
              <strong className={isCharging ? 'text-emerald-400' : isDischarging ? 'text-cyan-400' : 'text-slate-300'}>
                {current >= 0 ? `+${current.toFixed(1)} A` : `${current.toFixed(1)} A`}
              </strong>{' '}
              • Spread ΔV: <strong className={maxImbalance > 0.03 ? 'text-rose-400' : 'text-emerald-400'}>{(maxImbalance * 1000).toFixed(0)} mV</strong>
            </p>
          </div>
        </div>

        {/* Operating State Mode Badge & Deep 3D View Shortcut */}
        <div className="flex flex-wrap items-center gap-2.5">
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
                ? 'RECOVERY // CHARGING'
                : isDischarging
                ? 'DISCHARGE // UNDER LOAD'
                : 'STANDBY // RESTING'}
            </span>
          </div>

          <button
            onClick={onNavigateTo3D}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/15 hover:border-cyan-400/50 text-xs font-orbitron font-bold text-slate-200 hover:text-white transition shadow-lg group"
            title="Inspect Full EV Skateboard and Cell-to-Pack Stage Twin"
          >
            <span>FULL 3D LAB</span>
            <ChevronRight className="w-3.5 h-3.5 text-cyan-400 group-hover:translate-x-0.5 transition" />
          </button>
        </div>
      </div>

      {/* ─── 3D Viewport with Floating Glass HUD Controls ─── */}
      <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden bg-gradient-to-b from-[#04060b] via-[#070b14] to-[#04060a] border border-white/[0.08] shadow-[inset_0_2px_15px_rgba(0,0,0,0.8)]">
        
        {/* Subtle Cyber Grid in 3D canvas backdrop */}
        <div className="absolute inset-0 pinstripe-grid opacity-30 pointer-events-none" />

        {/* 3D WebGL Canvas */}
        {!webglFailed ? (
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-cyan-400 font-orbitron text-xs animate-pulse">
              INITIALIZING 3D NEURAL TWIN...
            </div>
          }>
            <Canvas
              shadows
              camera={{ position: [0, 2.2, 4.2], fov: 42 }}
              gl={{ antialias: true, alpha: true }}
              style={{ width: '100%', height: '100%' }}
              onError={() => setWebglFailed(true)}
            >
              <BatteryPack3DScene
                cells={cells}
                exploded={exploded}
                renderMode={renderMode}
                isCharging={isCharging}
                isDischarging={isDischarging}
                autoRotate={autoRotate}
                hoveredCellId={hoveredCellId}
                selectedCellId={selectedCellId}
                onHoverCell={setHoveredCellId}
                onSelectCell={handleCellClick}
              />
            </Canvas>
          </Suspense>
        ) : (
          /* Graceful Fallback if WebGL is unavailable */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <h4 className="text-sm font-orbitron font-bold text-white mb-1">
              WebGL Hardware Acceleration Inactive
            </h4>
            <p className="text-xs font-mono text-slate-400 max-w-sm">
              Rendering interactive glassmorphic telemetry cards. Enable WebGL in your browser for real-time 3D rotation.
            </p>
          </div>
        )}

        {/* ─── Floating Top-Left GlassHUD: Render Shader Modes ─── */}
        <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl">
          {(['REALISTIC', 'THERMAL', 'VOLTAGE', 'XRAY'] as HeroRenderMode[]).map((modeKey) => (
            <button
              key={modeKey}
              onClick={() => setRenderMode(modeKey)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-orbitron font-bold tracking-wider transition-all ${
                renderMode === modeKey
                  ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {modeKey === 'REALISTIC' ? 'ALLOY' : modeKey}
            </button>
          ))}
        </div>

        {/* ─── Floating Top-Right GlassHUD: 3D Camera & Exploded View Controls ─── */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 shadow-xl">
          <button
            onClick={() => setExploded(!exploded)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-orbitron font-bold flex items-center gap-1.5 transition-all ${
              exploded
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50 shadow-[0_0_10px_rgba(99,102,241,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Elevate acrylic cover and isolate prismatic cell array"
          >
            <Sliders className="w-3 h-3" />
            <span>EXPLODED</span>
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded-lg text-[10px] font-orbitron transition-all ${
              autoRotate
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Toggle 3D Orbit Auto-Rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ─── Floating Bottom-Left GlassHUD: Active Cell Real-Time Inspector Capsule ─── */}
        <div className="absolute bottom-3 left-3 z-20 p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 shadow-2xl flex items-center gap-3 text-xs font-mono">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/35 flex items-center justify-center font-orbitron font-extrabold text-cyan-300 text-xs">
            #{activeCell.cell_id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-orbitron font-bold text-white uppercase">
                CELL #{activeCell.cell_id}
              </span>
              <span className={`text-[8px] font-mono px-1 py-0.2 rounded font-bold ${
                Number(activeCell.voltage ?? 3.20) >= 3.20 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {Number(activeCell.voltage ?? 3.20) >= 3.20 ? 'NOMINAL' : 'IMBALANCE'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-300 mt-0.5">
              <span>{Number(activeCell.voltage ?? 3.20).toFixed(3)} <strong className="text-cyan-400">V</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                {Number(activeCell.temp_c ?? 26.0).toFixed(1)}°C
              </span>
              <span>•</span>
              <span>{Number(activeCell.internal_resistance_mohm ?? 32.0).toFixed(1)} mΩ</span>
            </div>
          </div>
        </div>

        {/* ─── Floating Bottom-Right Hint ─── */}
        <div className="hidden sm:flex absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-xl bg-black/45 backdrop-blur-md border border-white/10 text-[10px] font-mono text-slate-400 items-center gap-2 pointer-events-none select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Click & Drag to Rotate 3D Pack • Scroll to Zoom</span>
        </div>
      </div>

      {/* ─── Synchronized 8-Cell Quick Selector Matrix Bar ─── */}
      <div className="mt-4 pt-3 border-t border-white/[0.08] grid grid-cols-4 sm:grid-cols-8 gap-2 relative z-10">
        {cells.map((cell) => {
          const v = Number(cell.voltage ?? 3.20);
          const t = Number(cell.temp_c ?? 26.0);
          const isSelected = selectedCellId === cell.cell_id;
          const isHovered = hoveredCellId === cell.cell_id;

          return (
            <button
              key={cell.cell_id}
              onClick={() => handleCellClick(cell)}
              onMouseEnter={() => setHoveredCellId(cell.cell_id)}
              onMouseLeave={() => setHoveredCellId(null)}
              className={`p-2 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : isHovered
                  ? 'bg-white/[0.08] border-white/25'
                  : 'bg-white/[0.02] border-white/[0.07] hover:border-white/15'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-orbitron font-bold">
                <span className={isSelected ? 'text-cyan-300' : 'text-slate-300'}>
                  C{cell.cell_id}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {t.toFixed(0)}°
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-white mt-1 tabular-nums">
                {v.toFixed(3)}V
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
