/**
 * PremiumLoading - Neural Network Loading Animation
 * ═══════════════════════════════════════════════════════════════════════════
 * Premium loading experience with unified design system
 * 
 * Features:
 * - 24 neural nodes in circular formation
 * - Connection lines with pulse animation
 * - Agent awakening counter (0 → 72)
 * - Consciousness level progression
 * - Unified color scheme from constants/genesis.ts
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useEffect, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BizraLogoAnimated } from '../brand';
import { 
  SYSTEM, 
  DESIGN, 
  LOADING_MESSAGES,
  METRICS,
} from '../../constants/genesis';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface NeuralNodePosition {
  id: number;
  x: number;
  y: number;
  angle: number;
}

interface Connection {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface PremiumLoadingProps {
  /** Target agent count (default: 72) */
  targetAgents?: number;
  /** Duration in ms to reach full load (default: 8000) */
  duration?: number;
  /** Callback when loading completes */
  onComplete?: () => void;
  /** Custom loading message */
  message?: string;
  /** Show BIZRA logo */
  showLogo?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function PremiumLoadingComponent({
  targetAgents = SYSTEM.TOTAL_AGENTS,
  duration = SYSTEM.LOADING_DURATION,
  onComplete,
  message,
  showLogo = true,
}: PremiumLoadingProps) {
  const [activeAgents, setActiveAgents] = useState(0);
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);

  // Colors from unified design system
  const goldPrimary = DESIGN.colors.gold[500];
  const goldLight = DESIGN.colors.gold[400];
  const goldDark = DESIGN.colors.gold[600];
  const navyDark = DESIGN.colors.navy[900];
  const navyMid = DESIGN.colors.navy[800];

  // Neural network configuration
  const NODE_COUNT = 24;
  const RADIUS = 140;
  const CENTER = 180;
  const VIEW_SIZE = 360;

  // Generate neural nodes in circular formation
  const nodes: NeuralNodePosition[] = useMemo(() => {
    return Array.from({ length: NODE_COUNT }, (_, i) => {
      const angle = (i / NODE_COUNT) * Math.PI * 2;
      return {
        id: i,
        x: CENTER + Math.cos(angle) * RADIUS,
        y: CENTER + Math.sin(angle) * RADIUS,
        angle: (angle * 180) / Math.PI,
      };
    });
  }, []);

  // Generate connections between nodes
  const connections: Connection[] = useMemo(() => {
    const conns: Connection[] = [];
    // Connect each node to nodes 3, 5, and 8 positions away (sacred geometry)
    for (let i = 0; i < NODE_COUNT; i++) {
      [3, 5, 8].forEach((offset) => {
        const j = (i + offset) % NODE_COUNT;
        conns.push({
          id: `${i}-${j}`,
          x1: nodes[i].x,
          y1: nodes[i].y,
          x2: nodes[j].x,
          y2: nodes[j].y,
        });
      });
    }
    return conns;
  }, [nodes]);

  // Progress animation
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / duration, 1);

      setProgress(pct * 100);
      setActiveAgents(Math.floor(pct * targetAgents));
      setMessageIndex(
        Math.min(
          Math.floor(pct * LOADING_MESSAGES.length),
          LOADING_MESSAGES.length - 1
        )
      );

      if (pct >= 1) {
        clearInterval(interval);
        if (onComplete) {
          setTimeout(onComplete, 500);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [duration, targetAgents, onComplete]);

  const currentMessage = message || LOADING_MESSAGES[messageIndex];
  const consciousnessLevel = (progress / 100) * METRICS.neural.consciousness;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: navyDark }}
    >
      {/* Animated Background Gradient */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${navyDark} 0%, ${navyMid} 50%, ${navyDark} 100%)`,
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, ${goldPrimary}15 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Logo */}
      {showLogo && (
        <motion.div
          className="relative z-10 mb-8"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        >
          <BizraLogoAnimated size="sm" />
        </motion.div>
      )}

      {/* Neural Network Visualization */}
      <div className="relative" style={{ width: VIEW_SIZE, height: VIEW_SIZE }}>
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="w-full h-full"
          style={{ filter: `drop-shadow(0 0 10px ${goldPrimary}50)` }}
        >
          {/* Gradient Definitions */}
          <defs>
            <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={goldPrimary} stopOpacity="1" />
              <stop offset="100%" stopColor={navyMid} stopOpacity="0.8" />
            </radialGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={goldDark} stopOpacity="0.3" />
              <stop offset="100%" stopColor={goldLight} stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Connection Lines */}
          <g>
            {connections.map((conn, index) => (
              <motion.line
                key={conn.id}
                x1={conn.x1}
                y1={conn.y1}
                x2={conn.x2}
                y2={conn.y2}
                stroke={`${goldPrimary}50`}
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 2, delay: index * 0.015 }}
              />
            ))}
          </g>

          {/* Pulse particles along connections */}
          {connections.slice(0, 12).map((conn, index) => (
            <motion.circle
              key={`pulse-${conn.id}`}
              r="2.5"
              fill={goldPrimary}
              initial={{ opacity: 0 }}
              animate={{
                cx: [conn.x1, conn.x2],
                cy: [conn.y1, conn.y2],
                opacity: [0, 0.9, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.3,
                ease: 'linear',
              }}
            />
          ))}

          {/* Neural Nodes */}
          {nodes.map((node, index) => {
            const isActive = index <= (progress / 100) * NODE_COUNT;
            return (
              <motion.g key={node.id}>
                {/* Glow effect */}
                {isActive && (
                  <motion.circle
                    cx={node.x}
                    cy={node.y}
                    r="12"
                    fill="none"
                    stroke={`${goldPrimary}60`}
                    strokeWidth="1.5"
                    animate={{
                      r: [12, 18, 12],
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: index * 0.1,
                    }}
                  />
                )}
                {/* Node */}
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r="7"
                  fill={isActive ? goldPrimary : `${goldPrimary}30`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.04 }}
                />
              </motion.g>
            );
          })}

          {/* Center Core - Outer */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r="40"
            fill="url(#coreGradient)"
            animate={{
              r: [38, 43, 38],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Center Core - Inner */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r="24"
            fill={goldPrimary}
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </svg>

        {/* Center Agent Counter */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="text-3xl font-bold"
              style={{ 
                color: navyDark,
                fontFamily: DESIGN.fonts.mono,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {activeAgents}
            </motion.div>
            <div 
              className="text-[10px] tracking-widest uppercase"
              style={{ 
                color: navyDark,
                fontFamily: DESIGN.fonts.mono,
                opacity: 0.8,
              }}
            >
              AGENTS
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10 mt-8 w-72 md:w-80">
        <div 
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: `${DESIGN.colors.text.primary}15` }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${goldDark}, ${goldLight})`,
            }}
          />
        </div>
      </div>

      {/* Consciousness Message */}
      <div className="relative z-10 mt-6 text-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            className="text-base md:text-lg font-medium"
            style={{ 
              color: goldPrimary,
              fontFamily: DESIGN.fonts.sans,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {currentMessage}
          </motion.p>
        </AnimatePresence>
        <p 
          className="text-sm mt-2"
          style={{ 
            color: DESIGN.colors.text.muted,
            fontFamily: DESIGN.fonts.mono,
          }}
        >
          Consciousness Level: {consciousnessLevel.toFixed(1)}%
        </p>
      </div>

      {/* Live Metrics (bottom corner) */}
      <div 
        className="absolute bottom-4 right-4 text-right text-xs"
        style={{ 
          color: DESIGN.colors.text.muted,
          fontFamily: DESIGN.fonts.mono,
        }}
      >
        <div>Quantum Coherence: {METRICS.neural.quantumCoherence}%</div>
        <div>Data Flow: {METRICS.neural.dataFlow} TB/s</div>
      </div>
    </div>
  );
}

export const PremiumLoading = memo(PremiumLoadingComponent);
export default PremiumLoading;
