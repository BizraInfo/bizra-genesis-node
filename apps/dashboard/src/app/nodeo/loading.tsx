'use client';

import { motion } from 'framer-motion';

/**
 * NODEO Console Loading State - Genesis Boot Sequence
 */
export default function NodeoLoading() {
  return (
    <div 
      className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label="Initializing NODEO Console"
    >
      <div className="relative w-64 h-64 mb-8">
        <svg 
          viewBox="0 0 200 200" 
          className="w-full h-full animate-[spin_60s_linear_infinite]"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#C9A962', stopOpacity: 1 }} />
              <stop offset="100%" style={{ stopColor: '#B08D45', stopOpacity: 0.5 }} />
            </linearGradient>
          </defs>
          {/* Seed of Life Construction */}
          <circle cx="100" cy="100" r="40" fill="none" stroke="#C9A962" strokeWidth="1.5" className="animate-pulse" />
          <circle cx="100" cy="60" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
          <circle cx="134.6" cy="80" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
          <circle cx="134.6" cy="120" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
          <circle cx="100" cy="140" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
          <circle cx="65.4" cy="120" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
          <circle cx="65.4" cy="80" r="40" fill="none" stroke="#C9A962" strokeWidth="1" opacity="0.5" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-[#C9A962] rounded-full shadow-[0_0_20px_#C9A962] animate-pulse" />
        </div>
      </div>
      
      <h1 className="text-3xl font-serif text-[#C9A962] tracking-[0.5em] mb-2">NODEO</h1>
      <div className="text-xs font-mono text-[#C9A962]/50 tracking-widest animate-pulse">
        INITIALIZING GENESIS PROTOCOL...
      </div>

      <span className="sr-only">Loading NODEO Console, please wait...</span>
    </div>
  );
}
