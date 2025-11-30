'use client';

/**
 * BIZRA Official Brand Logo - Seed of Life
 * Based on BIZRA Brand Identity v1.0
 * 
 * The logo represents:
 * - The Seed (Nuqta): Divine Origin (Tawhid) - the central circle
 * - The Seed of Life: 6 surrounding circles representing 6 days of creation
 * - The Bloom (Ihsan): Where circles overlap, forming the flower of community
 */

import React from 'react';
import { motion } from 'framer-motion';

interface BizraLogoProps {
  /** Size of the logo in pixels */
  size?: number;
  /** Whether to animate the logo on mount */
  animated?: boolean;
  /** Show construction grid lines */
  showConstruction?: boolean;
  /** CSS class name */
  className?: string;
  /** Variant style */
  variant?: 'full' | 'minimal' | 'outline';
}

/**
 * BIZRA Official Seed of Life Logo
 * Sacred geometry representing divine creation and community
 */
export function BizraLogo({
  size = 200,
  animated = false,
  showConstruction = false,
  className = '',
  variant = 'full',
}: BizraLogoProps) {
  const viewBox = "0 0 200 200";
  const center = 100;
  const radius = 40;
  const outerRadius = 80;

  // Calculate positions for 6 surrounding circles
  const surroundingCircles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * 60 - 90) * (Math.PI / 180);
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
    };
  });

  // Petal paths (where circles intersect)
  const petalPaths = [
    "M0 -40 Q20 -20 0 0 Q-20 -20 0 -40",
    "M34.6 -20 Q17.3 10 0 0 Q17.3 -10 34.6 -20",
    "M34.6 20 Q17.3 10 0 0 Q17.3 30 34.6 20",
    "M0 40 Q-20 20 0 0 Q20 20 0 40",
    "M-34.6 20 Q-17.3 10 0 0 Q-17.3 30 -34.6 20",
    "M-34.6 -20 Q-17.3 10 0 0 Q-17.3 -10 -34.6 -20",
  ];

  const circleVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: showConstruction ? 0.3 : 1,
      transition: {
        pathLength: { duration: 1.5, delay: i * 0.1, ease: "easeInOut" },
        opacity: { duration: 0.5, delay: i * 0.1 },
      },
    }),
  };

  const petalVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: (i: number) => ({
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { duration: 1, delay: 0.8 + i * 0.1, ease: "easeOut" },
        opacity: { duration: 0.3, delay: 0.8 + i * 0.1 },
      },
    }),
  };

  const dotVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.5, delay: 1.5 },
    },
  };

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      className={`overflow-visible ${className}`}
      role="img"
      aria-label="BIZRA Logo - Seed of Life"
    >
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A6B2E" />
          <stop offset="50%" stopColor="#C9A962" />
          <stop offset="100%" stopColor="#F9F1D8" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Construction Grid (Optional) */}
      {showConstruction && (
        <g transform={`translate(${center}, ${center})`}>
          <circle
            cx="0"
            cy="0"
            r={outerRadius}
            fill="none"
            stroke="rgba(201, 169, 98, 0.1)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        </g>
      )}

      {/* The Seed of Life Circles */}
      <g transform={`translate(${center}, ${center})`}>
        {/* Center Circle - The Seed */}
        <motion.circle
          cx="0"
          cy="0"
          r={radius}
          fill="none"
          stroke="#C9A962"
          strokeWidth={variant === 'outline' ? 0.5 : 1}
          custom={0}
          variants={animated ? circleVariants : undefined}
          initial={animated ? "hidden" : undefined}
          animate={animated ? "visible" : undefined}
        />

        {/* 6 Surrounding Circles */}
        {surroundingCircles.map((circle, i) => (
          <motion.circle
            key={i}
            cx={circle.cx - center}
            cy={circle.cy - center}
            r={radius}
            fill="none"
            stroke="#C9A962"
            strokeWidth={variant === 'outline' ? 0.5 : 1}
            custom={i + 1}
            variants={animated ? circleVariants : undefined}
            initial={animated ? "hidden" : undefined}
            animate={animated ? "visible" : undefined}
          />
        ))}
      </g>

      {/* The Flower Petals (Intersection Areas) */}
      {variant === 'full' && (
        <g transform={`translate(${center}, ${center})`} filter="url(#logoGlow)">
          {petalPaths.map((path, i) => (
            <motion.path
              key={i}
              d={path}
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="1.5"
              strokeLinecap="round"
              custom={i}
              variants={animated ? petalVariants : undefined}
              initial={animated ? "hidden" : undefined}
              animate={animated ? "visible" : undefined}
            />
          ))}
        </g>
      )}

      {/* Central Nuqta (The Divine Point) */}
      {variant !== 'outline' && (
        <motion.rect
          x={center - 3}
          y={center - 3}
          width="6"
          height="6"
          fill="url(#goldGradient)"
          transform={`rotate(45, ${center}, ${center})`}
          variants={animated ? dotVariants : undefined}
          initial={animated ? "hidden" : undefined}
          animate={animated ? "visible" : undefined}
        />
      )}
    </svg>
  );
}

/**
 * BIZRA Wordmark
 * Official brand typography
 */
export function BizraWordmark({
  size = 'default',
  className = '',
}: {
  size?: 'small' | 'default' | 'large' | 'hero';
  className?: string;
}) {
  const sizeClasses = {
    small: 'text-2xl tracking-[0.2em]',
    default: 'text-4xl tracking-[0.25em]',
    large: 'text-6xl tracking-[0.3em]',
    hero: 'text-6xl md:text-8xl tracking-widest',
  };

  return (
    <h1
      className={`
        font-display font-normal
        text-transparent bg-clip-text 
        bg-gradient-to-b from-gold-300 to-gold-600
        ${sizeClasses[size]}
        ${className}
      `}
    >
      BIZRA
    </h1>
  );
}

/**
 * BIZRA Arabic Tagline
 * "البذرة" - The Seed
 */
export function BizraArabicTag({
  className = '',
}: {
  className?: string;
}) {
  return (
    <div className={`font-arabic text-gold-500/60 text-2xl ${className}`}>
      البذرة
    </div>
  );
}

/**
 * Complete BIZRA Logo with Wordmark
 */
export function BizraLogoFull({
  logoSize = 96,
  animated = true,
  className = '',
}: {
  logoSize?: number;
  animated?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BizraLogo size={logoSize} animated={animated} />
      <div className="mt-6 text-center">
        <BizraWordmark size="large" />
        <BizraArabicTag className="mt-2" />
      </div>
    </div>
  );
}

/**
 * Compact BIZRA Logo for navigation/headers
 */
export function BizraLogoCompact({
  size = 40,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <BizraLogo size={size} variant="minimal" />
      <span className="font-display text-gold-500 tracking-widest text-lg">
        BIZRA
      </span>
    </div>
  );
}

export default BizraLogo;
