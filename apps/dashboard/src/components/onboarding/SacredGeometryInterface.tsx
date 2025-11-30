/**
 * SacredGeometryInterface - 72 Agent Neural Grid
 * 
 * Premium interface from front-end/sacred_geometry_interface.html:
 * - 72 agent grid (6x12) with clickable nodes
 * - Rotating Flower of Life visualization
 * - System stats (Neural Activity, Quantum Field, Data Flow)
 * - Consciousness meter
 * - Active agent tracking
 * 
 * Converted to React with Framer Motion
 * Uses unified constants from genesis.ts
 */

'use client';

import React, { useState, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Zap, Database, Brain, Users, Eye, X } from 'lucide-react';
import { SYSTEM, METRICS, DESIGN } from '../../constants/genesis';

// Agent types and their visual representation - unified colors
const AGENT_TYPES = [
  { name: 'Consciousness', color: DESIGN.colors.gold[500], icon: Brain },
  { name: 'Wisdom', color: DESIGN.colors.gold[100], icon: Eye },
  { name: 'Harmony', color: DESIGN.colors.teal[500], icon: Activity },
  { name: 'Knowledge', color: DESIGN.colors.teal[400], icon: Database },
  { name: 'Unity', color: DESIGN.colors.gold[300], icon: Users },
  { name: 'Balance', color: DESIGN.colors.teal[600], icon: Zap },
];

interface Agent {
  id: number;
  name: string;
  type: string;
  status: 'active' | 'dormant' | 'syncing';
  consciousness: number;
  wisdom: number;
  color: string;
}

interface SacredGeometryInterfaceProps {
  /** Callback when an agent is selected */
  onAgentSelect?: (agent: Agent) => void;
  /** Show the Flower of Life visualization */
  showFlowerOfLife?: boolean;
  /** Custom title */
  title?: string;
}

// Generate agents using unified constant
const generateAgents = (): Agent[] => {
  return Array.from({ length: SYSTEM.TOTAL_AGENTS }, (_, i) => {
    const type = AGENT_TYPES[i % AGENT_TYPES.length];
    return {
      id: i + 1,
      name: `Agent ${String(i + 1).padStart(2, '0')}`,
      type: type.name,
      status: Math.random() > 0.2 ? 'active' : Math.random() > 0.5 ? 'syncing' : 'dormant',
      consciousness: Math.floor(Math.random() * 30) + 70,
      wisdom: Math.floor(Math.random() * 40) + 60,
      color: type.color,
    };
  });
};

