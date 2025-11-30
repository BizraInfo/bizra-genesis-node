/**
 * Seed of Life - Sacred Geometry Logo Animation
 *
 * The Nuqta (نقطة) - Central circle representing Divine Origin (Tawhid)
 * 6 surrounding circles - The 6 days of creation
 * Overlapping petals - Community (Ummah) and Ihsan (Excellence)
 */

import * as THREE from 'three';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBizraStore } from '../../store/useBizraStore';
import { BRAND } from '../../constants/brand';

const GOLD_COLOR = new THREE.Color(BRAND.three.gold);
const GOLD_LIGHT = new THREE.Color(BRAND.three.goldLight);

interface SeedOfLifeProps {
  scale?: number;
  animated?: boolean;
}

export function SeedOfLife({ scale = 1, animated = true }: SeedOfLifeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const phase = useBizraStore((state) => state.phase);

  // Calculate circle positions for Seed of Life pattern
  const circlePositions = useMemo(() => {
    const radius = BRAND.geometry.seedRadius * 0.05 * scale;
    const positions: [number, number, number][] = [
      [0, 0, 0], // Center
    ];

    // 6 surrounding circles at 60-degree intervals
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      positions.push([
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      ]);
    }

    return positions;
  }, [scale]);

  // Animation
  useFrame((state) => {
    if (!groupRef.current || !animated) {return;}

    // Gentle rotation
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;

    // Breathing scale
    const breath = Math.sin(state.clock.elapsedTime * 0.5) * 0.02 + 1;
    groupRef.current.scale.setScalar(breath * scale);

    // Phase-specific behavior
    if (phase === 'GENESIS') {
      groupRef.current.rotation.z += 0.001;
    }
  });

  // Only show in VOID and GENESIS phases
  if (phase !== 'VOID' && phase !== 'GENESIS') {return null;}

  return (
    <group ref={groupRef} position={[0, 2, 0]}>
      {/* Seed of Life Circles */}
      {circlePositions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <ringGeometry
            args={[
              BRAND.geometry.seedRadius * 0.048 * scale,
              BRAND.geometry.seedRadius * 0.05 * scale,
              64,
            ]}
          />
          <meshBasicMaterial
            color={i === 0 ? GOLD_LIGHT : GOLD_COLOR}
            transparent
            opacity={i === 0 ? 0.8 : 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Central Nuqta (The Dot) */}
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.1 * scale, 32]} />
        <meshBasicMaterial color={GOLD_LIGHT} />
      </mesh>

      {/* Outer Ring */}
      <mesh position={[0, 0, -0.01]}>
        <ringGeometry
          args={[
            BRAND.geometry.seedRadius * 0.095 * scale,
            BRAND.geometry.seedRadius * 0.1 * scale,
            64,
          ]}
        />
        <meshBasicMaterial
          color={GOLD_COLOR}
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Glow Effect */}
      <pointLight
        position={[0, 0, 1]}
        color={BRAND.three.gold}
        intensity={0.5}
        distance={10}
      />
    </group>
  );
}

export default SeedOfLife;
