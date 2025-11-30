/**
 * Glass Interface - The "Shock & Awe" UI Overlay
 *
 * Manages phase transitions from text to 3D visualization.
 * Uses Framer Motion for physics-based UI transitions.
 * Implements glassmorphism design language.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBizraStore } from '../../store/useBizraStore';
import { BRAND } from '../../constants/brand';

// Animation variants
const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, scale: 1.5, filter: 'blur(20px)' },
};

const slideUpVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.1, 1],
    boxShadow: [
      `0 0 20px ${BRAND.colors.gold[500]}40`,
      `0 0 40px ${BRAND.colors.gold[500]}60`,
      `0 0 20px ${BRAND.colors.gold[500]}40`,
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut' as const,
    },
  },
};

export function GlassInterface() {
  const { phase, setPhase, metrics, isDevMode, toggleDevMode } = useBizraStore();
  const [displayHours, setDisplayHours] = useState(0);
  const [displayPoi, setDisplayPoi] = useState(0);

  // Animated counter for hours
  useEffect(() => {
    if (phase === 'CITADEL' || phase === 'GENESIS') {
      const targetHours = 15000;
      const duration = 3000; // 3 seconds
      const steps = 100;
      const increment = targetHours / steps;
      const interval = duration / steps;

      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetHours) {
          current = targetHours;
          clearInterval(timer);
        }
        setDisplayHours(Math.floor(current));
      }, interval);

      return () => clearInterval(timer);
    }
  }, [phase]);

  // Animated counter for POI
  useEffect(() => {
    if (phase !== 'VOID') {
      const targetPoi = metrics.poi;
      const duration = 2000;
      const steps = 60;
      const increment = targetPoi / steps;
      const interval = duration / steps;

      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= targetPoi) {
          current = targetPoi;
          clearInterval(timer);
        }
        setDisplayPoi(current);
      }, interval);

      return () => clearInterval(timer);
    }
  }, [phase, metrics.poi]);

  const handlePhaseClick = useCallback(() => {
    if (phase === 'VOID') {setPhase('GENESIS');}
    else if (phase === 'GENESIS') {setPhase('CITADEL');}
    else if (phase === 'CITADEL') {setPhase('FLIGHT');}
    else {setPhase('VOID');}
  }, [phase, setPhase]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col z-10">
      {/* Navigation Bar */}
      <nav className="w-full px-8 py-6 flex justify-between items-center pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xs uppercase tracking-[0.3em]"
          style={{ color: BRAND.colors.gold[500] }}
        >
          Genesis Node v1.0.0
        </motion.div>

        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={toggleDevMode}
          className={`text-xs uppercase tracking-[0.2em] px-4 py-2 rounded-full border transition-all ${
            isDevMode
              ? 'border-teal-500 text-teal-500 bg-teal-500/10'
              : 'border-white/20 text-white/50 hover:border-white/40'
          }`}
        >
          {isDevMode ? 'DEV MODE' : 'OBSERVER'}
        </motion.button>
      </nav>

      {/* SCENE 1: THE VOID - Initial State */}
      <AnimatePresence mode="wait">
        {phase === 'VOID' && (
          <motion.div
            key="void"
            variants={fadeVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 1 }}
            className="flex-1 flex flex-col items-center justify-center pointer-events-auto cursor-pointer"
            onClick={handlePhaseClick}
          >
            {/* The Nuqta (Dot) */}
            <motion.div
              variants={pulseVariants}
              animate="pulse"
              className="w-3 h-3 rounded-full mb-12"
              style={{ backgroundColor: BRAND.colors.gold[500] }}
            />

            {/* Wordmark */}
            <h1
              className="text-6xl md:text-8xl font-serif tracking-[0.5em] mb-4"
              style={{
                fontFamily: BRAND.fonts.serif,
                background: `linear-gradient(180deg, ${BRAND.colors.gold[300]} 0%, ${BRAND.colors.gold[600]} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              BIZRA
            </h1>

            {/* Arabic Tagline */}
            <p
              className="text-2xl mb-8"
              style={{
                fontFamily: BRAND.fonts.arabic,
                color: `${BRAND.colors.gold[500]}80`,
              }}
            >
              {BRAND.arabic.tagline}
            </p>

            {/* CTA */}
            <p
              className="text-xs uppercase tracking-[0.4em] animate-pulse"
              style={{ color: BRAND.colors.gold[500] }}
            >
              Touch the Origin
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 2: GENESIS - Metrics Reveal */}
      <AnimatePresence mode="wait">
        {phase === 'GENESIS' && (
          <motion.div
            key="genesis"
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay: 0.5, duration: 1 }}
            className="flex-1 flex flex-col justify-end pb-12"
          >
            <div className="w-full px-8 md:px-24 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
              {/* POI Metric */}
              <div className="text-left">
                <h2
                  className="text-sm tracking-[0.3em] mb-2 uppercase"
                  style={{ color: BRAND.colors.gold[500] }}
                >
                  Proof of Impact
                </h2>
                <div
                  className="text-5xl md:text-6xl font-mono tabular-nums"
                  style={{ color: BRAND.colors.text.primary }}
                >
                  {displayPoi.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>

              {/* Hours Metric */}
              <div className="text-left md:text-right">
                <h2
                  className="text-sm tracking-[0.3em] mb-2 uppercase"
                  style={{ color: BRAND.colors.teal[500] }}
                >
                  Sacrifice Metric
                </h2>
                <div
                  className="text-5xl md:text-6xl font-mono tabular-nums"
                  style={{ color: BRAND.colors.text.primary }}
                >
                  {displayHours.toLocaleString()}
                  <span className="text-lg ml-2">HRS</span>
                </div>
                <p
                  className="text-xs mt-2 uppercase tracking-widest"
                  style={{ color: BRAND.colors.text.muted }}
                >
                  Ramadan 2023 — Present
                </p>
              </div>

              {/* CTA Button */}
              <motion.button
                onClick={handlePhaseClick}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="pointer-events-auto px-8 py-4 rounded-full text-xs tracking-[0.3em] uppercase backdrop-blur-md transition-all"
                style={{
                  border: `1px solid ${BRAND.colors.gold[500]}40`,
                  color: BRAND.colors.gold[500],
                  background: `${BRAND.colors.gold[500]}10`,
                }}
              >
                Visualize Legacy
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 3: CITADEL - Full 3D View */}
      <AnimatePresence mode="wait">
        {(phase === 'CITADEL' || phase === 'FLIGHT') && (
          <motion.div
            key="citadel"
            variants={slideUpVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex-1 flex flex-col justify-between py-8 px-8"
          >
            {/* Top Stats Bar */}
            <div className="flex justify-between items-start pointer-events-auto">
              {/* Quality Score */}
              <GlassCard>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: BRAND.colors.text.muted }}>
                  Ihsan Score
                </div>
                <div className="text-2xl font-mono" style={{ color: BRAND.colors.gold[500] }}>
                  {(metrics.ihsan * 100).toFixed(0)}%
                </div>
              </GlassCard>

              {/* Tests */}
              <GlassCard>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: BRAND.colors.text.muted }}>
                  Tests
                </div>
                <div className="text-2xl font-mono">
                  <span style={{ color: BRAND.colors.teal[500] }}>{metrics.testsPass}</span>
                  <span style={{ color: BRAND.colors.text.muted }}> / </span>
                  <span style={{ color: metrics.testsFail > 0 ? '#ef4444' : BRAND.colors.teal[500] }}>
                    {metrics.testsFail}
                  </span>
                </div>
              </GlassCard>

              {/* Phase Indicator */}
              <GlassCard>
                <div className="text-xs uppercase tracking-widest mb-1" style={{ color: BRAND.colors.text.muted }}>
                  Phase
                </div>
                <div className="text-lg font-mono" style={{ color: BRAND.colors.gold[500] }}>
                  {phase}
                </div>
              </GlassCard>
            </div>

            {/* Bottom Navigation */}
            <div className="flex justify-center gap-4 pointer-events-auto">
              <NavButton active={phase === 'CITADEL'} onClick={() => setPhase('CITADEL')}>
                Monument
              </NavButton>
              <NavButton active={phase === 'FLIGHT'} onClick={() => setPhase('FLIGHT')}>
                Ascend
              </NavButton>
              <NavButton active={false} onClick={() => setPhase('VOID')}>
                Reset
              </NavButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dev Mode Overlay */}
      {isDevMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 pointer-events-auto"
        >
          <GlassCard>
            <div className="text-xs font-mono space-y-1" style={{ color: BRAND.colors.teal[500] }}>
              <div>POI: {metrics.poi.toFixed(2)}</div>
              <div>Commits: {metrics.commits}</div>
              <div>Coverage: {(metrics.coverage * 100).toFixed(0)}%</div>
              <div>Phase: {phase}</div>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

// Glass Card Component
function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 rounded-lg backdrop-blur-md"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      {children}
    </div>
  );
}

// Navigation Button
function NavButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-6 py-2 rounded-full text-xs tracking-[0.2em] uppercase transition-all"
      style={{
        background: active ? `${BRAND.colors.gold[500]}20` : 'transparent',
        border: `1px solid ${active ? BRAND.colors.gold[500] : 'rgba(255,255,255,0.1)'}`,
        color: active ? BRAND.colors.gold[500] : BRAND.colors.text.secondary,
      }}
    >
      {children}
    </motion.button>
  );
}

export default GlassInterface;
