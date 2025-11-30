/**
 * OnboardingJourney - 72-Second Consciousness Journey
 * ═══════════════════════════════════════════════════════════════════════════
 * Premium onboarding experience with unified design system
 * 
 * Features:
 * - 5 stages: Awakening → Sacred Geometry → Quantum Entanglement → Blockchain → Consciousness
 * - Neural nodes with mouse interaction
 * - Progress indicator with 72-second timer
 * - Skip button for returning users
 * - Unified color scheme: Gold (#C9A962), Navy (#0A1628)
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, SkipForward } from 'lucide-react';
import { 
  SYSTEM, 
  JOURNEY_STAGES, 
  DESIGN,
  METRICS,
} from '../../constants/genesis';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface NeuralNode {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

interface OnboardingJourneyProps {
  /** Callback when journey completes */
  onComplete: () => void;
  /** Allow skipping */
  allowSkip?: boolean;
  /** Custom duration in seconds (default: 72) */
  duration?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SACRED GEOMETRY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SacredGeometry = memo(({ type }: { type: string }) => {
  const strokeColor = DESIGN.colors.gold[500];
  const strokeOpacity = 0.4;
  
  const getGeometry = () => {
    switch (type) {
      case 'seed':
        return (
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Seed of Life - 7 circles */}
            <circle cx="200" cy="200" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="200" cy="120" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="200" cy="280" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="131" cy="160" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="269" cy="160" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="131" cy="240" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="269" cy="240" r="80" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
          </svg>
        );
      case 'flower':
        return (
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Flower of Life - 19 circles */}
            <circle cx="200" cy="200" r="52" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity * 1.2} />
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = 200 + Math.cos(rad) * 52;
              const y = 200 + Math.sin(rad) * 52;
              return (
                <circle key={i} cx={x} cy={y} r="52" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
              );
            })}
            {[30, 90, 150, 210, 270, 330].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = 200 + Math.cos(rad) * 90;
              const y = 200 + Math.sin(rad) * 90;
              return (
                <circle key={`outer-${i}`} cx={x} cy={y} r="52" fill="none" stroke={strokeColor} strokeWidth="1" opacity={strokeOpacity * 0.6} />
              );
            })}
          </svg>
        );
      case 'quantum':
        return (
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Quantum orbital rings */}
            <ellipse cx="200" cy="200" rx="150" ry="45" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <ellipse cx="200" cy="200" rx="150" ry="45" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} transform="rotate(60 200 200)" />
            <ellipse cx="200" cy="200" rx="150" ry="45" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} transform="rotate(120 200 200)" />
            {/* Electron positions */}
            {[0, 120, 240].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x = 200 + Math.cos(rad) * 150;
              const y = 200 + Math.sin(rad) * 45;
              return (
                <circle key={i} cx={x} cy={y} r="8" fill={strokeColor} opacity="0.8" />
              );
            })}
            <circle cx="200" cy="200" r="16" fill={strokeColor} opacity="0.9" />
          </svg>
        );
      case 'blockchain':
        return (
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Hexagonal blockchain pattern */}
            <polygon points="200,50 300,100 300,200 200,250 100,200 100,100" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity * 0.8} />
            <polygon points="200,100 270,135 270,205 200,240 130,205 130,135" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <polygon points="200,150 240,170 240,210 200,230 160,210 160,170" fill="none" stroke={strokeColor} strokeWidth="2" opacity={strokeOpacity * 1.5} />
            {/* Hash connection lines */}
            <line x1="200" y1="50" x2="200" y2="350" stroke={strokeColor} strokeWidth="1" opacity="0.2" strokeDasharray="4,4" />
            <line x1="50" y1="200" x2="350" y2="200" stroke={strokeColor} strokeWidth="1" opacity="0.2" strokeDasharray="4,4" />
            {/* Block nodes */}
            <circle cx="200" cy="50" r="6" fill={strokeColor} opacity="0.7" />
            <circle cx="300" cy="100" r="6" fill={strokeColor} opacity="0.7" />
            <circle cx="100" cy="100" r="6" fill={strokeColor} opacity="0.7" />
          </svg>
        );
      case 'consciousness':
        return (
          <svg viewBox="0 0 400 400" className="w-full h-full">
            {/* Expanding consciousness rings */}
            <circle cx="200" cy="200" r="30" fill="none" stroke={strokeColor} strokeWidth="2.5" opacity={strokeOpacity * 2} />
            <circle cx="200" cy="200" r="60" fill="none" stroke={strokeColor} strokeWidth="2" opacity={strokeOpacity * 1.5} />
            <circle cx="200" cy="200" r="100" fill="none" stroke={strokeColor} strokeWidth="1.5" opacity={strokeOpacity} />
            <circle cx="200" cy="200" r="140" fill="none" stroke={strokeColor} strokeWidth="1" opacity={strokeOpacity * 0.7} />
            <circle cx="200" cy="200" r="180" fill="none" stroke={strokeColor} strokeWidth="0.5" opacity={strokeOpacity * 0.4} />
            {/* Central eye of consciousness */}
            <circle cx="200" cy="200" r="8" fill={strokeColor} opacity="1" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
    >
      <div className="w-80 h-80 md:w-[420px] md:h-[420px]">{getGeometry()}</div>
    </motion.div>
  );
});

