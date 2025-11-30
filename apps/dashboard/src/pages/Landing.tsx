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

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { useBizraStore } from '../store/useBizraStore';
import { BRAND } from '../constants/brand';

// Dynamically import Three.js components to prevent SSR issues
const Canvas = dynamic(
  () => import('@react-three/fiber').then((mod) => mod.Canvas),
  { ssr: false }
);

const Preload = dynamic(
  () => import('@react-three/drei').then((mod) => mod.Preload),
  { ssr: false }
);

// Lazy load 3D components
const Citadel = dynamic(
  () => import('../components/citadel').then((mod) => ({ default: mod.Citadel })),
  { ssr: false }
);

const SeedOfLife = dynamic(
  () => import('../components/citadel').then((mod) => ({ default: mod.SeedOfLife })),
  { ssr: false }
);

const Environment = dynamic(
  () => import('../components/citadel').then((mod) => ({ default: mod.Environment })),
  { ssr: false }
);

const FloatingParticles = dynamic(
  () => import('../components/citadel').then((mod) => ({ default: mod.FloatingParticles })),
  { ssr: false }
);

const GlassInterface = dynamic(
  () => import('../components/citadel').then((mod) => ({ default: mod.GlassInterface })),
  { ssr: false }
);

// Loading Screen Component
function LoadingScreen() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-50"
      style={{ backgroundColor: BRAND.colors.navy[900] }}
    >
      {/* Animated Nuqta */}
      <motion.div
        className="w-4 h-4 rounded-full mb-8"
        style={{
          backgroundColor: BRAND.colors.gold[500],
          boxShadow: `0 0 30px ${BRAND.colors.gold[500]}`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <p
        className="text-sm tracking-[0.4em] uppercase"
        style={{ color: BRAND.colors.gold[500] }}
      >
        Manifesting...
      </p>
    </div>
  );
}

