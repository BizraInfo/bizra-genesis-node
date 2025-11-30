'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useBizraStore } from '../store/useBizraStore';
import { useEffect, useState } from 'react';

// TODO: Add socket.io-client dependency for live WebSocket updates
// const socket = io('ws://localhost:3001'); // Backend WebSocket for live data

export function GlassInterface() {
  const { phase, setPhase, poi, hours, updateCommits, setLodLevel } = useBizraStore();
  const [displayHours, setDisplayHours] = useState(0);

  // TODO: WebSocket listener for live updates
  // useEffect(() => {
  //   socket.on('commitUpdate', (data: any) => {
  //     updateCommits(data.commits);
  //   });
  //   return () => socket.off('commitUpdate');
  // }, [updateCommits]);

  // The "Count Up" Effect for the 15,000 hours
  useEffect(() => {
    if (phase === 'CITADEL') {
      let start = 0;
      const end = 15000;
      const timer = setInterval(() => {
        start += 123; // Fast increment
        if (start >= end) {
          start = end;
          clearInterval(timer);
        }
        setDisplayHours(start);
      }, 10);
      return () => clearInterval(timer);
    }
  }, [phase]);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">

      {/* SCENE 1: THE VOID */}
      <AnimatePresence>
        {phase === 'VOID' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
            className="text-center pointer-events-auto cursor-pointer"
            onClick={() => setPhase('GENESIS')}
          >
            {/* The Nuqta (Dot) */}
            <div className="w-2 h-2 bg-[#C9A962] rounded-full mx-auto mb-8 animate-pulse shadow-[0_0_30px_#C9A962]" />
            <h1 className="text-4xl md:text-6xl font-light tracking-[0.5em] text-white/80 font-serif">
              BIZRA
            </h1>
            <p className="text-xs text-[#C9A962] tracking-widest mt-4 uppercase">
              Touch the Origin
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 3: THE GENESIS SPIRAL UI */}
      <AnimatePresence>
        {phase === 'GENESIS' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 w-full px-8 md:px-24 flex justify-between items-end"
          >
            <div className="text-left">
              <h2 className="text-[#C9A962] text-sm tracking-widest mb-2">PROOF OF IMPACT</h2>
              <div className="text-5xl font-mono text-white tabular-nums">
                {poi.toLocaleString()}
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-[#2A9D8F] text-sm tracking-widest mb-2">SACRIFICE METRIC</h2>
              <div className="text-5xl font-mono text-white tabular-nums">
                {displayHours.toLocaleString()} <span className="text-lg">HRS</span>
              </div>
              <p className="text-white/30 text-xs mt-2">RAMADAN 2023 — PRESENT</p>
            </div>

            <button
              onClick={() => setPhase('CITADEL')}
              className="pointer-events-auto px-8 py-3 border border-[#C9A962]/30 text-[#C9A962] hover:bg-[#C9A962]/10 transition-all rounded-full text-xs tracking-widest uppercase backdrop-blur-md"
            >
              Visualize Legacy
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 7: THE ASCENSION UI */}
      <AnimatePresence>
        {phase === 'ASCENSION' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-12 right-12 pointer-events-auto"
          >
            <button
              onClick={() => setLodLevel(2)}
              className="px-4 py-2 bg-[#C9A962] text-black rounded-full text-xs uppercase"
            >
              Boost LOD
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
