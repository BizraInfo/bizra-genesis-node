'use client';

import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';

/**
 * Global Loading State for the BIZRA Dashboard
 * Shown during route transitions and Suspense boundaries
 */
export default function Loading() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-bizra-black"
      role="status"
      aria-live="polite"
      aria-label="Loading BIZRA Genesis Node"
    >
      {/* Background Grid */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
      
      {/* Central Glow */}
      <div className="absolute w-[400px] h-[400px] bg-bizra-gold/10 blur-[100px] rounded-full" />
      
      {/* Loading Animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        {/* Logo */}
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(212, 175, 55, 0.3)',
              '0 0 60px rgba(212, 175, 55, 0.5)',
              '0 0 20px rgba(212, 175, 55, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-bizra-gold to-bizra-gold-dark flex items-center justify-center"
        >
          <Shield className="w-10 h-10 text-bizra-black" aria-hidden="true" />
        </motion.div>

        {/* Loading Spinner */}
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-bizra-gold animate-spin" aria-hidden="true" />
          <span className="text-sm text-white/60 font-mono">
            Loading module...
          </span>
        </div>

        {/* Progress Bar */}
        <motion.div
          className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden mx-auto"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-bizra-gold to-transparent"
          />
        </motion.div>

        {/* Screen Reader Text */}
        <span className="sr-only">Loading, please wait...</span>
      </motion.div>
    </div>
  );
}
