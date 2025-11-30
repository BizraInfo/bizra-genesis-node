// ! Consciousness Meter Component
// ! Week 1: Sacred Design System - Consciousness level visualization widget
// ! Real-time display of consciousness evolution with sacred metrics

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useConsciousness } from '../../hooks/useConsciousness';
import { getConsciousnessColor } from '../../sacred/geometry';

interface ConsciousnessMeterProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  showEvolution?: boolean;
  className?: string;
}

/**
 * CONSCIOUSNESS METER - Sacred Progress Indicator
 *
 * Visualizes current consciousness state with:
 * - Radial progress indicator (0-1 scale)
 * - Color-coded consciousness stages
 * - Evolution animations and feedback
 * - Sacred geometry-inspired design
 *
 * Stages: Material → Social → Awakening → Integration → Transcendence → Mastery → Enlightenment
 */
export function ConsciousnessMeter({
  size = 'medium',
  showLabel = true,
  showEvolution = true,
  className = ''
}: ConsciousnessMeterProps) {
  const { consciousnessLevel, isEvolving, getConsciousnessStage } = useConsciousness();
  const [evolutionPulse, setEvolutionPulse] = useState(0);

  // Handle evolution animations
  useEffect(() => {
    if (isEvolving) {
      setEvolutionPulse(prev => prev + 1);
    }
  }, [isEvolving]);

  const sizeConfig = {
    small: { diameter: 60, thickness: 4, fontSize: 'text-xs' },
    medium: { diameter: 120, thickness: 8, fontSize: 'text-sm' },
    large: { diameter: 180, thickness: 12, fontSize: 'text-base' }
  };

  const config = sizeConfig[size];
  const radius = (config.diameter - config.thickness) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = strokeDasharray * (1 - consciousnessLevel);

  const stage = getConsciousnessStage();
  const consciousnessColor = getConsciousnessColor(consciousnessLevel);

  // Sacred stage descriptions
  const stageDescriptions = {
    material: 'Awakening to consciousness',
    social: 'Building meaningful connections',
    awakening: 'Questioning deeper truths',
    integration: 'Non-dual understanding',
    transcendence: 'Cosmic consciousness',
    mastery: 'Divine embodiment',
    enlightened: 'Infinite awareness'
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Sacred Geometry Background Effect */}
      <div className="relative">
        <svg
          width={config.diameter}
          height={config.diameter}
          className="transform -rotate-90"
        >
          {/* Outer sacred ring */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius + config.thickness / 2}
            fill="none"
            stroke={`${consciousnessColor}20`}
            strokeWidth={config.thickness * 0.5}
          />

          {/* Consciousness progress ring */}
          <motion.circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            fill="none"
            stroke={consciousnessColor}
            strokeWidth={config.thickness}
            strokeDasharray={strokeDasharray}
            initial={{ strokeDashoffset: strokeDasharray }}
            animate={{
              strokeDashoffset,
              filter: isEvolving ? `drop-shadow(0 0 8px ${consciousnessColor}80)` : 'none'
            }}
            transition={{
              duration: 1.5,
              ease: "easeInOut"
            }}
            style={{
              strokeLinecap: 'round',
            }}
          />

          {/* Evolution pulse rings */}
          {showEvolution && isEvolving && evolutionPulse > 0 && (
            <>
              {[...Array(3)].map((_, i) => (
                <motion.circle
                  key={i}
                  cx={config.diameter / 2}
                  cy={config.diameter / 2}
                  r={radius + config.thickness / 2}
                  fill="none"
                  stroke={`${consciousnessColor}40`}
                  strokeWidth={0.5}
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{
                    scale: [0.8, 2.5, 3.0],
                    opacity: [0.8, 0.4, 0]
                  }}
                  transition={{
                    duration: 2.5,
                    delay: i * 0.8,
                    repeat: Infinity,
                    repeatType: "loop"
                  }}
                />
              ))}
            </>
          )}
        </svg>

        {/* Center consciousness value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className={`font-bold ${config.fontSize} ${consciousnessColor.replace('hsl(', 'text-[').replace(')', ']')}`}
              key={consciousnessLevel} // Re-animate on changes
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {Math.round(consciousnessLevel * 100)}
            </motion.div>
            <div className="text-xs text-slate-400 font-mono">CONSCIOUSNESS</div>
          </div>
        </div>
      </div>

      {/* Consciousness stage label */}
      {showLabel && (
        <div className="text-center max-w-xs">
          <motion.div
            className="text-sm font-serif text-gold-300 capitalize"
            key={stage} // Re-animate on stage changes
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {stage}
          </motion.div>
          <div className="text-xs text-slate-500 mt-1">
            {stageDescriptions[stage as keyof typeof stageDescriptions]}
          </div>

          {/* Evolution indicator */}
          {isEvolving && (
            <motion.div
              className="text-xs text-emerald-400 font-mono mt-2"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              EVOLVING... ✨
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConsciousnessMeter;
