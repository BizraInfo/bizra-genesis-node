/**
 * Landing Page Onboarding Tour Component
 * Provides a guided tour for new users through key features
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { BRAND } from '../../constants/brand';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector
  position: 'top' | 'bottom' | 'left' | 'right';
  content: React.ReactNode;
}

const tourSteps: TourStep[] = [
  {
    id: 'hero',
    title: 'Welcome to BIZRA',
    description: 'The Golden Age of Digital Finance',
    target: 'main',
    position: 'bottom',
    content: (
      <div className="space-y-4">
        <p className="text-white/80">
          Experience the transition from debt-based fiat currency to the BIZRA equity-based ecosystem.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-gold-400 font-serif text-lg">0.05s</div>
            <div className="text-xs text-white/60">Settlement</div>
          </div>
          <div>
            <div className="text-gold-400 font-serif text-lg">Zero</div>
            <div className="text-xs text-white/60">Inflation</div>
          </div>
          <div>
            <div className="text-gold-400 font-serif text-lg">∞</div>
            <div className="text-xs text-white/60">Scalability</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'macro',
    title: 'Macro Economic Analysis',
    description: 'Understanding Value Erosion',
    target: '#macro',
    position: 'right',
    content: (
      <div className="space-y-3">
        <p className="text-white/80">
          Since decoupling from gold in 1971, fiat currencies have lost over 96% of their purchasing power.
        </p>
        <div className="bg-navy-800/50 p-3 rounded-lg">
          <div className="text-gold-400 text-sm font-medium">BIZRA Solution:</div>
          <div className="text-white/70 text-sm">Algorithmic scarcity restores the "Gold Standard"</div>
        </div>
      </div>
    ),
  },
  {
    id: 'tokenomics',
    title: 'Token Distribution',
    description: 'The Flower of Allocation',
    target: '#allocation',
    position: 'left',
    content: (
      <div className="space-y-3">
        <p className="text-white/80">
          BIZRA's tokenomics follow sacred geometry principles with balanced distribution.
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gold-400">Treasury (40%)</span>
            <span className="text-white/70">Value Stability</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-teal-400">Community (35%)</span>
            <span className="text-white/70">Ecosystem Growth</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white">Liquidity (25%)</span>
            <span className="text-white/70">Instant Settlement</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'velocity',
    title: 'Lightning Fast Transactions',
    description: 'Speed of Light Settlement',
    target: '#velocity',
    position: 'top',
    content: (
      <div className="space-y-3">
        <p className="text-white/80">
          Atomic settlement on a sharded ledger achieves finality in milliseconds.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-navy-800/50 p-3 rounded-lg text-center">
            <div className="text-gold-400 text-lg font-serif">50k+</div>
            <div className="text-xs text-white/60">TPS Capacity</div>
          </div>
          <div className="bg-navy-800/50 p-3 rounded-lg text-center">
            <div className="text-teal-400 text-lg font-serif">$0.001</div>
            <div className="text-xs text-white/60">Avg Cost</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'consensus',
    title: 'Global Adoption',
    description: 'Fibonacci Growth Projection',
    target: '#consensus',
    position: 'bottom',
    content: (
      <div className="space-y-3">
        <p className="text-white/80">
          Projected growth follows the golden ratio, modeling natural expansion patterns.
        </p>
        <div className="bg-gradient-to-r from-gold-500/20 to-teal-500/20 p-3 rounded-lg">
          <div className="text-gold-400 text-sm font-medium">φ = 1.618</div>
          <div className="text-white/70 text-sm">Golden ratio exponential growth</div>
        </div>
      </div>
    ),
  },
];

interface LandingOnboardingProps {
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export const LandingOnboarding: React.FC<LandingOnboardingProps> = ({
  isActive,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentTourStep = tourSteps[currentStep];

  useEffect(() => {
    if (!isActive || isPaused) {
      return;
    }

    const timer = setTimeout(() => {
      if (currentStep < tourSteps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        onComplete();
      }
    }, 8000); // Auto-advance every 8 seconds

    return () => clearTimeout(timer);
  }, [currentStep, isActive, isPaused, onComplete]);

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  if (!isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-none"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Highlight overlay */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="absolute inset-0 bg-black/40" />
          {/* This would need to be positioned based on the target element */}
          <motion.div
            className="absolute border-2 border-gold-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]"
            style={{
              // Dynamic positioning based on target element would go here
              top: '50%',
              left: '50%',
              width: '400px',
              height: '300px',
              transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 }}
          />
        </motion.div>

        {/* Tour Content */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <div className="glass-panel p-6 rounded-2xl max-w-md mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
                <span className="text-gold-400 text-sm font-medium">Guided Tour</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  aria-label={isPaused ? 'Resume tour' : 'Pause tour'}
                >
                  {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button
                  onClick={onSkip}
                  className="p-1 text-white/60 hover:text-white transition-colors"
                  aria-label="Skip tour"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-navy-800 rounded-full h-1 mb-4">
              <motion.div
                className="bg-gradient-to-r from-gold-400 to-teal-400 h-1 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Step Indicator */}
            <div className="flex justify-center gap-1 mb-4">
              {tourSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-gold-400'
                      : index < currentStep
                      ? 'bg-teal-400'
                      : 'bg-white/30'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="space-y-4">
              <div>
                <h3 className="text-white text-lg font-serif mb-1">
                  {currentTourStep.title}
                </h3>
                <p className="text-gold-400 text-sm">
                  {currentTourStep.description}
                </p>
              </div>

              <div className="text-white/90">
                {currentTourStep.content}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span className="text-white/50 text-sm">
                {currentStep + 1} of {tourSteps.length}
              </span>

              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-full transition-colors"
              >
                {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LandingOnboarding;