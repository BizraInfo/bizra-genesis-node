"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"

interface BizraLogoAnimatedProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showConstruction?: boolean;
  autoAnimate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 'w-16 h-16',
  md: 'w-32 h-32',
  lg: 'w-48 h-48 md:w-64 md:h-64',
  xl: 'w-64 h-64 md:w-80 md:h-80',
};

export function BizraLogoAnimated({ 
  size = 'lg', 
  showConstruction = true,
  autoAnimate = true,
  className = ''
}: BizraLogoAnimatedProps) {
  const [isVisible, setIsVisible] = useState(!autoAnimate)

  useEffect(() => {
    if (autoAnimate) {
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [autoAnimate])

  const seedCircleVariants = {
    hidden: { opacity: 0, pathLength: 0 },
    visible: (i: number) => ({
      opacity: 1,
      pathLength: 1,
      transition: {
        pathLength: { duration: 1.5, delay: i * 0.1, ease: "easeInOut" },
        opacity: { duration: 1, delay: i * 0.1 },
      },
    }),
    faded: {
      opacity: 0.15,
      transition: { duration: 1, delay: 1.5 },
    },
  }

  const petalVariants = {
    hidden: { opacity: 0, pathLength: 0 },
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

  const staticVariants = {
    visible: { opacity: 1, pathLength: 1 },
    faded: { opacity: 0.15 },
  }

  return (
    <div className={`${sizeMap[size]} relative ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="bizraGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#8A6B2E", stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: "#C9A962", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#F9F1D8", stopOpacity: 1 }} />
          </linearGradient>
          <filter id="bizraGlow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="bizraGlowIntense">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Construction Circles (The Seed of Life Grid) */}
        {showConstruction && (
          <g transform="translate(100, 100)">
            <motion.circle
              cx="0" cy="0" r="40"
              fill="none" stroke="#C9A962" strokeWidth="0.5"
              custom={0}
              initial="hidden"
              animate={isVisible ? ["visible", "faded"] : "hidden"}
              variants={autoAnimate ? seedCircleVariants : staticVariants}
            />
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
                cx={pos.cx} cy={pos.cy} r="40"
                fill="none" stroke="#C9A962" strokeWidth="0.5"
                custom={i + 1}
                initial="hidden"
                animate={isVisible ? ["visible", "faded"] : "hidden"}
                variants={autoAnimate ? seedCircleVariants : staticVariants}
              />
            ))}
            <motion.circle
              cx="0" cy="0" r="80"
              fill="none" stroke="rgba(201, 169, 98, 0.1)"
              strokeWidth="0.5" strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={isVisible ? { opacity: 0.3 } : { opacity: 0 }}
              transition={{ duration: 1, delay: 1 }}
            />
          </g>
        )}

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
              stroke="url(#bizraGoldGrad)"
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#bizraGlow)"
              custom={i}
              initial="hidden"
              animate={isVisible ? "visible" : "hidden"}
              variants={autoAnimate ? petalVariants : { visible: { opacity: 1, pathLength: 1 } }}
            />
          ))}
          
          {/* Center Nuqta (Diamond) */}
          <motion.rect
            x="-4" y="-4" width="8" height="8"
            transform="rotate(45)"
            fill="url(#bizraGoldGrad)"
            filter="url(#bizraGlowIntense)"
            initial="hidden"
            animate={isVisible ? "visible" : "hidden"}
            variants={autoAnimate ? centerDotVariants : { visible: { opacity: 1, scale: 1 } }}
          />
        </g>
      </svg>
    </div>
  )
}

// Static logo for navbar/small uses
export function BizraLogoStatic({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <linearGradient id="navGoldGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#8A6B2E" }} />
          <stop offset="50%" style={{ stopColor: "#C9A962" }} />
          <stop offset="100%" style={{ stopColor: "#F9F1D8" }} />
        </linearGradient>
      </defs>
      <g transform="translate(50, 50)" stroke="url(#navGoldGrad)" strokeWidth="1.5" fill="none">
        {/* Simplified Seed of Life */}
        <circle cx="0" cy="0" r="20" opacity="0.3" />
        <circle cx="0" cy="-20" r="20" opacity="0.3" />
        <circle cx="17.3" cy="-10" r="20" opacity="0.3" />
        <circle cx="17.3" cy="10" r="20" opacity="0.3" />
        <circle cx="0" cy="20" r="20" opacity="0.3" />
        <circle cx="-17.3" cy="10" r="20" opacity="0.3" />
        <circle cx="-17.3" cy="-10" r="20" opacity="0.3" />
        {/* Center */}
        <rect x="-2" y="-2" width="4" height="4" transform="rotate(45)" fill="url(#navGoldGrad)" />
      </g>
    </svg>
  )
}
