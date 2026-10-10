import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 600;

function Particles() {
  const meshRef = useRef<THREE.Points>(null!);
  const { positions, colors, speeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const spd = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      // Emerald/cyan/blue palette
      const r = Math.random();
      if (r < 0.4) {
        col[i * 3] = 0.06; col[i * 3 + 1] = 0.95; col[i * 3 + 2] = 0.55; // emerald
      } else if (r < 0.7) {
        col[i * 3] = 0.22; col[i * 3 + 1] = 0.74; col[i * 3 + 2] = 0.97; // cyan
      } else {
        col[i * 3] = 0.33; col[i * 3 + 1] = 0.36; col[i * 3 + 2] = 0.96; // indigo
      }
      spd[i] = 0.002 + Math.random() * 0.006;
    }
    return { positions: pos, colors: col, speeds: spd };
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const posAttr = meshRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * 60 * delta;
      if (arr[i * 3 + 1] > 10) arr[i * 3 + 1] = -10;
    }
    posAttr.needsUpdate = true;
    meshRef.current.rotation.y += 0.0002;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={PARTICLE_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.7}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export const ParticleField: React.FC = () => {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ opacity: 0.35 }}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Particles />
      </Canvas>
    </div>
  );
};
