"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

export function SacredGeometry() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(201,169,98,0.03),transparent_70%)]" />
      
      {/* Central Flower Structure */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] opacity-20">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={`circle-group-${i}`}
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{
              duration: 120 + i * 60,
              repeat: Infinity,
              ease: "linear",
              direction: i % 2 === 0 ? "normal" : "reverse"
            }}
          >
            {[...Array(6)].map((_, j) => (
              <div
                key={`petal-${i}-${j}`}
                className="absolute top-1/2 left-1/2 border border-primary-gold/20 rounded-full"
                style={{
                  width: `${300 + i * 150}px`,
                  height: `${300 + i * 150}px`,
                  transform: `translate(-50%, -50%) rotate(${j * 60}deg) translateX(${150 + i * 75}px)`,
                }}
              />
            ))}
          </motion.div>
        ))}
        
        {/* Central Rings */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={`ring-${i}`}
            className="absolute top-1/2 left-1/2 border border-primary-gold/30 rounded-full -translate-x-1/2 -translate-y-1/2"
            style={{
              width: `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
            }}
            animate={{
              scale: [1, 1.02, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 bg-primary-gold/40 rounded-full"
            initial={{
              x: Math.random() * 100 + "%",
              y: Math.random() * 100 + "%",
              scale: 0,
            }}
            animate={{
              y: [null, Math.random() * -100],
              opacity: [0, 0.5, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>
    </div>
  )
}
