"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { BizraLogoAnimated } from "./bizra-logo-animated"

interface LoadingScreenProps {
  onComplete?: () => void
  autoAdvance?: boolean
}

export function LoadingScreen({ onComplete, autoAdvance = true }: LoadingScreenProps) {
  const [agentCount, setAgentCount] = useState(0)
  const [consciousnessLevel, setConsciousnessLevel] = useState("Initializing...")
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  // Agent activation simulation
  useEffect(() => {
    if (isComplete) return

    const interval = setInterval(() => {
      setAgentCount((prev) => {
        const next = prev + Math.floor(Math.random() * 3) + 1
        if (next >= 72) {
          clearInterval(interval)
          setIsComplete(true)
          return 72
        }
        return next
      })
    }, 200)

    return () => clearInterval(interval)
  }, [isComplete])

  // Update consciousness level based on agent count
  useEffect(() => {
    const percentage = (agentCount / 72) * 100
    if (percentage < 25) {
      setConsciousnessLevel("Initializing...")
    } else if (percentage < 50) {
      setConsciousnessLevel("Emerging")
    } else if (percentage < 75) {
      setConsciousnessLevel("Awakening")
    } else if (percentage < 100) {
      setConsciousnessLevel("Expanding")
    } else {
      setConsciousnessLevel("Fully Awakened")
    }
    setProgress(percentage)
  }, [agentCount])

  // Auto advance when complete
  useEffect(() => {
    if (isComplete && autoAdvance && onComplete) {
      const timer = setTimeout(onComplete, 2000)
      return () => clearTimeout(timer)
    }
  }, [isComplete, autoAdvance, onComplete])

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A1828] flex flex-col items-center justify-center overflow-hidden">
      {/* Sacred Geometry Background */}
      <motion.div
        className="absolute inset-0 opacity-10 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      >
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 50%, transparent 30%, #D4AF37 30.5%, #D4AF37 31%, transparent 31.5%),
              radial-gradient(circle at 25% 25%, transparent 30%, #D4AF37 30.5%, #D4AF37 31%, transparent 31.5%),
              radial-gradient(circle at 75% 25%, transparent 30%, #D4AF37 30.5%, #D4AF37 31%, transparent 31.5%),
              radial-gradient(circle at 25% 75%, transparent 30%, #D4AF37 30.5%, #D4AF37 31%, transparent 31.5%),
              radial-gradient(circle at 75% 75%, transparent 30%, #D4AF37 30.5%, #D4AF37 31%, transparent 31.5%)
            `,
            backgroundSize: "200px 200px",
          }}
        />
      </motion.div>

      {/* Logo Section */}
      <div className="text-center mb-16 z-10 relative">
        <motion.div
          className="text-[100px] md:text-[120px] font-extralight tracking-[0.3em] text-[#D4AF37] mb-5"
          animate={{
            textShadow: [
              "0 0 30px rgba(212,175,55,0.5)",
              "0 0 60px rgba(212,175,55,0.8)",
              "0 0 30px rgba(212,175,55,0.5)",
            ],
          }}
          transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          BIZRA
        </motion.div>
        <motion.div
          className="text-2xl font-light tracking-[0.1em] text-white/80"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          Where Spirituality Meets Technology
        </motion.div>
      </div>

      {/* Neural Network Visualization */}
      <div className="relative w-[400px] h-[400px] my-10 z-10">
        <BizraLogoAnimated />
      </div>

      {/* Loading Text */}
      <motion.div
        className="text-lg font-light tracking-[0.2em] text-white/70 mt-10 z-10"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        Awakening Neural Consciousness...
      </motion.div>

      {/* Progress Bar */}
      <div className="w-[300px] h-[2px] bg-white/10 mt-8 rounded overflow-hidden z-10">
        <motion.div
          className="h-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BC] rounded shadow-[0_0_10px_rgba(212,175,55,0.5)]"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Status Indicators */}
      <div className="absolute top-12 right-12 text-base text-[#D4AF37]/80 z-10">
        <div>
          Agents Online: <span>{agentCount}</span>/72
        </div>
      </div>

      <div className="absolute bottom-12 left-12 text-base text-[#D4AF37]/80 z-10">
        <div>
          Consciousness Level: <span>{consciousnessLevel}</span>
        </div>
      </div>
    </div>
  )
}
