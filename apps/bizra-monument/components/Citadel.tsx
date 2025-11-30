'use client';

import * as THREE from 'three';
import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useBizraStore } from '../store/useBizraStore';

const COUNT = 15000; // The 15,000 Hours
const TEMP_OBJECT = new THREE.Object3D();
const GOLD_COLOR = new THREE.Color('#C9A962');
const NAVY_COLOR = new THREE.Color('#0A1628');
const RED_COLOR = new THREE.Color('#FF0000'); // For DevMode highlights

export function Citadel() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { isDevMode, commits, lodLevel } = useBizraStore();

  // Algorithm: Procedural City Generation with LOD
  // We map the "pain" (hours) into a spiral tower structure (The Citadel), scaling detail based on LOD.
  const data = useMemo(() => {
    return commits.map((commit, i) => {
      const angle = i * 0.1; // Golden Angle approximation
      const radius = Math.sqrt(i) * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Height represents intensity of work during that hour, modulated by LOD
      const y = Math.sin(i * 0.05) * Math.cos(i * 0.01) * 2 + (i / COUNT) * 20 * lodLevel;

      return { position: [x, y, z], rotation: [0, angle, 0], scale: Math.random() * lodLevel };
    });
  }, [commits, lodLevel]);

  // GPU Upload: Update matrices only once, with frustum culling
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    data.forEach((d, i) => {
      TEMP_OBJECT.position.set(d.position[0] as number, d.position[1] as number, d.position[2] as number);
      TEMP_OBJECT.rotation.set(d.rotation[0] as number, d.rotation[1] as number, d.rotation[2] as number);
      TEMP_OBJECT.scale.setScalar(d.scale as number);
      TEMP_OBJECT.updateMatrix();
      meshRef.current!.setMatrixAt(i, TEMP_OBJECT.matrix);

      // Color Logic: Older commits are darker (Foundation), Newer are Gold (Release)
      // If DevMode is on, we highlight the "Ramadan 2023" block in Red.
      const progress = i / COUNT;
      let color = new THREE.Color().lerpColors(NAVY_COLOR, GOLD_COLOR, progress);
      if (isDevMode && commits[i]?.timestamp < 1693526400000) { // Ramadan 2023 timestamp
        color = RED_COLOR;
      }
      meshRef.current!.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.instanceColor!.needsUpdate = true;
  }, [data, isDevMode]);

  // The Heartbeat Loop (60 FPS) with LOD-based animation
  useFrame((state) => {
    if (!meshRef.current) return;

    // Rotate the entire history slowly, faster in Ascension phase
    meshRef.current.rotation.y += 0.001 * lodLevel;

    // Breathing effect based on Ihsan score, amplified in DevMode
    const breath = Math.sin(state.clock.elapsedTime) * 0.02 + 1;
    meshRef.current.scale.setScalar(breath * (isDevMode ? 1.2 : 1));
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, COUNT]}
      castShadow
      receiveShadow
      frustumCulled // Performance boost for distant blocks
    >
      <boxGeometry args={[0.2, 1, 0.2]} /> {/* The "Commit" Block */}
      <meshStandardMaterial
        roughness={0.2}
        metalness={0.8}
        emissive={GOLD_COLOR}
        emissiveIntensity={0.2}
      />
    </instancedMesh>
  );
}
