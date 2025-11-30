/**
 * The Citadel - 15,000 Hours Visualization Engine
 *
 * Renders 15,000 commit blocks using GPU Instancing for O(1) performance.
 * Each block represents an hour of work, colored by temporal progression.
 *
 * Algorithm: Procedural spiral tower generation using golden angle approximation
 * Performance: Single draw call for 15,000+ objects via InstancedMesh
 */

import * as THREE from 'three';
import { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBizraStore } from '../../store/useBizraStore';
import { BRAND } from '../../constants/brand';

// Configuration
const HOUR_COUNT = 15000;
const TEMP_OBJECT = new THREE.Object3D();

// Colors from brand identity
const GOLD_COLOR = new THREE.Color(BRAND.three.gold);
const NAVY_COLOR = new THREE.Color(BRAND.three.navy);
const TEAL_COLOR = new THREE.Color(BRAND.three.teal);

interface CitadelProps {
  count?: number;
  animated?: boolean;
}

export function Citadel({ count = HOUR_COUNT, animated = true }: CitadelProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const phase = useBizraStore((state) => state.phase);
  const isDevMode = useBizraStore((state) => state.isDevMode);

  // Procedural City Generation Algorithm
  // Maps hours into a spiral tower structure (The Citadel)
  const blockData = useMemo(() => {
    const data: Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      intensity: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      // Golden angle spiral for organic distribution
      const angle = i * 0.1 * (Math.PI / 180) * BRAND.geometry.goldenAngle;
      const radius = Math.sqrt(i) * 0.4;

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Height represents intensity of work during that hour
      // Noise-like function simulates "bursts" of coding activity
      const burstFactor = Math.sin(i * 0.05) * Math.cos(i * 0.01) * 2;
      const progressFactor = (i / count) * 15; // Builds upward
      const y = burstFactor + progressFactor;

      // Scale variation for visual interest
      const scale = 0.3 + Math.random() * 0.7;

      // Intensity for color mapping (older = darker, newer = gold)
      const intensity = i / count;

      data.push({
        position: [x, y, z],
        rotation: [0, angle, 0],
        scale,
        intensity,
      });
    }

    return data;
  }, [count]);

  // GPU Upload: Set matrices and colors once
  useLayoutEffect(() => {
    if (!meshRef.current) {return;}

    blockData.forEach((block, i) => {
      // Position and transform
      TEMP_OBJECT.position.set(...block.position);
      TEMP_OBJECT.rotation.set(...block.rotation);
      TEMP_OBJECT.scale.setScalar(block.scale);
      TEMP_OBJECT.updateMatrix();
      meshRef.current!.setMatrixAt(i, TEMP_OBJECT.matrix);

      // Color: Lerp from Navy (foundation) to Gold (release)
      // In DevMode, highlight specific blocks (e.g., Ramadan 2023 period)
      let color: THREE.Color;

      if (isDevMode && block.intensity > 0.6 && block.intensity < 0.7) {
        // Highlight "Ramadan 2023" blocks in Teal
        color = TEAL_COLOR.clone();
      } else {
        color = new THREE.Color().lerpColors(
          NAVY_COLOR,
          GOLD_COLOR,
          block.intensity
        );
      }

      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [blockData, isDevMode]);

  // Animation Loop (60 FPS)
  useFrame((state) => {
    if (!meshRef.current || !animated) {return;}

    // Slow rotation of the entire history
    meshRef.current.rotation.y += 0.0005;

    // Breathing effect based on elapsed time (Ihsan pulse)
    const breath = Math.sin(state.clock.elapsedTime * 0.5) * 0.02 + 1;
    meshRef.current.scale.setScalar(breath);

    // Phase-specific animations
    if (phase === 'CITADEL') {
      // Expand outward slightly
      meshRef.current.scale.setScalar(breath * 1.1);
    } else if (phase === 'FLIGHT') {
      // Faster rotation for dramatic effect
      meshRef.current.rotation.y += 0.002;
    }
  });

  // Only render when in appropriate phase
  if (phase === 'VOID') {return null;}

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      castShadow
      receiveShadow
      frustumCulled={false}
    >
      {/* The "Commit" Block - elongated cube */}
      <boxGeometry args={[0.15, 0.8, 0.15]} />
      <meshStandardMaterial
        roughness={0.3}
        metalness={0.7}
        emissive={GOLD_COLOR}
        emissiveIntensity={0.15}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}

export default Citadel;
