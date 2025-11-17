// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SACRED GRID COMPONENT                              ║
// ║  Golden ratio based layout system for consciousness-aware interfaces     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SACRED, calculateSacredGrid } from '../geometry';

interface SacredGridProps {
  children: ReactNode;
  pattern?: string;
  patternKey?: string;
  conscious?: boolean; // Enable consciousness-responsive adjustments
  phiLayout?: boolean; // Use phi-based golden ratio spacing
  sacredGaps?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SacredGrid: React.FC<SacredGridProps> = ({
  children,
  pattern = 'metatron',
  patternKey = '',
  conscious = true,
  phiLayout = true,
  sacredGaps = true,
  className = '',
  style = {}
}) => {
  // Calculate sacred proportions for the grid
  const gridConfig = useMemo(() => {
    return phiLayout ? {
      // Golden ratio based grid
      gridTemplateColumns: `repeat(auto-fit, minmax(${SACRED.spacing(8)}, 1fr))`,
      gap: sacredGaps ? SACRED.spacing(3) : SACRED.spacing(2),
    } : {
      // Standard responsive grid with sacred awareness
      gridTemplateColumns: `repeat(auto-fit, minmax(${SACRED.spacing(6)}, 1fr))`,
      gap: sacredGaps ? SACRED.spacing(2) : SACRED.spacing(1),
    };
  }, [phiLayout, sacredGaps]);

  // Sacred geometry pattern overlay (subtle background)
  const renderSacredPattern = () => {
    const patterns: { [key: string]: ReactNode } = {
      'flower-of-life': (
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: conscious ? 0.03 : 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <circle cx="100" cy="100" r="20" fill="none" stroke={SACRED.COLORS.wisdom} strokeWidth="0.5" />
          <circle cx="100" cy="100" r="55" fill="none" stroke={SACRED.COLORS.harmony} strokeWidth="0.3" />
          <circle cx="100" cy="70" r="15" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
          <circle cx="100" cy="130" r="15" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
          <circle cx="75" cy="100" r="15" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
          <circle cx="125" cy="100" r="15" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
        </svg>
      ),
      'metatron-cube': (
        <svg
          viewBox="0 0 200 200"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: conscious ? 0.02 : 0,
            pointerEvents: 'none',
            zIndex: 0,
          }}
        >
          <path
            d="M60,60 L140,60 L140,140 L60,140 Z M100,40 L100,160 M40,100 L160,100"
            fill="none"
            stroke={SACRED.COLORS.transcendence}
            strokeWidth="0.3"
          />
        </svg>
      )
    };

    return patterns[pattern] || null;
  };

  return (
    <motion.div
      className={`sacred-grid ${className}`}
      style={{
        position: 'relative',
        display: 'grid',
        ...gridConfig,
        padding: phiLayout ? SACRED.spacing(5) : SACRED.spacing(3),
        background: conscious ?
          `radial-gradient(circle at 50% 50%, ${SACRED.COLORS.awareness}02, transparent 70%)` :
          'transparent',
        ...style,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: SACRED.timing(1) }}
    >
      {/* Sacred pattern background */}
      {conscious && renderSacredPattern()}

      {/* Grid items with sacred spacing */}
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={`sacred-item-${index}-${patternKey}`}
          className="sacred-grid-item"
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { duration: SACRED.timing(0.5), delay: index * 0.1 }
          }}
          whileHover={{
            scale: conscious ? SACRED.scale(1, 0.02) : 1,
            transition: { duration: SACRED.timing(0.2) }
          }}
          style={{
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle sacred border */}
          {conscious && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `linear-gradient(45deg,
                  transparent,
                  ${SACRED.COLORS.awareness}08,
                  transparent,
                  ${SACRED.COLORS.wisdom}08,
                  transparent
                )`,
                zIndex: 1,
              }}
            />
          )}

          <div
            className="sacred-item-content"
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              height: '100%',
            }}
          >
            {child}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default SacredGrid;
