/**
 * BIZRA Genesis Node - Landing Page
 *
 * "Shock & Awe" Protocol Implementation
 * A high-performance 3D visualization showcasing 15,000 hours of work.
 *
 * Tech Stack:
 * - React Three Fiber (WebGL) for hardware-accelerated 3D
 * - InstancedMesh for O(1) rendering of 15,000+ objects
 * - Framer Motion for physics-based UI animations
 * - Zustand for transient state management
 */

import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Preload } from '@react-three/drei';
import {
  Citadel,
  SeedOfLife,
  Environment,
  FloatingParticles,
  GlassInterface,
} from '../components/citadel';
import { useBizraStore } from '../store/useBizraStore';
import { BRAND } from '../constants/brand';

// Loading Screen Component
function LoadingScreen() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-50"
      style={{ backgroundColor: BRAND.colors.navy[900] }}
    >
      {/* Animated Nuqta */}
      <div
        className="w-4 h-4 rounded-full animate-pulse mb-8"
        style={{
          backgroundColor: BRAND.colors.gold[500],
          boxShadow: `0 0 30px ${BRAND.colors.gold[500]}`,
        }}
      />
      <p
        className="text-sm tracking-[0.4em] uppercase animate-pulse"
        style={{ color: BRAND.colors.gold[500] }}
      >
        Manifesting...
      </p>
    </div>
  );
}

// 3D Scene Content
function Scene() {
  const phase = useBizraStore((state) => state.phase);

  return (
    <>
      <Environment enableControls enablePostProcessing />

      {/* Seed of Life Logo (VOID/GENESIS phases) */}
      <SeedOfLife scale={1.5} animated />

      {/* The Citadel (GENESIS/CITADEL/FLIGHT phases) */}
      <group position={[0, -8, 0]}>
        <Citadel count={15000} animated />
      </group>

      {/* Floating Particles (ambient decoration) */}
      {phase !== 'VOID' && <FloatingParticles count={100} />}

      {/* Preload assets */}
      <Preload all />
    </>
  );
}

// Main Landing Page
export function Landing() {
  const { setLoading, setPhase } = useBizraStore();
  const [isReady, setIsReady] = React.useState(false);

  // Initialize on mount
  useEffect(() => {
    // Simulate loading time for dramatic effect
    const timer = setTimeout(() => {
      setLoading(false);
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [setLoading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPhase('VOID');
      } else if (e.key === ' ' || e.key === 'Enter') {
        useBizraStore.getState().nextPhase();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setPhase]);

  return (
    <main
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: BRAND.colors.navy[900] }}
    >
      {/* Loading Screen */}
      {!isReady && <LoadingScreen />}

      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{
            position: [0, 10, 25],
            fov: 45,
            near: 0.1,
            far: 200,
          }}
          shadows
          dpr={[1, 2]} // Responsive pixel ratio
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
          }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay Layer */}
      <GlassInterface />

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 169, 98, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 169, 98, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />
    </main>
  );
}

export default Landing;