SacredGeometry.displayName = 'SacredGeometry';

// ═══════════════════════════════════════════════════════════════════════════
// NEURAL NODES COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const NeuralNodes = memo(({ count = 24 }: { count?: number }) => {
  const [nodes] = useState<NeuralNode[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 3, // 3-6px
      delay: Math.random() * 3,
    }))
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full"
          style={{
            left: `${node.x}%`,
            top: `${node.y}%`,
            width: node.size,
            height: node.size,
            backgroundColor: DESIGN.colors.gold[500],
            boxShadow: `0 0 ${node.size * 3}px ${DESIGN.colors.gold[500]}80`,
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 0.9, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: node.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

NeuralNodes.displayName = 'NeuralNodes';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function OnboardingJourneyComponent({
  onComplete,
  allowSkip = true,
  duration = SYSTEM.ONBOARDING_DURATION,
}: OnboardingJourneyProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [activeAgents, setActiveAgents] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stageDuration = duration / JOURNEY_STAGES.length;
  const progress = (elapsed / duration) * 100;
  const consciousness = Math.floor((elapsed / duration) * METRICS.neural.consciousness);

  // Timer effect
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        
        // Update active agents (0 → 72)
        setActiveAgents(Math.min(SYSTEM.TOTAL_AGENTS, Math.floor((next / duration) * SYSTEM.TOTAL_AGENTS)));
        
        // Check stage transitions
        const newStage = Math.min(
          Math.floor(next / stageDuration),
          JOURNEY_STAGES.length - 1
        );
        if (newStage !== currentStage) {
          setCurrentStage(newStage);
        }
        
        // Complete
        if (next >= duration) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setTimeout(onComplete, 1500);
          return duration;
        }
        
        return next;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [duration, stageDuration, currentStage, onComplete]);

  const handleSkip = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onComplete();
  }, [onComplete]);

  const handleAdvance = useCallback(() => {
    if (currentStage < JOURNEY_STAGES.length - 1) {
      setCurrentStage((prev) => prev + 1);
      setElapsed((prev) => Math.min(prev + stageDuration, duration));
    } else {
      handleSkip();
    }
  }, [currentStage, stageDuration, duration, handleSkip]);

  const stage = JOURNEY_STAGES[currentStage];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden cursor-pointer"
      style={{ backgroundColor: DESIGN.colors.navy[900] }}
      onClick={handleAdvance}
    >
      {/* Background Gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${DESIGN.colors.navy[800]} 0%, ${DESIGN.colors.navy[900]} 100%)`,
        }}
      />
      
      {/* Sacred Geometry Background */}
      <SacredGeometry type={stage.geometryType} />

      {/* Neural Nodes */}
      <NeuralNodes count={20 + currentStage * 8} />

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 md:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -20 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            className="text-center max-w-2xl"
          >
            {/* Stage Content Card */}
            <div 
              className="p-8 md:p-10 rounded-2xl"
              style={{
                background: DESIGN.glass.background,
                backdropFilter: `blur(${DESIGN.glass.blur})`,
                border: `1px solid ${DESIGN.glass.border}`,
                boxShadow: DESIGN.shadow.lg,
              }}
            >
              {/* Stage Number */}
              <motion.div
                className="mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span 
                  className="text-xs tracking-[0.3em] uppercase"
                  style={{ 
                    color: DESIGN.colors.text.muted,
                    fontFamily: DESIGN.fonts.mono,
                  }}
                >
                  Stage {stage.id} of {JOURNEY_STAGES.length}
                </span>
              </motion.div>
              
              <motion.h1
                className="text-3xl md:text-4xl lg:text-5xl mb-4"
                style={{ 
                  fontFamily: DESIGN.fonts.display,
                  color: DESIGN.colors.gold[500],
                  textShadow: `0 0 40px ${DESIGN.colors.gold[500]}60`,
                }}
                animate={{
                  textShadow: [
                    `0 0 30px ${DESIGN.colors.gold[500]}40`,
                    `0 0 50px ${DESIGN.colors.gold[500]}70`,
                    `0 0 30px ${DESIGN.colors.gold[500]}40`,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                {stage.title}
              </motion.h1>

              <h2 
                className="text-lg md:text-xl mb-6"
                style={{ 
                  fontFamily: DESIGN.fonts.sans,
                  color: DESIGN.colors.text.secondary,
                  fontWeight: 300,
                }}
              >
                {stage.subtitle}
              </h2>

              <p 
                className="text-sm md:text-base leading-relaxed"
                style={{ 
                  fontFamily: DESIGN.fonts.sans,
                  color: DESIGN.colors.text.muted,
                  lineHeight: 1.8,
                }}
              >
                {stage.description}
              </p>

              {/* Click to Continue */}
              <motion.div
                className="mt-8 flex items-center justify-center gap-2 text-sm"
                style={{ color: `${DESIGN.colors.gold[500]}80` }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span style={{ fontFamily: DESIGN.fonts.sans }}>Click to continue</span>
                <ChevronRight className="w-4 h-4" />
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-72 md:w-80">
        <div 
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: `${DESIGN.colors.text.primary}10` }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ 
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${DESIGN.colors.gold[600]}, ${DESIGN.colors.gold[400]})`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <div 
          className="text-center mt-3 text-sm tracking-wider"
          style={{ 
            color: DESIGN.colors.gold[500],
            fontFamily: DESIGN.fonts.mono,
          }}
        >
          {Math.floor(elapsed)}s / {duration}s
        </div>
      </div>

      {/* Status Indicators */}
      <div className="absolute top-6 md:top-8 right-6 md:right-8 text-right">
        <div 
          className="text-xs md:text-sm"
          style={{ 
            color: DESIGN.colors.gold[500],
            fontFamily: DESIGN.fonts.mono,
          }}
        >
          Active Agents: <span className="font-semibold">{activeAgents}</span>/{SYSTEM.TOTAL_AGENTS}
        </div>
      </div>

      <div className="absolute top-6 md:top-8 left-6 md:left-8">
        <div 
          className="text-xs md:text-sm"
          style={{ 
            color: DESIGN.colors.gold[500],
            fontFamily: DESIGN.fonts.mono,
          }}
        >
          Consciousness: <span className="font-semibold">{consciousness.toFixed(1)}%</span>
        </div>
      </div>

      {/* Skip Button */}
      {allowSkip && (
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            handleSkip();
          }}
          className="absolute bottom-6 md:bottom-8 right-6 md:right-8 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
          style={{
            backgroundColor: `${DESIGN.colors.gold[500]}15`,
            border: `1px solid ${DESIGN.colors.gold[500]}`,
            color: DESIGN.colors.gold[500],
            fontFamily: DESIGN.fonts.sans,
          }}
          whileHover={{ 
            scale: 1.05,
            backgroundColor: `${DESIGN.colors.gold[500]}25`,
          }}
          whileTap={{ scale: 0.95 }}
        >
          <SkipForward className="w-4 h-4" />
          <span className="hidden sm:inline">Skip to Interface</span>
          <span className="sm:hidden">Skip</span>
        </motion.button>
      )}

      {/* Stage Dots */}
      <div className="absolute bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        {JOURNEY_STAGES.map((_, index) => (
          <motion.div
            key={index}
            className="rounded-full transition-all duration-300"
            style={{
              width: index === currentStage ? 10 : 8,
              height: index === currentStage ? 10 : 8,
              backgroundColor: index <= currentStage 
                ? DESIGN.colors.gold[500] 
                : `${DESIGN.colors.text.primary}20`,
              boxShadow: index === currentStage 
                ? `0 0 10px ${DESIGN.colors.gold[500]}80` 
                : 'none',
            }}
            animate={index === currentStage ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}

export const OnboardingJourney = memo(OnboardingJourneyComponent);
export default OnboardingJourney;