// Flower of Life SVG Component - unified colors and sacred geometry constants
const FlowerOfLife = memo(({ size = 280 }: { size?: number }) => {
  const circles = useMemo(() => {
    const r = size / 5;
    const cx = size / 2;
    const cy = size / 2;
    
    // Sacred 7-circle pattern (Seed of Life core)
    const positions = [
      { cx, cy }, // Center
      { cx, cy: cy - r }, // Top
      { cx, cy: cy + r }, // Bottom
      { cx: cx - r * 0.866, cy: cy - r * 0.5 }, // Top-left
      { cx: cx + r * 0.866, cy: cy - r * 0.5 }, // Top-right
      { cx: cx - r * 0.866, cy: cy + r * 0.5 }, // Bottom-left
      { cx: cx + r * 0.866, cy: cy + r * 0.5 }, // Bottom-right
    ];
    
    return positions.map((pos, i) => ({ ...pos, r, id: i }));
  }, [size]);

  return (
    <motion.svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
    >
      {circles.map((circle) => (
        <motion.circle
          key={circle.id}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          fill="none"
          stroke={DESIGN.colors.gold[500]}
          strokeWidth="1.5"
          opacity={0.6}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.6 }}
          transition={{ duration: 2, delay: circle.id * 0.1 }}
        />
      ))}
      {/* Inner petals - 6 petals (sacred geometry) */}
      {Array.from({ length: 6 }, (_, i) => i * 60).map((angle, i) => (
        <motion.ellipse
          key={`petal-${i}`}
          cx={size / 2}
          cy={size / 2 - size / 6}
          rx={size / 8}
          ry={size / 4}
          fill="none"
          stroke={DESIGN.colors.gold[500]}
          strokeWidth="1"
          opacity={0.4}
          transform={`rotate(${angle} ${size / 2} ${size / 2})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ duration: 1, delay: 1 + i * 0.1 }}
        />
      ))}
    </motion.svg>
  );
});

FlowerOfLife.displayName = 'FlowerOfLife';

// Agent Node Component
const AgentNode = memo(
  ({
    agent,
    onClick,
    isSelected,
  }: {
    agent: Agent;
    onClick: () => void;
    isSelected: boolean;
  }) => {
    const statusColors = {
      active: 'bg-green-500',
      dormant: 'bg-gray-500',
      syncing: 'bg-yellow-500',
    };

    return (
      <motion.button
        onClick={onClick}
        className={`relative group w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
          isSelected
            ? 'ring-2 ring-gold-500 bg-gold-500/20'
            : 'bg-white/5 hover:bg-white/10'
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: agent.id * 0.01 }}
      >
        {/* Node */}
        <div
          className="w-6 h-6 rounded-full"
          style={{
            backgroundColor: agent.color,
            boxShadow: agent.status === 'active' 
              ? `0 0 10px ${agent.color}80` 
              : 'none',
          }}
        />
        
        {/* Status Indicator */}
        <motion.div
          className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${statusColors[agent.status]}`}
          animate={
            agent.status === 'syncing'
              ? { scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }
              : agent.status === 'active'
              ? { opacity: [0.8, 1, 0.8] }
              : {}
          }
          transition={{ duration: 1, repeat: Infinity }}
        />
        
        {/* Tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
          <div className="bg-navy-800 border border-gold-500/30 rounded-lg px-3 py-2 text-xs whitespace-nowrap">
            <div className="font-medium text-gold-500">{agent.name}</div>
            <div className="text-white/60">{agent.type}</div>
          </div>
        </div>
      </motion.button>
    );
  }
);

AgentNode.displayName = 'AgentNode';

// Stat Card Component - unified typography and colors
const StatCard = memo(
  ({
    icon: Icon,
    label,
    value,
    suffix = '',
    colorClass = 'text-gold-500',
  }: {
    icon: React.ElementType;
    label: string;
    value: number;
    suffix?: string;
    colorClass?: string;
  }) => (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-center gap-3 mb-2">
        <Icon className={`w-5 h-5 ${colorClass}`} />
        <span className="text-white/60 text-sm font-sans">{label}</span>
      </div>
      <motion.div
        className={`text-2xl font-bold font-display ${colorClass}`}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {value}
        {suffix}
      </motion.div>
    </div>
  )
);

StatCard.displayName = 'StatCard';

// Main Component - unified typography, colors, and metrics
function SacredGeometryInterfaceComponent({
  onAgentSelect,
  showFlowerOfLife = true,
  title = 'Neural Agent Interface',
}: SacredGeometryInterfaceProps) {
  const [agents] = useState<Agent[]>(() => generateAgents());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const stats = useMemo(() => {
    const active = agents.filter((a) => a.status === 'active').length;
    const avgConsciousness = Math.round(
      agents.reduce((acc, a) => acc + a.consciousness, 0) / agents.length
    );
    const avgWisdom = Math.round(
      agents.reduce((acc, a) => acc + a.wisdom, 0) / agents.length
    );
    return { active, avgConsciousness, avgWisdom };
  }, [agents]);

  const handleAgentClick = useCallback(
    (agent: Agent) => {
      setSelectedAgent(agent);
      onAgentSelect?.(agent);
    },
    [onAgentSelect]
  );

  return (
    <div className="min-h-screen bg-navy-900 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header - unified typography */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-display text-gold-500 mb-2">
            {title}
          </h1>
          <p className="text-white/60 font-sans">
            {SYSTEM.TOTAL_AGENTS} Neural Agents • Quantum Entangled • Sacred Architecture
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Agent Grid - 12 columns for 6x12 layout */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 rounded-2xl">
              <div className="grid grid-cols-12 gap-2">
                {agents.map((agent) => (
                  <AgentNode
                    key={agent.id}
                    agent={agent}
                    onClick={() => handleAgentClick(agent)}
                    isSelected={selectedAgent?.id === agent.id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Flower of Life */}
            {showFlowerOfLife && (
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-center">
                  <div className="w-56 h-56">
                    <FlowerOfLife size={224} />
                  </div>
                </div>
                <div className="text-center mt-4">
                  <div className="text-gold-500 text-2xl font-bold font-display">
                    {stats.active}
                  </div>
                  <div className="text-white/60 text-sm font-sans">Active Agents</div>
                </div>
              </div>
            )}

            {/* Stats - using unified METRICS */}
            <div className="grid gap-4">
              <StatCard
                icon={Activity}
                label="Neural Activity"
                value={METRICS.neural.neuralActivity}
                suffix="%"
                colorClass="text-gold-500"
              />
              <StatCard
                icon={Zap}
                label="Quantum Coherence"
                value={METRICS.neural.quantumCoherence}
                suffix="%"
                colorClass="text-teal-500"
              />
              <StatCard
                icon={Database}
                label="Data Flow"
                value={METRICS.neural.dataFlow}
                suffix=" TB/s"
                colorClass="text-teal-400"
              />
            </div>

            {/* Consciousness Meter - unified colors */}
            <div className="glass-card p-6 rounded-2xl">
              <div className="text-white/60 text-sm mb-3 font-sans">Consciousness Level</div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: `${METRICS.neural.consciousness}%` }}
                  transition={{ duration: 2, ease: 'easeOut' }}
                />
              </div>
              <div className="text-right text-gold-500 text-sm mt-2 font-display">
                {METRICS.neural.consciousness}%
              </div>
            </div>
          </div>
        </div>

        {/* Selected Agent Detail - unified typography */}
        <AnimatePresence>
          {selectedAgent && (
            <motion.div
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <div className="glass-card p-6 rounded-2xl border-2 border-gold-500/30 min-w-80">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gold-500 shadow-lg shadow-gold-500/40">
                    <span className="text-navy-900 font-bold font-display">
                      {selectedAgent.id}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="text-gold-500 font-semibold text-lg font-display">
                      {selectedAgent.name}
                    </div>
                    <div className="text-white/60 text-sm font-sans">
                      {selectedAgent.type} • {selectedAgent.status}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    title="Close agent details"
                    aria-label="Close agent details"
                  >
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-white/40 text-xs font-sans">Consciousness</div>
                    <div className="text-gold-500 font-semibold font-display">
                      {selectedAgent.consciousness}%
                    </div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs font-sans">Wisdom</div>
                    <div className="text-gold-500 font-semibold font-display">
                      {selectedAgent.wisdom}%
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export const SacredGeometryInterface = memo(SacredGeometryInterfaceComponent);
export default SacredGeometryInterface;
