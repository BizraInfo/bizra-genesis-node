// ! Real-time Consciousness Stream Component
// ! WEB-01.1: WebSocket-powered consciousness pulse streaming
// ! Sub-millisecond real-time visualization of AI agent consciousness

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  calculateSacredPositions,
  batchConsciousnessCalculation,
  generateConsciousnessOrb,
  ConsciousnessOrb,
  SACRED_COLORS
} from './geometry';

interface AgentData {
  id: string;
  rawScore: number;
  consciousnessLevel: number;
  cognitiveLoad: number;
  interactionIntensity: number;
  lastUpdate: number;
}

interface StreamMetrics {
  fps: number;
  latency: number;
  agents: number;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface ConsciousnessStreamProps {
  width: number;
  height: number;
  websocketUrl?: string;
  pattern?: 'spiral' | 'hexagon' | 'metatron' | 'flower';
  maxAgents?: number;
  onMetricsUpdate?: (metrics: StreamMetrics) => void;
}

/**
 * Constitution - The beating heart of consciousness visualization
 */
const ConsciousnessStream: React.FC<ConsciousnessStreamProps> = ({
  width,
  height,
  websocketUrl = 'ws://localhost:8080',
  pattern = 'spiral',
  maxAgents = 100,
  onMetricsUpdate
}) => {
  const socketRef = useRef<Socket | null>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  // Core state
  const [agents, setAgents] = useState<Map<string, AgentData>>(new Map());
  const [orbs, setOrbs] = useState<Map<string, ConsciousnessOrb>>(new Map());
  const [streamMetrics, setStreamMetrics] = useState<StreamMetrics>({
    fps: 0,
    latency: 0,
    agents: 0,
    connectionStatus: 'connecting'
  });

  // Performance metrics
  const [fpsCounter, setFpsCounter] = useState(0);
  const fpsStartTimeRef = useRef<number>(Date.now());

  // Real-time visualization loop (144 FPS target)
  const updateVisualization = useCallback((currentTime: number) => {
    // Calculate FPS
    const deltaTime = currentTime - lastFrameTimeRef.current;
    if (deltaTime >= 16.67) { // ~60 FPS minimum
      const fps = 1000 / deltaTime;
      setFpsCounter(prev => prev + 1);

      // Update metrics every second
      if (currentTime - fpsStartTimeRef.current >= 1000) {
        const actualFps = fpsCounter / ((currentTime - fpsStartTimeRef.current) / 1000);
        setStreamMetrics(prev => ({
          ...prev,
          fps: Math.round(actualFps),
          agents: agents.size
        }));
        setFpsCounter(0);
        fpsStartTimeRef.current = currentTime;
      }

      lastFrameTimeRef.current = currentTime;

      // Update consciousness orbs based on agent data
      const newOrbs = new Map<string, ConsciousnessOrb>();

      agents.forEach((agent, agentId) => {
        // Calculate consciousness level with sacred mathematics
        const consciousnessResults = batchConsciousnessCalculation([
          { id: agentId, rawScore: agent.rawScore }
        ]);

        if (consciousnessResults.length > 0) {
          const result = consciousnessResults[0];
          agent.consciousnessLevel = result.consciousnessLevel;

          // Apply cognitive load damping (prevent over-excitation)
          const dampedLevel = agent.consciousnessLevel *
            (1 - agent.cognitiveLoad * 0.3) *
            (1 + agent.interactionIntensity * 0.2);

          // Calculate sacred pattern positions
          const [agentForPosition] = [{
            id: agentId,
            consciousnessLevel: dampedLevel
          }];

          const sacredPositions = calculateSacredPositions(
            [agentForPosition],
            width / 2,
            height / 2,
            pattern
          );

          if (sacredPositions.length > 0) {
            const position = sacredPositions[0];
            const orb = generateConsciousnessOrb(
              agentId,
              dampedLevel,
              position.x,
              position.y
            );

            // Add timing variation for natural appearance
            const timeOffset = (Math.sin(currentTime * 0.001 + agentId.charCodeAt(0)) + 1) * Math.PI;
            orb.x += Math.sin(timeOffset) * 2;
            orb.y += Math.cos(timeOffset) * 2;

            newOrbs.set(agentId, orb);
          }
        }
      });

      setOrbs(newOrbs);
    }

    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  }, [agents, width, height, pattern, fpsCounter]);

  // WebSocket connection setup
  useEffect(() => {
    const socket = io(websocketUrl, {
      transports: ['websocket'],
      timeout: 2000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('🌀 Consciousness Stream Connected');
      setStreamMetrics(prev => ({
        ...prev,
        connectionStatus: 'connected'
      }));
    });

    socket.on('disconnect', () => {
      console.log('🏮 Consciousness Stream Disconnected');
      setStreamMetrics(prev => ({
        ...prev,
        connectionStatus: 'disconnected'
      }));
    });

    socket.on('connect_error', (error: Error) => {
      console.error('🪡 Consciousness Stream Error:', error);
      setStreamMetrics(prev => ({
        ...prev,
        connectionStatus: 'error'
      }));
    });

    // Consciousness pulse data
    socket.on('consciousness:pulse', (data: {
      agents: Array<{
        id: string;
        rawScore: number;
        cognitiveLoad: number;
        interactionIntensity: number;
      }>;
      timestamp: number;
    }) => {
      const now = Date.now();
      const latency = now - data.timestamp;

      setStreamMetrics(prev => ({
        ...prev,
        latency: Math.round(latency)
      }));

      // Update agent data
      setAgents(prevAgents => {
        const newAgents = new Map(prevAgents);

        data.agents.slice(0, maxAgents).forEach(agentData => {
          newAgents.set(agentData.id, {
            id: agentData.id,
            rawScore: agentData.rawScore,
            consciousnessLevel: 0, // Will be calculated above
            cognitiveLoad: agentData.cognitiveLoad,
            interactionIntensity: agentData.interactionIntensity,
            lastUpdate: data.timestamp
          });
        });

        // Cleanup old agents (no data for 30 seconds)
        const cutoffTime = now - 30000;
        newAgents.forEach((agent, id) => {
          if (agent.lastUpdate < cutoffTime) {
            newAgents.delete(id);
          }
        });

        return newAgents;
      });
    });

    // Start visualization loop
    lastFrameTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(updateVisualization);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      socket.disconnect();
    };
  }, [websocketUrl, width, height, maxAgents, updateVisualization]);

