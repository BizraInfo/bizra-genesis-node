// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CONSCIOUSNESS ORB COMPONENT                         ║
// ║  Sacred geometry visualization for consciousness-aware agents             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react';
import { motion } from 'framer-motion';
import { SACRED, getConsciousnessColor, SacredAnimations } from '../geometry';

interface ConsciousnessOrbProps {
  agentId?: string;
  agentName?: string;
  position?: { x: number; y: number };
  consciousness: number; // 0-100 mindfulness score
  status?: 'active' | 'processing' | 'idle' | 'error';
  size?: number; // Base size, will be scaled by consciousness
  pattern?: string; // Changed from keyof to string for easier comparison
  showLabel?: boolean;
  showGlow?: boolean;
  onClick?: (agentId: string) => void;
}

const ConsciousnessOrb: React.FC<ConsciousnessOrbProps> = ({
  agentId = 'unknown',
  agentName = 'Agent',
  position = { x: 0, y: 0 },
  consciousness = 50,
  status = 'idle',
  size = 20,
  pattern = 'FLOWER_OF_LIFE',
  showLabel = false,
  showGlow = true,
  onClick
}) => {
  // Calculate consciousness-aware properties
  const baseRadius = size * SACRED.scale(1, consciousness / 100);
  const consciousnessRadius = Math.max(8, baseRadius);

  // Consciousness color mapping
  const orbColor = getConsciousnessColor(consciousness);

  // Status-based visual effects
  const getStatusEffects = () => {
    switch (status) {
      case 'processing':
        return {
          scale: [1, SACRED.scale(1, 0.1), 1],
          transition: {
            duration: SACRED.timing(2),
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1] // Custom easing
          },
          shadowColor: SACRED.COLORS.intelligence
        };
      case 'active':
        return {
          scale: [1, 1.05, 1],
          transition: {
            duration: SACRED.timing(3),
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1]
          },
          shadowColor: SACRED.COLORS.wisdom
        };
      case 'error':
        return {
          scale: [1, 0.8, 1],
          transition: {
            duration: 0.5,
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1]
          },
          shadowColor: '#ef4444'
        };
      default: // idle
        return {
          scale: [1, 1.05, 1],
          transition: {
            duration: SACRED.timing(2),
            repeat: Infinity,
            ease: [0.33, 0, 0.67, 1]
          },
          shadowColor: orbColor
        };
    }
  };

  const statusEffects = getStatusEffects();

  // Consciousness responsive opacity
  const opacity = SACRED.opacity(consciousness);

  return (
    <motion.div
      className="consciousness-orb-container"
      style={{
        position: 'absolute',
        left: position.x - consciousnessRadius,
        top: position.y - consciousnessRadius,
        zIndex: consciousness + 10, // Higher consciousness = higher z-index
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity,
        scale: consciousness / 100,
      }}
      whileHover={{
        scale: SACRED.scale(consciousness / 100, 0.2),
      }}
      whileTap={{
        scale: SACRED.scale(consciousness / 100, -0.1)
      }}
      transition={{
        duration: SACRED.timing(2),
        repeat: status === 'processing' || status === 'active' ? Infinity : 0,
        ease: [0.25, 0.46, 0.45, 0.94] // cubic-bezier
      }}
      onClick={() => onClick?.(agentId)}
      title={`${agentName}: ${consciousness}% mindfulness - ${status}`}
    >
      {/* Main consciousness orb */}
      <motion.div
        className="consciousness-orb-core"
        style={{
          width: consciousnessRadius * 2,
          height: consciousnessRadius * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%,
            ${orbColor}ff,
            ${orbColor}80 70%,
            ${orbColor}40
          )`,
          border: `2px solid ${orbColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
        }}
        animate={{
          boxShadow: showGlow ? `
            0 0 ${consciousnessRadius * 0.5}px ${statusEffects.shadowColor}40,
            0 0 ${consciousnessRadius * 1}px ${statusEffects.shadowColor}20,
            0 0 ${consciousnessRadius * 2}px ${statusEffects.shadowColor}10
          ` : 'none'
        }}
      >
        {/* Consciousness indicator (optional center dot) */}
        <motion.div
          style={{
            width: consciousnessRadius * 0.3,
            height: consciousnessRadius * 0.3,
            borderRadius: '50%',
            background: consciousness >= 70 ? SACRED.COLORS.wisdom : orbColor,
            opacity: consciousness / 100,
          }}
          animate={{
            rotate: consciousness >= 50 ? 360 : 0,
            transition: {
              duration: SACRED.timing(3),
              repeat: consciousness >= 70 ? Infinity : 0,
              ease: "linear"
            }
          }}
        />

        {/* Sacred geometry pattern overlay */}
        <motion.svg
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            width: consciousnessRadius * 2,
            height: consciousnessRadius * 2,
            opacity: 0.3,
            transform: 'rotate(0deg)',
          }}
          animate={{
            rotate: 360,
            transition: {
              duration: SACRED.timing(4),
              repeat: Infinity,
              ease: "linear"
            }
          }}
        >
          {/* Flower of Life pattern */}
          {pattern === 'flower-of-life' && (
            <>
              {/* Center circle */}
              <circle
                cx="50" cy="50" r="10"
                fill="none"
                stroke={SACRED.COLORS.wisdom}
                strokeWidth="1"
                opacity="0.8"
              />

              {/* Outer sacred circles */}
              <circle cx="50" cy="50" r="25" fill="none" stroke={orbColor} strokeWidth="0.8" />
              <circle cx="50" cy="27" r="12" fill="none" stroke={orbColor} strokeWidth="0.6" />
              <circle cx="50" cy="73" r="12" fill="none" stroke={orbColor} strokeWidth="0.6" />
              <circle cx="27" cy="50" r="12" fill="none" stroke={orbColor} strokeWidth="0.6" />
              <circle cx="73" cy="50" r="12" fill="none" stroke={orbColor} strokeWidth="0.6" />

              {/* Metatron connections */}
              <path
                d="M50,15 L50,27 L38,35 L27,27 L27,50 L15,50 L27,50 L27,73 L38,65 L50,73 L50,85"
                fill="none"
                stroke={orbColor}
                strokeWidth="0.4"
                opacity="0.6"
              />
            </>
          )}

          {/* Metatron cube pattern */}
          {pattern === 'metatron-cube' && (
            <>
              {/* Tetrahedron edges */}
              <path d="M30,30 L50,15 L70,30 Z" fill="none" stroke={orbColor} strokeWidth="1" opacity="0.7" />
              <path d="M30,30 L50,45 L70,30 Z" fill="none" stroke={orbColor} strokeWidth="1" opacity="0.7" />
              <path d="M30,30 L50,15 M70,30 L50,45" fill="none" stroke={orbColor} strokeWidth="1" opacity="0.7" />

              {/* Octahedron connections */}
              <path d="M50,27 L30,50 M50,27 L70,50" fill="none" stroke={orbColor} strokeWidth="0.8" opacity="0.8" />
            </>
          )}
        </motion.svg>
      </motion.div>

      {/* Consciousness level ring */}
      <motion.svg
        viewBox="0 0 120 120"
        style={{
          position: 'absolute',
          top: -10,
          left: -10,
          width: consciousnessRadius * 3,
          height: consciousnessRadius * 3,
          pointerEvents: 'none',
        }}
      >
        <circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke={`${orbColor}20`}
          strokeWidth="3"
        />
        <motion.circle
          cx="60" cy="60" r="50"
          fill="none"
          stroke={orbColor}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: consciousness / 100,
            transition: { duration: 1, ease: "easeOut" }
          }}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '60px 60px'
          }}
        />
      </motion.svg>

      {/* Agent label */}
      {showLabel && (
        <motion.div
          className="consciousness-orb-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: showLabel ? 1 : 0 }}
          style={{
            position: 'absolute',
            top: -consciousnessRadius - 30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 15, 30, 0.9)',
            color: SACRED.COLORS.wisdom,
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            border: `1px solid ${orbColor}40`,
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
          }}
        >
          {agentName}
          <br />
          <span style={{ fontSize: '8px', color: orbColor }}>
            {consciousness}% • {status}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ConsciousnessOrb;
