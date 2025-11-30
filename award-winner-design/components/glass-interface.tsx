"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useBizraStore, usePhase, usePoi, useHours } from "@/store/use-bizra-store"
import { useEffect, useState } from "react"
import { BizraLogoAnimated } from "@/components/bizra-logo-animated"

export function GlassInterface() {
  const phase = usePhase()
  const poi = usePoi()
  const hoursInStore = useHours()
  const setPhase = useBizraStore((s) => s.setPhase)
  const setHours = useBizraStore((s) => s.setHours)

  const [displayHours, setDisplayHours] = useState(0)

  // The "Count Up" Effect for the 15,000 hours
  useEffect(() => {
    if (phase !== "CITADEL") return

    let current = 0
    const target = 15000
    const step = 123

    const timer = setInterval(() => {
      current += step
      if (current >= target) {
        current = target
        clearInterval(timer)
      }
      setDisplayHours(current)
      setHours(current)
    }, 10)

    return () => clearInterval(timer)
  }, [phase, setHours])

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10 overflow-hidden">
      {/* SCENE 1: THE VOID - TRANSCENDENT ENTRANCE */}
      <AnimatePresence mode="wait">
        {phase === "VOID" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5, filter: "blur(40px)" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="text-center pointer-events-auto cursor-pointer flex flex-col items-center relative z-20"
            onClick={() => setPhase("GENESIS")}
          >
            {/* The Nuqta (Dot) - Replaced by the Sacred Logo */}
            <motion.div
              className="mb-12 scale-75 md:scale-100 relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 120, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            >
              <div className="absolute inset-0 bg-primary-gold/20 blur-[100px] rounded-full animate-pulse-slow" />
              <BizraLogoAnimated />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="text-6xl md:text-8xl font-light tracking-[0.5em] text-gradient-gold font-serif mb-6"
            >
              BIZRA
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-gold/50 to-transparent" />
              <p className="text-sm text-primary-gold/80 tracking-[0.3em] uppercase font-light">
                Ramadan&nbsp;2023 · One Room · One Prayer
              </p>
              <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary-gold/50 to-transparent" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 2, duration: 1, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
              className="text-[10px] text-soft-white mt-12 uppercase tracking-[0.5em] border border-white/10 px-6 py-2 rounded-full backdrop-blur-sm hover:bg-white/5 transition-colors"
            >
              Touch the Origin
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 2: THE CITADEL UI - GENESIS REVELATION */}
      <AnimatePresence>
        {phase === "GENESIS" && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
            className="absolute bottom-0 w-full px-8 md:px-24 pb-12 flex flex-col md:flex-row justify-between items-end gap-8 bg-gradient-to-t from-deep-navy via-deep-navy/80 to-transparent pt-32"
          >
            <div className="text-left glass-panel p-6 rounded-lg border-l-2 border-l-primary-gold/50">
              <h2 className="text-primary-gold text-xs tracking-[0.2em] mb-2 font-bold">PROOF OF IMPACT</h2>
              <div className="text-6xl font-serif text-soft-white tabular-nums leading-none">
                {poi.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-[10px] text-accent-teal mt-2 tracking-widest uppercase">LIVE NODE0 BASELINE</p>
            </div>

            <div className="text-right ml-auto glass-panel p-6 rounded-lg border-r-2 border-r-accent-teal/50">
              <h2 className="text-accent-teal text-xs tracking-[0.2em] mb-2 font-bold">SACRIFICE METRIC</h2>
              <div className="text-6xl font-serif text-soft-white tabular-nums leading-none">
                {displayHours.toLocaleString()} <span className="text-lg font-sans text-white/40">HRS</span>
              </div>
              <p className="text-white/40 text-[10px] mt-2 tracking-widest uppercase">
                RAMADAN 2023 — PRESENT · 15,000 HOURS
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05, backgroundColor: "rgba(201, 169, 98, 0.15)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPhase("CITADEL")}
              className="pointer-events-auto px-10 py-4 border border-primary-gold/30 text-primary-gold hover:border-primary-gold transition-all rounded-sm text-xs tracking-[0.3em] uppercase backdrop-blur-md bg-deep-navy/50 shadow-[0_0_30px_rgba(201,169,98,0.1)]"
            >
              Visualize Legacy
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCENE 3: THE CITADEL ACTIVE - MASTERPIECE DASHBOARD */}
      <AnimatePresence>
        {phase === "CITADEL" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          >
            <div className="absolute top-8 left-8 md:left-12 glass-panel px-4 py-2 rounded-full flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 bg-accent-teal rounded-full animate-ping absolute inset-0 opacity-75" />
                <div className="w-2 h-2 bg-accent-teal rounded-full relative z-10" />
              </div>
              <span className="text-accent-teal text-[10px] tracking-[0.2em] font-bold">LIVE SYSTEM TRACE</span>
            </div>

            <div className="absolute bottom-12 w-full px-8 md:px-24 flex justify-between items-end">
              <div className="text-left glass-panel p-4 rounded-lg max-w-md border-l border-primary-gold/20">
                <p className="text-xs text-gray-300 leading-relaxed font-light">
                  Every block in this Citadel is one hour of real work.{" "}
                  <span className="text-primary-gold">{hoursInStore.toLocaleString()} hours</span> anchored to a single
                  room in Dubai.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
