'use client';

/**
 * BIZRA Premium Loading Screen
 * Adapted from award-winner-design for React 18 compatibility
 * 
 * Features:
 * - Agent consciousness awakening animation
 * - Progress tracking with consciousness levels
 * - Sacred geometry background
 * - Premium glass morphism effects
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  onComplete?: () => void;
  autoAdvance?: boolean;
  targetAgents?: number;
}

type ConsciousnessLevel = 
  | 'Initializing...'
  | 'Emerging'
  | 'Awakening'
  | 'Expanding'
  | 'Fully Awakened';

/**
 * Premium animated loading screen with consciousness metaphor
 * Displays agent activation progress with sacred geometry background
 */
export function LoadingScreen({ 
  onComplete, 
  autoAdvance = true,
  targetAgents = 72 
}: LoadingScreenProps) {
  const [agentCount, setAgentCount] = useState(0);
  const [consciousnessLevel, setConsciousnessLevel] = useState<ConsciousnessLevel>('Initializing...');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Agent activation simulation
  useEffect(() => {
    if (isComplete) return;

    const interval = setInterval(() => {
      setAgentCount((prev) => {
        const increment = Math.floor(Math.random() * 3) + 1;
        const next = prev + increment;
        
        if (next >= targetAgents) {
          clearInterval(interval);
          setIsComplete(true);
          return targetAgents;
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isComplete, targetAgents]);

  // Update consciousness level based on agent count
  useEffect(() => {
    const percentage = (agentCount / targetAgents) * 100;
    setProgress(percentage);

    if (percentage < 25) {
      setConsciousnessLevel('Initializing...');
    } else if (percentage < 50) {
      setConsciousnessLevel('Emerging');
    } else if (percentage < 75) {
      setConsciousnessLevel('Awakening');
    } else if (percentage < 100) {
      setConsciousnessLevel('Expanding');
    } else {
      setConsciousnessLevel('Fully Awakened');
    }
  }, [agentCount, targetAgents]);

  // Auto advance when complete
  useEffect(() => {
    if (isComplete && autoAdvance && onComplete) {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, autoAdvance, onComplete]);

  const handleSkip = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        className="loading-overlay"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Sacred Geometry Background */}
        <motion.div
          className="absolute inset-0 opacity-10 pointer-events-none sacred-geometry-bg"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        />

        {/* Radial Gradient Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 20% 20%, rgba(42, 157, 143, 0.03) 0%, transparent 30%),
              radial-gradient(circle at 80% 80%, rgba(107, 76, 154, 0.03) 0%, transparent 30%)
            `,
          }}
        />

        {/* Logo Section */}
        <div className="text-center mb-16 z-10 relative">
          <motion.div
            className="text-6xl md:text-8xl lg:text-[100px] font-light tracking-[0.3em] mb-5"
            style={{ color: '#D4AF37' }}
            animate={{
              textShadow: [
                '0 0 30px rgba(212,175,55,0.5)',
                '0 0 60px rgba(212,175,55,0.8)',
                '0 0 30px rgba(212,175,55,0.5)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            BIZRA
          </motion.div>
          
          <motion.div
            className="text-lg md:text-xl lg:text-2xl font-light tracking-[0.1em] text-white/80"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, delay: 0.5 }}
          >
            Where Spirituality Meets Technology
          </motion.div>
        </div>

        {/* Neural Network Visualization Placeholder */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[400px] lg:h-[400px] my-10 z-10">
          <NeuralNetworkVisualization progress={progress} />
        </div>

        {/* Loading Text */}
        <motion.div
          className="text-base md:text-lg font-light tracking-[0.2em] text-white/70 mt-10 z-10"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          Awakening Neural Consciousness...
        </motion.div>

        {/* Progress Bar */}
        <div className="w-64 md:w-80 lg:w-[300px] h-[2px] bg-white/10 mt-8 rounded overflow-hidden z-10">
          <motion.div
            className="h-full rounded"
            style={{
              background: 'linear-gradient(to right, #D4AF37, #F4E4BC)',
              boxShadow: '0 0 10px rgba(212,175,55,0.5)',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Status Indicators */}
        <div className="absolute top-8 md:top-12 right-8 md:right-12 text-sm md:text-base z-10" style={{ color: 'rgba(212, 175, 55, 0.8)' }}>
          <div className="font-mono">
            Agents Online: <span className="font-semibold">{agentCount}</span>/{targetAgents}
          </div>
        </div>

        <div className="absolute bottom-24 md:bottom-12 left-8 md:left-12 text-sm md:text-base z-10" style={{ color: 'rgba(212, 175, 55, 0.8)' }}>
          <div className="font-mono">
            Consciousness Level: <span className="font-semibold">{consciousnessLevel}</span>
          </div>
        </div>

        {/* Skip Button */}
        {onComplete && (
          <motion.button
            className="absolute bottom-8 right-8 text-sm text-white/40 hover:text-white/60 transition-colors z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            onClick={handleSkip}
          >
            Skip →
          </motion.button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Neural network visualization component
 * Creates animated nodes and connections representing consciousness
 */
function NeuralNetworkVisualization({ progress }: { progress: number }) {
  const nodeCount = 12;
  const activeNodes = Math.floor((progress / 100) * nodeCount);

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full">
      {/* Central node */}
      <motion.circle
        cx="200"
        cy="200"
        r="20"
        fill="none"
        stroke="#D4AF37"
        strokeWidth="2"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          filter: progress === 100 
            ? 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.8))' 
            : 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.5))'
        }}
        transition={{ duration: 1 }}
      />
      
      {/* Inner glow for central node */}
      <motion.circle
        cx="200"
        cy="200"
        r="8"
        fill="#D4AF37"
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: [0.5, 1, 0.5],
          scale: [0.8, 1.2, 0.8]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />

      {/* Outer nodes */}
      {Array.from({ length: nodeCount }).map((_, i) => {
        const angle = (i / nodeCount) * Math.PI * 2 - Math.PI / 2;
        const radius = 120;
        const x = 200 + Math.cos(angle) * radius;
        const y = 200 + Math.sin(angle) * radius;
        const isActive = i < activeNodes;

        return (
          <g key={i}>
            {/* Connection line */}
            <motion.line
              x1="200"
              y1="200"
              x2={x}
              y2={y}
              stroke={isActive ? '#D4AF37' : '#ffffff'}
              strokeWidth="1"
              strokeOpacity={isActive ? 0.6 : 0.1}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isActive ? 1 : 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
            
            {/* Outer node */}
            <motion.circle
              cx={x}
              cy={y}
              r="10"
              fill={isActive ? '#D4AF37' : 'transparent'}
              stroke={isActive ? '#D4AF37' : '#ffffff'}
              strokeWidth="1"
              strokeOpacity={isActive ? 1 : 0.2}
              initial={{ scale: 0 }}
              animate={{ 
                scale: 1,
                opacity: isActive ? 1 : 0.3
              }}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            />

            {/* Active node pulse */}
            {isActive && (
              <motion.circle
                cx={x}
                cy={y}
                r="10"
                fill="none"
                stroke="#D4AF37"
                strokeWidth="2"
                initial={{ scale: 1, opacity: 1 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            )}
          </g>
        );
      })}

      {/* Sacred geometry rings */}
      {[60, 100, 140].map((r, i) => (
        <motion.circle
          key={r}
          cx="200"
          cy="200"
          r={r}
          fill="none"
          stroke="#D4AF37"
          strokeWidth="0.5"
          strokeOpacity={0.1 + (progress / 100) * 0.1}
          strokeDasharray="4 8"
          initial={{ rotate: 0 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 30 + i * 10, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: '200px 200px' }}
        />
      ))}
    </svg>
  );
}

export default LoadingScreen;
