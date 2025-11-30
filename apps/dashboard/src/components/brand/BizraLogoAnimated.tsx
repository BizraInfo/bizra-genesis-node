/**
 * BizraLogoAnimated - Sacred Geometry Draw-On Animation
 * 
 * The Seed of Life construction animation:
 * 1. Construction circles appear and fade
 * 2. Flower petals draw in
 * 3. Center dot finalizes
 * 
 * Migrated from award-winner-design with React 18 compatibility
 */

'use client';

import { useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

export interface BizraLogoAnimatedProps {
  /** Size of the logo in pixels */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Whether to loop the animation */
  loop?: boolean;
  /** Custom className for the container */
  className?: string;
}

const sizeMap = {
  sm: 'w-32 h-32',
  md: 'w-48 h-48',
  lg: 'w-64 h-64 md:w-80 md:h-80',
  xl: 'w-80 h-80 md:w-96 md:h-96',
};

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
      pathLength: { duration: 1.5, delay: i * 0.1, ease: 'easeInOut' },
      opacity: { duration: 1, delay: i * 0.1 },
    },
  }),
  faded: {
    opacity: 0.2,
    transition: { duration: 1, delay: 1.5 },
  },
};

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
      pathLength: { duration: 1.5, delay: 1.5 + i * 0.1, ease: 'easeOut' },
      opacity: { duration: 1, delay: 1.5 + i * 0.1 },
    },
  }),
};

const centerDotVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, delay: 3 },
  },
};

// Surrounding circle positions for Seed of Life
const surroundingCircles = [
  { cx: 0, cy: -40 },
  { cx: 34.6, cy: -20 },
  { cx: 34.6, cy: 20 },
  { cx: 0, cy: 40 },
  { cx: -34.6, cy: 20 },
  { cx: -34.6, cy: -20 },
];

// Petal paths
const petalPaths = [
  'M0 -40 Q20 -20 0 0 Q-20 -20 0 -40',
  'M34.6 -20 Q17.3 10 0 0 Q17.3 -10 34.6 -20',
  'M34.6 20 Q17.3 10 0 0 Q17.3 30 34.6 20',
  'M0 40 Q-20 20 0 0 Q20 20 0 40',
  'M-34.6 20 Q-17.3 10 0 0 Q-17.3 30 -34.6 20',
  'M-34.6 -20 Q-17.3 10 0 0 Q-17.3 -10 -34.6 -20',
];

function BizraLogoAnimatedComponent({
  size = 'lg',
  delay = 500,
  loop = false,
  className = '',
}: BizraLogoAnimatedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (loop && isVisible) {
      const loopInterval = setInterval(() => {
        setIsVisible(false);
        setTimeout(() => {
          setAnimationKey((prev) => prev + 1);
          setIsVisible(true);
        }, 100);
      }, 8000); // Restart every 8 seconds

      return () => clearInterval(loopInterval);
    }
  }, [loop, isVisible]);

  return (
    <div className={`${sizeMap[size]} relative ${className}`}>
      <svg
        key={animationKey}
        viewBox="0 0 200 200"
        className="w-full h-full overflow-visible"
        role="img"
        aria-label="BIZRA Logo - Seed of Life Sacred Geometry"
      >
        <defs>
          {/* Gold gradient */}
          <linearGradient id="goldGradAnimated" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#8A6B2E', stopOpacity: 1 }} />
            <stop offset="50%" style={{ stopColor: '#C9A962', stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: '#F9F1D8', stopOpacity: 1 }} />
          </linearGradient>

          {/* Glow filter */}
          <filter id="glowAnimated">
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
            animate={isVisible ? ['visible', 'faded'] : 'hidden'}
            variants={seedCircleVariants}
          />

          {/* Surrounding 6 circles forming Seed of Life */}
          {surroundingCircles.map((pos, i) => (
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
              animate={isVisible ? ['visible', 'faded'] : 'hidden'}
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
          {petalPaths.map((path, i) => (
            <motion.path
              key={`petal-${i}`}
              d={path}
              fill="none"
              stroke="url(#goldGradAnimated)"
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#glowAnimated)"
              custom={i}
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              variants={petalVariants}
            />
          ))}

          {/* Center dot (diamond) */}
          <motion.rect
            x="-3"
            y="-3"
            width="6"
            height="6"
            transform="rotate(45)"
            fill="url(#goldGradAnimated)"
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={centerDotVariants}
          />
        </g>
      </svg>
    </div>
  );
}

export const BizraLogoAnimated = memo(BizraLogoAnimatedComponent);
export default BizraLogoAnimated;
