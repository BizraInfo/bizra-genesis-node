'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Loader2 } from 'lucide-react';

/**
 * PAT Console Loading State
 */
export default function ChatLoading() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-bizra-black"
      role="status"
      aria-live="polite"
      aria-label="Loading PAT Console"
    >
      <div className="fixed inset-0 grid-pattern opacity-30 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        <motion.div
          animate={{ 
            boxShadow: [
              '0 0 20px rgba(147, 51, 234, 0.3)',
              '0 0 40px rgba(147, 51, 234, 0.5)',
              '0 0 20px rgba(147, 51, 234, 0.3)'
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 flex items-center justify-center border border-purple-500/30"
        >
          <MessageSquare className="w-8 h-8 text-purple-400" aria-hidden="true" />
        </motion.div>

        <h2 className="text-lg font-semibold text-white mb-2">PAT Console</h2>
        
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 text-bizra-gold animate-spin" aria-hidden="true" />
          <span className="text-sm text-white/50 font-mono">
            Initializing agents...
          </span>
        </div>

        <span className="sr-only">Loading PAT Console, please wait...</span>
      </motion.div>
    </div>
  );
}
