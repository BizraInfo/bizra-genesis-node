'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * PAT Console Error Boundary
 */
export default function ChatError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[PAT Console Error]:', error);
  }, [error]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-bizra-black px-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-md"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/30">
          <AlertCircle className="w-8 h-8 text-red-400" aria-hidden="true" />
        </div>

        <h1 className="text-xl font-bold mb-2 text-white">
          PAT Agent Connection Failed
        </h1>
        
        <p className="text-white/50 mb-6 text-sm">
          Unable to establish connection with your Personal Agent Team. This may be a temporary issue.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-xs font-mono text-red-400 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-bizra-gold text-bizra-black font-semibold rounded-lg hover:bg-bizra-gold-light transition-colors focus:outline-none focus:ring-2 focus:ring-bizra-gold focus:ring-offset-2 focus:ring-offset-bizra-black"
            aria-label="Retry connecting to PAT agents"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Reconnect
          </button>
          
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-bizra-black"
            aria-label="Return to dashboard"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
