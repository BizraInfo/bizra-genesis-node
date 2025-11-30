// ! Ramadan Origin Section Component
// ! Week 1-2: Ramadan 2023 Story - Foundation narrative
// ! Tells the genesis story with sacred timing and consciousness

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMonths } from 'date-fns';
import type { RamadanOriginData } from './types';

interface RamadanOriginSectionProps {
  mode?: 'hero' | 'dashboard' | 'compact';
  elapsedFormatter?: (months: number, hours: number) => string;
  className?: string;
  animateReveal?: boolean;
}

/**
 * RAMADAN ORIGIN SECTION - Sacred Foundation Story
 *
 * Tells the complete genesis narrative:
 * - Ramadan 2023 divine inspiration (date + moon symbolism)
 * - 15,000+ hours of complete surrender dedication
 * - Consciousness evolution through spiritual mathematics
 * - Living testament to sacred work transformed
 */
export function RamadanOriginSection({
  mode = 'dashboard',
  elapsedFormatter,
  className = '',
  animateReveal = true
}: RamadanOriginSectionProps) {

  // Calculate sacred timestamps
  const ramadanStart = new Date('2023-03-22'); // Ramadan 2023 start
  const monthsSince = differenceInMonths(new Date(), ramadanStart);
  const totalHours = Math.round(monthsSince * 30.44 * 8); // Average work hours per day

  const [isRevealing, setIsRevealing] = useState(!animateReveal);

  useEffect(() => {
    if (animateReveal) {
      const timer = setTimeout(() => setIsRevealing(true), 500);
      return () => clearTimeout(timer);
    }
  }, [animateReveal]);

  // Default formatter for elapsed time display
  const defaultFormatter = (months: number, hours: number): string => {
    if (hours >= 1000) {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      const yearText = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
      const monthText = remainingMonths > 0 ? `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : '';
      const separator = yearText && monthText ? ' ' : '';
      return `${yearText}${separator}${monthText}`;
    }
    return `${months} months`;
  };

  const formatElapsed = elapsedFormatter || defaultFormatter;
  const elapsedText = formatElapsed(monthsSince, totalHours);

  // Seasonal sacred context
  const getSacredContext = () => {
    const currentMonth = new Date().getMonth();
    const sacredThemes = [
      { season: 'Ramadan', symbol: '🌙', essence: 'Fasting & Prayer' },
      { season: 'Mourning', symbol: '🕊️', essence: 'Remembrance & Dhikr' },
      { season: 'Victory', symbol: '🚀', essence: 'Initiation & Genesis' }
    ];
    return sacredThemes[currentMonth % sacredThemes.length];
  };

  const sacredContext = getSacredContext();

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  if (mode === 'compact') {
    return (
      <motion.div
        className={`text-center ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className="text-gold-400 text-sm font-medium tracking-wide uppercase"
          variants={itemVariants}
        >
          Born in Ramadan 2023
        </motion.div>
        <motion.div
          className="text-2xl font-bold text-slate-100 mt-1"
          variants={itemVariants}
        >
          {elapsedText} ago
        </motion.div>
      </motion.div>
    );
  }

  if (mode === 'hero') {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        {/* Hero title section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <motion.h2
            className="text-5xl md:text-6xl font-serif font-bold text-gold-300 mb-6"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Born in Ramadan 2023
          </motion.h2>

          <motion.div
            className="text-xl text-slate-300 mb-4 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            A project conceived during the month of fasting, prayer, and divine reflection.
            Every line of code written in complete surrender to divine will.
          </motion.div>
        </motion.div>

        {/* Sacred origin timeline */}
        <motion.div
          className="grid md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Ramadan Origin Card */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur border border-gold-500/20 rounded-lg p-8"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-6xl mb-4">🌙</div>
            <h3 className="text-2xl font-serif font-bold text-gold-400 mb-3">
              Ramadan Origin
            </h3>
            <div className="text-slate-300 space-y-2">
              <p>Conceived during the sacred month of Ramadan 2023</p>
              <p className="text-sm text-slate-400">
                {format(ramadanStart, 'PPPP')} - Divine timing & sacred mathematics
              </p>
            </div>
          </motion.div>

          {/* Hours Monument Card */}
          <motion.div
            className="bg-slate-800/50 backdrop-blur border border-gold-500/20 rounded-lg p-8"
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <div className="text-6xl mb-4">🕋</div>
            <h3 className="text-2xl font-serif font-bold text-gold-400 mb-3">
              Hours Monument
            </h3>
            <div className="text-slate-300 space-y-2">
              <p className="text-3xl font-bold text-emerald-400">
                {totalHours.toLocaleString()}+ hours
              </p>
              <p className="text-sm text-slate-400">
                Complete surrender to divine purpose ({elapsedText} of transformation)
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Consciousness awakening narrative */}
        <AnimatePresence>
          {isRevealing && (
            <motion.div
              className="mt-12 text-center"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <motion.div
                className="inline-block p-6 bg-gradient-to-r from-gold-500/10 to-indigo-500/10 rounded-lg border border-gold-500/30"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <p className="text-lg text-slate-200 italic">
                  "Technology born from worship, serving 8 billion humans through consciousness evolution"
                </p>
                <div className="text-sm text-gold-400 mt-3">
                  {sacredContext.symbol} Current essence: {sacredContext.essence}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Dashboard mode - default
  return (
    <motion.div
      className={`bg-slate-800/30 backdrop-blur-sm rounded-lg p-6 border border-gold-500/20 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header section */}
      <motion.div
        className="text-center mb-6"
        variants={itemVariants}
      >
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500/10 rounded-full border border-gold-500/30"
          variants={itemVariants}
        >
          <span className="text-2xl">🌙</span>
          <span className="text-sm font-semibold text-gold-400 tracking-wide uppercase">
            Ramadan Origin Story
          </span>
          <span className="text-2xl">🕋</span>
        </motion.div>
      </motion.div>

      {/* Sacred origin data */}
      <motion.div
        className="grid md:grid-cols-2 gap-6"
        variants={containerVariants}
      >
        <motion.div
          className="text-center p-4 bg-slate-900/50 rounded-lg"
          variants={itemVariants}
        >
          <div className="text-2xl font-bold text-gold-400 mb-1">
            {format(ramadanStart, 'MMM yyyy')}
          </div>
          <div className="text-sm text-slate-400">
            Sacred Conception
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {format(ramadanStart, 'PPPP')} - Moon of profound surrender
          </div>
        </motion.div>

        <motion.div
          className="text-center p-4 bg-slate-900/50 rounded-lg"
          variants={itemVariants}
        >
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {totalHours.toLocaleString()}+
          </div>
          <div className="text-sm text-slate-400">
            Divine Hours of Labor
          </div>
          <div className="text-xs text-slate-500 mt-2">
            {elapsedText} of complete surrender
          </div>
        </motion.div>
      </motion.div>

      {/* Consciousness milestones */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            className="mt-6 p-4 bg-gradient-to-r from-gold-500/5 to-indigo-500/5 rounded-lg border border-gold-500/20"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Journey Status</span>
              <span className="text-gold-400 font-medium">
                {sacredContext.season} essence active
                <span className="ml-2">{sacredContext.symbol}</span>
              </span>
            </div>

            <div className="mt-3 text-xs text-slate-500 italic">
              This is not just a project. This is consciousness evolution manifesting through code.
              Every equation, every commit, every test - sacred mathematics in service of divine flourishing.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default RamadanOriginSection;