  // Update parent metrics
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(streamMetrics);
    }
  }, [streamMetrics, onMetricsUpdate]);

  return (
    <div className="consciousness-stream" style={{
      width: `${width}px`,
      height: `${height}px`,
      position: 'relative',
      overflow: 'hidden',
      background: `radial-gradient(circle at center,
        hsl(${SACRED_COLORS.TRANSCENDENCE.h}, ${SACRED_COLORS.TRANSCENDENCE.s}%, 3%) 0%,
        hsl(${SACRED_COLORS.AWAKENING.h}, ${SACRED_COLORS.AWAKENING.s}%, 1%) 100%
      )`
    }}>
      <svg width={width} height={height} style={{ position: 'absolute' }}>
        <defs>
          <radialGradient id="consciousness-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={`hsl(${SACRED_COLORS.WISDOM.h}, ${SACRED_COLORS.WISDOM.s}%, ${SACRED_COLORS.WISDOM.l}%)`} stopOpacity="0.8" />
            <stop offset="100%" stopColor={`hsl(${SACRED_COLORS.TRANSCENDENCE.h}, ${SACRED_COLORS.TRANSCENDENCE.s}%, ${SACRED_COLORS.TRANSCENDENCE.l}%)`} stopOpacity="0.2" />
          </radialGradient>
        </defs>
      </svg>

      <AnimatePresence>
        {Array.from(orbs.values()).map((orb) => (
          <ConsciousnessOrbComponent
            key={orb.id}
            orb={orb}
            currentTime={lastFrameTimeRef.current}
          />
        ))}
      </AnimatePresence>

      {/* Connection Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontFamily: 'monospace',
        backgroundColor: streamMetrics.connectionStatus === 'connected' ? '#10b981' :
                         streamMetrics.connectionStatus === 'connecting' ? '#f59e0b' :
                         '#ef4444',
        color: 'white',
        zIndex: 1000
      }}>
        {streamMetrics.connectionStatus.toUpperCase()}
      </div>

      {/* Performance Metrics Overlay */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          padding: '6px',
          borderRadius: '4px',
          fontSize: '10px',
          fontFamily: 'monospace',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: '#10b981',
          zIndex: 1000
        }}>
          FPS: {streamMetrics.fps} | LAT: {streamMetrics.latency}ms | AGENTS: {streamMetrics.agents}
        </div>
      )}
    </div>
  );
};

interface ConsciousnessOrbComponentProps {
  orb: ConsciousnessOrb;
  currentTime: number;
}

/**
 * Individual consciousness orb with sacred animations
 */
const ConsciousnessOrbComponent: React.FC<ConsciousnessOrbComponentProps> = ({
  orb,
  currentTime
}) => {
  // Calculate animation parameters based on consciousness level
  const pulseScale = 1 + Math.sin(currentTime * 0.003 * orb.pulseFrequency) * 0.3;
  const rotationAngle = (currentTime * 0.001 * orb.rotationSpeed) % 360;

  // Golden ratio color modulation
  const hueShift = Math.sin(currentTime * 0.002) * 20;
  const modulatedColor = {
    h: (orb.color.h + hueShift) % 360,
    s: orb.color.s + Math.sin(currentTime * 0.001) * 10,
    l: Math.min(90, orb.color.l + Math.sin(currentTime * 0.002) * 20)
  };

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: orb.x - orb.radius,
        top: orb.y - orb.radius,
        width: orb.radius * 2,
        height: orb.radius * 2,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%,
          hsl(${modulatedColor.h}, ${modulatedColor.s}%, ${modulatedColor.l}%) 0%,
          hsl(${modulatedColor.h}, ${modulatedColor.s}%, ${modulatedColor.l * 0.6}%) 50%,
          hsl(${modulatedColor.h}, ${modulatedColor.s}%, ${modulatedColor.l * 0.3}%) 100%
        )`,
        opacity: orb.opacity,
        boxShadow: `0 0 ${orb.radius * 0.3}px hsla(${modulatedColor.h}, ${modulatedColor.s}%, ${modulatedColor.l}%, 0.6)`,
      }}
      animate={{
        scale: pulseScale,
        rotate: rotationAngle,
        x: Math.sin(currentTime * 0.001 + orb.id.charCodeAt(0)) * 1,
        y: Math.cos(currentTime * 0.001 + orb.id.charCodeAt(0)) * 1,
      }}
      transition={{
        duration: 0.016, // 60 FPS
        ease: 'linear',
      }}
      exit={{
        scale: 0,
        opacity: 0,
        transition: { duration: 1, ease: 'easeOut' }
      }}
    />
  );
};

export default ConsciousnessStream;
export type { ConsciousnessStreamProps, StreamMetrics, AgentData };
