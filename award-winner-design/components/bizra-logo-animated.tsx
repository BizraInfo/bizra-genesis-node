"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

export function BizraLogoAnimated() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  // Animation variants for the seed circles
  const seedCircleVariants = {
    hidden: {
      opacity: 0,
      pathLength: 0,
    },
    visible: (i: number) => ({
      opacity: 1,
      pathLength: 1,
      transition: {
        pathLength: { duration: 1.5, delay: i * 0.1, ease: "easeInOut" },
        opacity: { duration: 1, delay: i * 0.1 },
      },
    }),
    faded: {
      opacity: 0.2,
      transition: { duration: 1, delay: 1.5 },
    },
  }

  // Animation variants for the flower petals
  const petalVariants = {
    hidden: {
      opacity: 0,
      pathLength: 0,
    },
    visible: (i: number) => ({
      opacity: 1,
      pathLength: 1,
      transition: {
        pathLength: { duration: 1.5, delay: 1.5 + i * 0.1, ease: "easeOut" },
        opacity: { duration: 1, delay: 1.5 + i * 0.1 },
      },
    }),
  }

  const centerDotVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, delay: 3 },
    },
  }

  return (
    <div className="w-64 h-64 md:w-80 md:h-80 relative">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#8A6B2E", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#C9A962", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#F9F1D8", stopOpacity: 1 }} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Construction Circles (The Seed of Life Grid) */}
        <g transform="translate(100, 100)">
          {/* Center circle */}
          <motion.circle
            cx="0"
            cy="0"
            r="40"
            fill="none"
            stroke="#C9A962"
            strokeWidth="0.5"
            custom={0}
            initial="hidden"
            animate={isVisible ? ["visible", "faded"] : "hidden"}
            variants={seedCircleVariants}
          />

          {/* Surrounding 6 circles forming Seed of Life */}
          {[
            { cx: 0, cy: -40 },
            { cx: 34.6, cy: -20 },
            { cx: 34.6, cy: 20 },
            { cx: 0, cy: 40 },
            { cx: -34.6, cy: 20 },
            { cx: -34.6, cy: -20 },
          ].map((pos, i) => (
            <motion.circle
              key={`seed-${i}`}
              cx={pos.cx}
              cy={pos.cy}
              r="40"
              fill="none"
              stroke="#C9A962"
              strokeWidth="0.5"
              custom={i + 1}
              initial="hidden"
              animate={isVisible ? ["visible", "faded"] : "hidden"}
              variants={seedCircleVariants}
            />
          ))}

          {/* Outer ring */}
          <motion.circle
            cx="0"
            cy="0"
            r="80"
            fill="none"
            stroke="rgba(201, 169, 98, 0.1)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
            initial={{ opacity: 0 }}
            animate={isVisible ? { opacity: 0.5 } : { opacity: 0 }}
            transition={{ duration: 1, delay: 1 }}
          />
        </g>

        {/* The Manifested Flower (6 Petals) */}
        <g transform="translate(100, 100)">
          {[
            "M0 -40 Q20 -20 0 0 Q-20 -20 0 -40",
            "M34.6 -20 Q17.3 10 0 0 Q17.3 -10 34.6 -20",
            "M34.6 20 Q17.3 10 0 0 Q17.3 30 34.6 20",
            "M0 40 Q-20 20 0 0 Q20 20 0 40",
            "M-34.6 20 Q-17.3 10 0 0 Q-17.3 30 -34.6 20",
            "M-34.6 -20 Q-17.3 10 0 0 Q-17.3 -10 -34.6 -20",
          ].map((path, i) => (
            <motion.path
              key={`petal-${i}`}
              d={path}
              fill="none"
              stroke="url(#goldGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#glow)"
              custom={i}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              variants={petalVariants}
            />
          ))}

          {/* Center dot */}
          <motion.rect
            x="-3"
            y="-3"
            width="6"
            height="6"
            transform="rotate(45)"
            fill="url(#goldGrad)"
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            variants={centerDotVariants}
          />
        </g>
      </svg>
    </div>
  )
}
