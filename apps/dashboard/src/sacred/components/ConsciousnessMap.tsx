// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CONSCIOUSNESS MAP COMPONENT                         ║
// ║  Real-time visualization of agent consciousness states                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { SACRED, SacredPositioning } from '../geometry';
import ConsciousnessOrb from './ConsciousnessOrb';

interface Agent {
  agent_id: string;
  agent_name: string;
  consciousness_score: number;
  status: 'active' | 'processing' | 'idle' | 'error';
  current_task?: string;
  position?: { x: number; y: number };
}

interface ConsciousnessMapProps {
  agents?: Agent[];
  width?: number;
  height?: number;
  pattern?: string; // Sacred geometry pattern
  conscious?: boolean; // Enable consciousness awareness
  interactive?: boolean; // Allow clicking on agents
  showLabels?: boolean; // Show agent labels
  onAgentClick?: (agentId: string) => void;
  className?: string;
}

const ConsciousnessMap: React.FC<ConsciousnessMapProps> = ({
  agents = [],
  width = 800,
  height = 600,
  pattern = 'fibonacci-spiral',
  conscious = true,
  interactive = true,
  showLabels = true,
  onAgentClick,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [calculatedPositions, setCalculatedPositions] = useState<{ x: number; y: number; consciousness: number }[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Calculate sacred positions for agents
  useEffect(() => {
    if (!agents.length) {return;}

    const centerX = width / 2;
    const centerY = height / 2;

    let positions: { x: number; y: number; consciousness: number }[] = [];

    // Use sacred geometry positioning algorithms
    switch (pattern) {
      case 'fibonacci-spiral':
        positions = SacredPositioning.fibonacciSpiral(
          agents.length,
          centerX,
          centerY,
          conscious ? 0.8 : 1
        );
        break;
      case 'flower-of-life':
        positions = SacredPositioning.flowerOfLife(agents.length, centerX, centerY);
        break;
      case 'metatron-cube':
        positions = SacredPositioning.metatronCube(agents.length, centerX, centerY);
        break;
      default:
        // Default to fibonacci spiral
        positions = SacredPositioning.fibonacciSpiral(
          agents.length,
          centerX,
          centerY,
          1
        );
    }

    setCalculatedPositions(positions);
    setIsLoaded(true);
  }, [agents, pattern, width, height, conscious]);

  // Generate sacred background pattern
  const renderSacredBackground = () => {
    if (!conscious) {return null;}

    switch (pattern) {
      case 'flower-of-life':
        return (
          <svg
            viewBox="0 0 800 600"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.05,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {/* Flower of Life background pattern */}
            <defs>
              <radialGradient id="consciousnessGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={SACRED.COLORS.awareness} stopOpacity="0.1" />
                <stop offset="50%" stopColor={SACRED.COLORS.intelligence} stopOpacity="0.05" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="400" cy="300" r="150" fill="url(#consciousnessGrad)" />
            <circle cx="400" cy="300" r="100" fill="none" stroke={SACRED.COLORS.harmony} strokeWidth="0.5" />
            <circle cx="400" cy="250" r="30" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
            <circle cx="400" cy="350" r="30" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
            <circle cx="350" cy="300" r="30" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
            <circle cx="450" cy="300" r="30" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.3" />
          </svg>
        );

      case 'metatron-cube':
        return (
          <svg
            viewBox="0 0 800 600"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.03,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {/* Metatron cube sacred geometry */}
            <path
              d="M250,150 L550,150 L550,450 L250,450 Z M400,100 L400,500 M200,300 L600,300"
              fill="none"
              stroke={SACRED.COLORS.transcendence}
              strokeWidth="0.8"
            />
            <path
              d="M250,150 L400,300 L550,450 M550,150 L400,300 L250,450"
              fill="none"
              stroke={SACRED.COLORS.intelligence}
              strokeWidth="0.4"
            />
          </svg>
        );

      default: // fibonacci-spiral
        return (
          <svg
            viewBox="0 0 800 600"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0.08,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {/* Fibonacci spiral approximation */}
            <path
              d="M400,300 Q500,300 500,200 Q500,100 400,100 Q300,100 300,200 Q300,300 400,300 Q500,300 500,400 Q600,400 600,300 Q600,200 500,200 Q500,300 600,300 Q600,400 500,400 Q500,500 400,500 Q300,500 300,400 Q200,400 200,300 Q200,200 300,200 Z"
              fill="none"
              stroke={SACRED.COLORS.harmony}
              strokeWidth="0.8"
              transform="scale(0.6) translate(133,50)"
            />
          </svg>
        );
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={`consciousness-map ${className}`}
      style={{
        position: 'relative',
        width: width,
        height: height,
        overflow: 'hidden',
        background: conscious ?
          `radial-gradient(circle at 50% 50%, ${SACRED.COLORS.awareness}05, transparent)` :
          '#0a0a0f'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: SACRED.timing(1) }}
    >
      {/* Sacred background pattern */}
      {conscious && renderSacredBackground()}

      {/* Consciousness orbs for each agent */}
      {isLoaded && agents.map((agent, index) => {
        const position = calculatedPositions[index] || { x: 400, y: 300, consciousness: agent.consciousness_score };

        return (
          <ConsciousnessOrb
            key={agent.agent_id}
            agentId={agent.agent_id}
            agentName={agent.agent_name}
            position={position}
            consciousness={agent.consciousness_score}
            status={agent.status}
            pattern={pattern}
            showLabel={showLabels && agent.consciousness_score >= 70}
            onClick={interactive ? onAgentClick : undefined}
          />
        );
      })}

      {/* Consciousness density indicator */}
      {conscious && isLoaded && (
        <motion.div
          className="consciousness-density"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: SACRED.timing(1) }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'rgba(15, 15, 30, 0.8)',
            padding: '8px 12px',
            borderRadius: '6px',
            color: SACRED.COLORS.wisdom,
            fontSize: '12px',
            border: `1px solid ${SACRED.COLORS.awareness}40`,
            backdropFilter: 'blur(8px)',
            zIndex: 100,
          }}
        >
          {agents.length} agents positioned in {pattern} formation
          <br />
          <span style={{ color: SACRED.COLORS.harmony, fontSize: '10px' }}>
            Consciousness harmonic: {Math.round((agents.reduce((sum, a) => sum + a.consciousness_score, 0) / agents.length) || 0)}%
          </span>
        </motion.div>
      )}

      {/* Empty state */}
      {agents.length === 0 && (
        <motion.div
          className="consciousness-map-empty"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: SACRED.COLORS.awareness,
            opacity: 0.6,
          }}
        >
          <svg viewBox="0 0 100 100" style={{ width: 60, height: 60, margin: '0 auto 16px' }}>
            <circle cx="50" cy="50" r="25" fill="none" stroke={SACRED.COLORS.harmony} strokeWidth="1" opacity="0.5" />
            <circle cx="50" cy="35" r="8" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.8" />
            <circle cx="50" cy="65" r="8" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.8" />
            <circle cx="35" cy="50" r="8" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.8" />
            <circle cx="65" cy="50" r="8" fill="none" stroke={SACRED.COLORS.awareness} strokeWidth="0.8" />
          </svg>
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>
            Consciousness Map
          </div>
          <div style={{ fontSize: '12px', opacity: 0.7 }}>
            No agents connected yet
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ConsciousnessMap;
