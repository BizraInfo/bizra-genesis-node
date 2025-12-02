'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Global Error Boundary for the BIZRA Dashboard
 * Catches runtime errors and provides recovery options
 */
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service in production
    console.error('[BIZRA Error]:', error);
  }, [error]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-bizra-black px-6"
      role="alert"
      aria-live="assertive"
    >
      {/* Background Grid */}
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
      
      {/* Error Glow */}
      <div className="absolute w-[400px] h-[400px] bg-red-500/10 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md"
      >
        {/* Error Icon */}
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(239, 68, 68, 0.3)',
              '0 0 60px rgba(239, 68, 68, 0.5)',
              '0 0 20px rgba(239, 68, 68, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center border border-red-500/30"
        >
          <AlertTriangle className="w-10 h-10 text-red-400" aria-hidden="true" />
        </motion.div>

        {/* Error Title */}
        <h1 className="text-2xl font-bold mb-2 text-white">
          System Anomaly Detected
        </h1>
        
        <p className="text-white/50 mb-6">
          The Genesis Node encountered an unexpected error. Your data remains secure.
        </p>

        {/* Error Details (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-white/30 mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-bizra-gold text-bizra-black font-semibold rounded-lg hover:bg-bizra-gold-light transition-colors focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-2 focus:ring-offset-bizra-black"
            aria-label="Attempt to recover from error"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Try Again
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-bizra-black"
            aria-label="Return to dashboard home"
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            Go Home
          </Link>
        </div>

        {/* Status */}
        <p className="mt-8 text-xs font-mono text-white/20">
          [GENESIS] Error boundary activated • Node integrity preserved
        </p>
      </motion.div>
    </div>
  );
}