// Fallback UI when WebGL fails or is loading
function FallbackHero() {
  const { setPhase } = useBizraStore();
  
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-20"
      style={{ backgroundColor: BRAND.colors.navy[900] }}
    >
      {/* Cosmic Background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 20%, rgba(201, 169, 98, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(42, 157, 143, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 50% 30% at 20% 70%, rgba(201, 169, 98, 0.08) 0%, transparent 50%)
          `,
        }}
      />
      
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 169, 98, 0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 169, 98, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Animated Seed of Life Pattern (CSS) */}
      <motion.div 
        className="relative mb-12"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <div className="w-32 h-32 relative">
          {/* Center circle */}
          <motion.div 
            className="absolute inset-0 rounded-full border-2"
            style={{ 
              borderColor: BRAND.colors.gold[500],
              boxShadow: `0 0 40px ${BRAND.colors.gold[500]}40, inset 0 0 30px ${BRAND.colors.gold[500]}20`,
            }}
            animate={{
              boxShadow: [
                `0 0 40px ${BRAND.colors.gold[500]}40, inset 0 0 30px ${BRAND.colors.gold[500]}20`,
                `0 0 60px ${BRAND.colors.gold[500]}60, inset 0 0 40px ${BRAND.colors.gold[500]}30`,
                `0 0 40px ${BRAND.colors.gold[500]}40, inset 0 0 30px ${BRAND.colors.gold[500]}20`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* The Nuqta - Sacred Dot */}
          <motion.div 
            className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ 
              backgroundColor: BRAND.colors.gold[500],
              boxShadow: `0 0 20px ${BRAND.colors.gold[500]}`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              boxShadow: [
                `0 0 20px ${BRAND.colors.gold[500]}`,
                `0 0 40px ${BRAND.colors.gold[500]}`,
                `0 0 20px ${BRAND.colors.gold[500]}`,
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Wordmark */}
      <motion.h1
        className="text-6xl md:text-8xl font-serif tracking-[0.5em] mb-4 relative z-10"
        style={{
          fontFamily: BRAND.fonts.serif,
          background: `linear-gradient(180deg, ${BRAND.colors.gold[300]} 0%, ${BRAND.colors.gold[600]} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 60px ${BRAND.colors.gold[500]}40`,
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        BIZRA
      </motion.h1>

      {/* Arabic Tagline */}
      <motion.p
        className="text-3xl mb-8"
        style={{
          fontFamily: BRAND.fonts.arabic,
          color: `${BRAND.colors.gold[500]}90`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.6 }}
      >
        {BRAND.arabic.tagline}
      </motion.p>

      {/* Subtitle */}
      <motion.p
        className="text-sm md:text-base mb-12 max-w-xl text-center px-4"
        style={{ color: BRAND.colors.text.secondary }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.9 }}
      >
        Revolutionary AI Consensus System • Multi-Agent Synthesis Engine
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 1.2 }}
      >
        <motion.button
          onClick={() => setPhase('GENESIS')}
          whileHover={{ scale: 1.05, boxShadow: `0 0 30px ${BRAND.colors.gold[500]}50` }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-full text-sm tracking-[0.3em] uppercase font-medium transition-all"
          style={{
            background: `linear-gradient(135deg, ${BRAND.colors.gold[500]} 0%, ${BRAND.colors.gold[600]} 100%)`,
            color: BRAND.colors.navy[900],
            boxShadow: `0 0 20px ${BRAND.colors.gold[500]}40`,
          }}
        >
          Enter Genesis
        </motion.button>
        
        <motion.a
          href="/Dashboard"
          whileHover={{ scale: 1.05, borderColor: BRAND.colors.gold[500] }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 rounded-full text-sm tracking-[0.3em] uppercase font-medium transition-all border"
          style={{
            borderColor: `${BRAND.colors.gold[500]}50`,
            color: BRAND.colors.gold[500],
            background: `${BRAND.colors.gold[500]}10`,
          }}
        >
          Dashboard
        </motion.a>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 md:gap-16"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
      >
        <div className="text-center">
          <div 
            className="text-2xl md:text-3xl font-mono font-bold"
            style={{ color: BRAND.colors.gold[500] }}
          >
            15,000+
          </div>
          <div 
            className="text-xs uppercase tracking-wider"
            style={{ color: BRAND.colors.text.muted }}
          >
            Hours
          </div>
        </div>
        <div className="text-center">
          <div 
            className="text-2xl md:text-3xl font-mono font-bold"
            style={{ color: BRAND.colors.teal[500] }}
          >
            556
          </div>
          <div 
            className="text-xs uppercase tracking-wider"
            style={{ color: BRAND.colors.text.muted }}
          >
            Tests
          </div>
        </div>
        <div className="text-center">
          <div 
            className="text-2xl md:text-3xl font-mono font-bold"
            style={{ color: BRAND.colors.gold[400] }}
          >
            88%
          </div>
          <div 
            className="text-xs uppercase tracking-wider"
            style={{ color: BRAND.colors.text.muted }}
          >
            Ihsan
          </div>
        </div>
      </motion.div>

      {/* Version Tag */}
      <motion.div
        className="absolute top-6 left-6 text-xs uppercase tracking-[0.3em]"
        style={{ color: BRAND.colors.gold[500] }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
      >
        Genesis Node v1.0.0
      </motion.div>
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
  const { setLoading, setPhase, phase } = useBizraStore();
  const [isReady, setIsReady] = useState(false);
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [show3D, setShow3D] = useState(false);

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebGLSupported(!!gl);
    } catch (e) {
      setWebGLSupported(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Show initial content immediately
    const quickTimer = setTimeout(() => {
      setIsReady(true);
    }, 500);

    // Delay 3D loading for better UX
    const slowTimer = setTimeout(() => {
      setLoading(false);
      setShow3D(true);
    }, 2000);

    return () => {
      clearTimeout(quickTimer);
      clearTimeout(slowTimer);
    };
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
      {/* Loading Screen - Only show briefly */}
      <AnimatePresence>
        {!isReady && <LoadingScreen />}
      </AnimatePresence>

      {/* Fallback Hero - Show immediately when ready, before 3D loads */}
      {isReady && phase === 'VOID' && <FallbackHero />}

      {/* 3D Canvas Layer - Load after initial content */}
      {webGLSupported && show3D && phase !== 'VOID' && (
        <div className="absolute inset-0 z-0">
          <Canvas
            camera={{
              position: [0, 10, 25],
              fov: 45,
              near: 0.1,
              far: 200,
            }}
            shadows
            dpr={[1, 2]}
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
      )}

      {/* UI Overlay Layer - For phases after VOID */}
      {phase !== 'VOID' && <GlassInterface />}

      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(201, 169, 98, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201, 169, 98, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)',
        }}
      />
    </main>
  );
}

export default Landing;
