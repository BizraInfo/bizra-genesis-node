'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, ArrowLeft, Hexagon } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * NODEO Console Error Boundary
 */
export default function NodeoError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[NODEO Error]:', error);
  }, [error]);

  return (
    <div 
      className="min-h-screen bg-[#050B14] flex flex-col items-center justify-center px-6"
      role="alert"
      aria-live="assertive"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Error Icon with Hexagon Brand */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <Hexagon 
            className="w-24 h-24 text-red-500/30" 
            strokeWidth={1}
            aria-hidden="true" 
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-400" aria-hidden="true" />
          </div>
        </div>

        <h1 className="text-2xl font-serif text-white mb-2">
          Neural Core Disrupted
        </h1>
        
        <p className="text-gray-400 mb-6 text-sm">
          The NODEO visualization encountered an error. The spine architecture remains intact.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 rounded bg-red-900/20 border border-red-900/50 text-left font-mono">
            <p className="text-xs text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#C9A962] text-[#050B14] font-bold text-sm tracking-widest uppercase rounded-sm hover:bg-[#C9A962]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#C9A962] focus:ring-offset-2 focus:ring-offset-[#050B14]"
            aria-label="Reinitialize neural core"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reinitialize
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-800 text-gray-400 text-sm tracking-widest uppercase rounded-sm hover:border-gray-700 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 focus:ring-offset-[#050B14]"
            aria-label="Return to main dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>

        <p className="mt-8 text-[10px] font-mono text-gray-600 tracking-widest">
          NODEO_ERROR_BOUNDARY // SPINE_INTACT
        </p>
      </motion.div>
    </div>
  );
}
