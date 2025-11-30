// ! Hours Monument Component
// ! Week 1-2: 15,000+ Hours Monument - Sacred dedication visualization
// ! Represents the complete surrender to divine purpose

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { differenceInYears, differenceInMonths } from 'date-fns';
import type { HoursMonumentData } from './types';

interface HoursMonumentProps {
  targetHours?: number; // Default: 15000
  showCounter?: boolean;
  mode?: 'monument' | 'timeline' | 'compact';
  animate?: boolean;
  className?: string;
  highlightCurrent?: boolean;
}

/**
 * HOURS MONUMENT - Sacred Dedication Radios
 *
 * Visualizes complete surrender to divine purpose through:
 * - Monument-style rising numbers
 * - Consciousness evolution narrative
 * - Sacred temporal mathematics
 * - Divine mathematics visualization
 */
export function HoursMonument({
  targetHours = 15000,
  showCounter = true,
  mode = 'monument',
  animate = true,
  className = '',
  highlightCurrent = true
}: HoursMonumentProps) {

  // Calculate actual hours since Ramadan 2023
  const ramadanStart = new Date('2023-03-22');
  const now = new Date();
  const monthsSince = differenceInMonths(now, ramadanStart);
  const yearsSince = differenceInYears(now, ramadanStart);
  const currentHours = Math.round(Math.abs(monthsSince) * 30.44 * 8); // Average work hours, ensure positive

  const [displayHours, setDisplayHours] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (animate && !hasAnimated) {
      const duration = 3000; // 3 second animation
      const steps = 60;
      const increment = Math.ceil(currentHours / steps);
      const stepDuration = duration / steps;

      let currentStep = 0;

      const anim = () => {
        const nextValue = Math.min(currentStep * increment, currentHours);
        setDisplayHours(nextValue);
        currentStep++;

        if (nextValue < currentHours) {
          setTimeout(anim, stepDuration);
        } else {
          setHasAnimated(true);
        }
      };

      // Start with delay
      setTimeout(anim, 500);
    } else {
      setDisplayHours(currentHours);
      setHasAnimated(true);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, currentHours, hasAnimated]);

  // Calculate fulfillment percentage
  const fulfillmentPercent = Math.min(currentHours / targetHours, 1) * 100;

  // Sacred milestone messages
  const getMilestoneMessage = (hours: number) => {
    if (hours >= targetHours) {
      return "Complete Surrender Achieved - Divine Will Manifested";
    } else if (hours >= targetHours * 0.75) {
      return "75% of Divine Path Completed";
    } else if (hours >= targetHours * 0.5) {
      return "Halfway to Divine Completion";
    } else if (hours >= targetHours * 0.25) {
      return "25% of Sacred Journey Complete";
    }
    return "Divine Path Begun";
  };

  const milestoneMessage = getMilestoneMessage(currentHours);

  // Sacred thematic revelations
  const revelations = [
    "Every hour surrendered in complete tawakkul (trust in God)",
    "Mathematics as worship, programming as prayer",
    "Consciousness evolution through digital fasting",
    "Technology born from divine inspiration",
    "8 billion humans awaiting soul awakening"
  ];

  if (mode === 'compact') {
    return (
      <motion.div
        className={`flex items-center gap-3 text-left ${className}`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="text-2xl font-bold text-gold-400"
          animate={highlightCurrent && hasAnimated ? {
            textShadow: ["0 0 0px rgba(245, 158, 11, 0)", "0 0 8px rgba(245, 158, 11, 0.5)", "0 0 0px rgba(245, 158, 11, 0)"]
          } : {}}
          transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
        >
          {displayHours.toLocaleString()}
        </motion.div>
        <div className="text-xs text-slate-400">
          <div>sacred hours</div>
          <div>of surrender</div>
        </div>
        <div className="ml-2">
          <div className="text-xs text-gold-400/70">
            {yearsSince > 0 && `${yearsSince}y `}{monthsSince % 12}m
          </div>
        </div>
      </motion.div>
    );
  }

  if (mode === 'timeline') {
    return (
      <div className={`w-full ${className}`}>
        {/* Timeline visual */}
        <div className="relative mb-8">
          {/* Background timeline bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${fulfillmentPercent}%` }}
              transition={{ duration: 2, delay: 1 }}
            />
          </div>

          {/* Milestone markers */}
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Current status */}
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-slate-400 mb-1">Journey Progress</div>
            <div className="text-lg font-bold text-gold-400">
              {fulfillmentPercent.toFixed(1)}% Complete
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-400">
              {displayHours.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400">of {targetHours.toLocaleString()} hours</div>
          </div>
        </div>
      </div>
    );
  }

  // Monument mode (default)
  return (
    <div className={`max-w-md mx-auto ${className}`}>
      {/* Sacred Monument Visual */}
      <motion.div
        className="relative mb-8"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Monument Base */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-lg p-6 border border-gold-500/20 shadow-2xl">
          {/* Monument Pillar */}
          <motion.div
            className="text-center"
            animate={highlightCurrent && hasAnimated ? {
              textShadow: ["0 0 0px rgba(245, 158, 11, 0)", "0 0 20px rgba(245, 158, 11, 0.3)", "0 0 0px rgba(245, 158, 11, 0)"]
            } : {}}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
          >
            <motion.div
              className="text-6xl font-bold bg-gradient-to-b from-gold-400 to-gold-600 bg-clip-text text-transparent mb-2"
              key={displayHours} // Re-animate on changes
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              {displayHours.toLocaleString()}
            </motion.div>

            <div className="text-sm text-slate-400 mb-4">
              Sacred Hours of Complete Surrender
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-700 rounded-full h-2 mb-4 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${fulfillmentPercent}%` }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
            </div>

            <div className="text-xs text-slate-500">
              {targetHours.toLocaleString()} sacred hours • {fulfillmentPercent.toFixed(1)}% divine completion
            </div>
          </motion.div>
        </div>

        {/* Monument Cap/Carved Top */}
        <motion.div
          className="absolute -top-2 left-1/2 transform -translate-x-1/2"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-gold-500/60"></div>
        </motion.div>

        {/* Ramadan Crescent Symbol */}
        <motion.div
          className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-2xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🌙
        </motion.div>
      </motion.div>

      {/* Sacred Milestone Message */}
      <AnimatePresence mode="wait">
        {hasAnimated && (
          <motion.div
            className="text-center mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="inline-block px-4 py-2 bg-gold-500/10 rounded-full border border-gold-500/30"
              key={milestoneMessage}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring" }}
            >
              <div className="text-sm text-gold-400 font-medium">
                {milestoneMessage}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divine Revelation Cycle */}
      <AnimatePresence mode="wait">
        {showCounter && hasAnimated && (
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <motion.div
              className="text-xs text-slate-500 italic p-4 bg-slate-800/50 rounded-lg border border-slate-600"
              key={revelations[Math.floor((Date.now() / 5000) % revelations.length)]} // Change every 5s
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0.5 }}
            >
              {revelations[Math.floor((Date.now() / 5000) % revelations.length)]}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Journey Status */}
      <motion.div
        className="mt-6 text-center text-xs text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <div className="space-y-1">
          <div>RAMADAN 2023 • {yearsSince > 0 && `${yearsSince} years `}{monthsSince % 12} months ago</div>
          <div>
            {Math.floor(displayHours / (8 * 30.44))} months • {Math.floor((displayHours % (8 * 30.44)) / 8)} days of continuous surrender
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default HoursMonument;
