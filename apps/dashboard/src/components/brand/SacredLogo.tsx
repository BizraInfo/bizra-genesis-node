// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SACRED LOGO COMPONENT                              ║
// ║  Sacred geometry based logo - Seed of Life pattern                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react';

export interface SacredLogoProps {
  /** Size of the logo in pixels */
  size?: number;
  /** Primary color (Genesis Gold) */
  primaryColor?: string;
  /** Secondary color (Growth Teal) */
  secondaryColor?: string;
  /** Animation enabled */
  animated?: boolean;
  /** CSS class name */
  className?: string;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

/**
 * SacredLogo - Renders the BIZRA Sacred Geometry logo (Seed of Life pattern)
 * The Seed of Life represents the seven days of creation and infinite potential.
 */
export const SacredLogo: React.FC<SacredLogoProps> = ({
  size = 64,
  primaryColor = '#C9A962',
  secondaryColor = '#2A9D8F',
  animated = false,
  className = '',
  'aria-label': ariaLabel = 'BIZRA Logo',
}) => {
  const radius = size / 4;
  const center = size / 2;

  // Calculate positions for the 6 outer circles (hexagonal arrangement)
  const outerCircles = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3; // 60 degrees apart
    return {
      cx: center + radius * Math.cos(angle),
      cy: center + radius * Math.sin(angle),
    };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`sacred-logo ${animated ? 'sacred-logo--animated' : ''} ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        {/* Gradient for depth effect */}
        <linearGradient id="sacredGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryColor} stopOpacity="0.9" />
          <stop offset="100%" stopColor={secondaryColor} stopOpacity="0.7" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="sacredGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background circle (optional) */}
      <circle
        cx={center}
        cy={center}
        r={radius * 2 - 2}
        fill="none"
        stroke={primaryColor}
        strokeWidth="0.5"
        opacity="0.3"
      />

      {/* Center circle - The Nuqta (النقطة) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="url(#sacredGradient)"
        strokeWidth="1.5"
        filter={animated ? 'url(#sacredGlow)' : undefined}
      />

      {/* Six outer circles - The Seed of Life */}
      {outerCircles.map((pos, i) => (
        <circle
          key={i}
          cx={pos.cx}
          cy={pos.cy}
          r={radius}
          fill="none"
          stroke={primaryColor}
          strokeWidth="1"
          opacity={0.8}
          className={animated ? 'sacred-circle' : ''}
          style={animated ? { animationDelay: `${i * 0.1}s` } : undefined}
        />
      ))}

      {/* Center dot - The seed point */}
      <circle
        cx={center}
        cy={center}
        r={2}
        fill={primaryColor}
      />

      {/* CSS for animations */}
      {animated && (
        <style>
          {`
            .sacred-logo--animated .sacred-circle {
              animation: sacredPulse 2s ease-in-out infinite;
            }

            @keyframes sacredPulse {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `}
        </style>
      )}
    </svg>
  );
};

export default SacredLogo;
