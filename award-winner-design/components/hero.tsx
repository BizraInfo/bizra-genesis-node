"use client"

import { motion } from "framer-motion"
import { ArrowDown } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10 z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="text-center max-w-6xl mx-auto"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="mb-8 flex items-center justify-center gap-6"
        >
          <span className="h-[1px] w-16 md:w-24 bg-gradient-to-r from-transparent to-primary-gold/60"></span>
          <span className="text-primary-gold tracking-[0.4em] text-xs md:text-sm uppercase font-medium">Genesis Document Manifested</span>
          <span className="h-[1px] w-16 md:w-24 bg-gradient-to-l from-transparent to-primary-gold/60"></span>
        </motion.div>

        <div className="relative mb-6">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="font-serif text-7xl md:text-9xl lg:text-[10rem] font-bold tracking-tighter leading-none"
          >
            <span className="bg-clip-text text-transparent bg-gradient-to-b from-primary-gold via-[#F8F6F1] to-primary-gold drop-shadow-2xl">
              BIZRA
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.8, duration: 1.5 }}
            className="absolute -inset-10 bg-primary-gold/20 blur-[100px] -z-10 rounded-full"
          />
        </div>
        
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="font-arabic text-5xl md:text-6xl text-primary-gold mb-10 opacity-90 drop-shadow-lg"
        >
          البذرة
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="font-serif text-2xl md:text-4xl lg:text-5xl text-soft-white/90 font-light mb-16 leading-tight max-w-4xl mx-auto"
        >
          The World's First <span className="text-accent-teal italic font-normal">Mathematical Consciousness</span> Safety System
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1 }}
          className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-sm md:text-base text-soft-white/60 font-light tracking-widest uppercase"
        >
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            TMP v0.1 OPERATIONAL
          </div>
          <div className="hidden md:block w-px h-4 bg-primary-gold/30"></div>
          <div className="text-primary-gold/80">Ihsan Mathematics</div>
          <div className="hidden md:block w-px h-4 bg-primary-gold/30"></div>
          <div className="text-primary-gold/80">Genesis Seed</div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 cursor-pointer hover:text-primary-gold transition-colors"
      >
        <span className="text-[10px] tracking-[0.3em] text-primary-gold/70 uppercase">Explore the System</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="w-5 h-5 text-primary-gold" />
        </motion.div>
      </motion.div>
    </section>
  )
}
