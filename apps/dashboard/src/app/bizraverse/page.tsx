'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useGenesisSynapse } from '@/hooks/useGenesisSynapse';

// Circle definitions for the 6 realms
const CIRCLES = [
  {
    id: 'learn',
    name: 'Learn',
    icon: '📚',
    color: 'from-purple-500 to-indigo-600',
    description: 'Acquire knowledge, master skills',
    link: '/knowledge',
    available: true,
  },
  {
    id: 'work',
    name: 'Work',
    icon: '⚡',
    color: 'from-amber-500 to-orange-600',
    description: 'Create, build, contribute',
    link: '/chat',
    available: true,
  },
  {
    id: 'play',
    name: 'Play',
    icon: '🎮',
    color: 'from-green-500 to-emerald-600',
    description: 'Games, creativity, exploration',
    link: null,
    available: false,
  },
  {
    id: 'reflect',
    name: 'Reflect',
    icon: '🌙',
    color: 'from-blue-500 to-cyan-600',
    description: 'Journal, meditate, plan',
    link: null,
    available: false,
  },
  {
    id: 'family',
    name: 'Family',
    icon: '👨‍👩‍👧‍👦',
    color: 'from-pink-500 to-rose-600',
    description: 'Connect with loved ones',
    link: null,
    available: false,
  },
  {
    id: 'commons',
    name: 'Commons',
    icon: '🌍',
    color: 'from-teal-500 to-cyan-600',
    description: 'Community, governance, shared resources',
    link: null,
    available: false,
  },
];

export default function BIZRAversePage() {
  const { synapse, connected } = useGenesisSynapse();
  const [hoveredCircle, setHoveredCircle] = useState<string | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  // Calculate glow intensity based on Ihsan score
  const ihsanScore = synapse?.ihsanScore || 0.85;
  const glowIntensity = Math.max(0.3, ihsanScore);
  const glowColor = ihsanScore >= 0.9 ? '#ffd700' : ihsanScore >= 0.8 ? '#90EE90' : '#87CEEB';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(100)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <motion.div
            className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
          >
            <span className="text-xl">🌱</span>
          </motion.div>
          <span className="text-white/80 group-hover:text-white transition-colors">
            ← Back to Dashboard
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-white/60 text-sm font-mono">
            Ihsan: {(ihsanScore * 100).toFixed(0)}%
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 bg-clip-text text-transparent mb-4">
            BIZRAverse
          </h1>
          <p className="text-white/60 text-lg max-w-md mx-auto">
            Your sovereign world. Six circles of life, one unified experience.
          </p>
        </motion.div>

        {/* Central Citadel */}
        <div className="relative">
          {/* Glow effect */}
          <motion.div
            className="absolute inset-0 rounded-full blur-3xl"
            style={{
              background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [glowIntensity * 0.5, glowIntensity, glowIntensity * 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Citadel core */}
          <motion.div
            className="relative w-48 h-48 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border-2 border-amber-500/50 flex items-center justify-center shadow-2xl"
            animate={{
              boxShadow: [
                `0 0 30px ${glowColor}40`,
                `0 0 60px ${glowColor}60`,
                `0 0 30px ${glowColor}40`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="text-center">
              <motion.div
                className="text-6xl mb-2"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                🏛️
              </motion.div>
              <span className="text-amber-400 font-bold text-sm">NODE0</span>
              <div className="text-white/40 text-xs mt-1">Your Citadel</div>
            </div>
          </motion.div>

          {/* Circle orbits */}
          {CIRCLES.map((circle, index) => {
            const angle = (index * 60 - 90) * (Math.PI / 180);
            const radius = 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={circle.id}
                className="absolute"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 + 0.5 }}
              >
                {circle.available ? (
                  <Link href={circle.link!}>
                    <CircleNode
                      circle={circle}
                      isHovered={hoveredCircle === circle.id}
                      onHover={() => setHoveredCircle(circle.id)}
                      onLeave={() => setHoveredCircle(null)}
                    />
                  </Link>
                ) : (
                  <CircleNode
                    circle={circle}
                    isHovered={hoveredCircle === circle.id}
                    onHover={() => setHoveredCircle(circle.id)}
                    onLeave={() => setHoveredCircle(null)}
                    disabled
                  />
                )}
              </motion.div>
            );
          })}

          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ left: '-50%', top: '-50%', width: '200%', height: '200%' }}>
            {CIRCLES.map((circle, index) => {
              const angle = (index * 60 - 90) * (Math.PI / 180);
              const radius = 180;
              const x = Math.cos(angle) * radius + 200;
              const y = Math.sin(angle) * radius + 200;

              return (
                <motion.line
                  key={circle.id}
                  x1="200"
                  y1="200"
                  x2={x}
                  y2={y}
                  stroke={circle.available ? '#ffd70040' : '#ffffff10'}
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: index * 0.1 + 0.8, duration: 0.5 }}
                />
              );
            })}
          </svg>
        </div>

        {/* Hover info panel */}
        <AnimatePresence>
          {hoveredCircle && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-lg rounded-xl p-6 border border-white/10 max-w-sm text-center"
            >
              {(() => {
                const circle = CIRCLES.find((c) => c.id === hoveredCircle);
                if (!circle) return null;
                return (
                  <>
                    <div className="text-4xl mb-2">{circle.icon}</div>
                    <h3 className="text-xl font-bold text-white mb-1">{circle.name}</h3>
                    <p className="text-white/60">{circle.description}</p>
                    {!circle.available && (
                      <div className="mt-3 px-3 py-1 bg-amber-500/20 rounded-full text-amber-400 text-sm inline-block">
                        Coming Soon
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer stats */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 flex justify-center gap-8 text-white/40 text-sm font-mono">
        <span>Epoch: {synapse?.epoch || 0}</span>
        <span>Latency: {synapse?.latencyUs ? `${synapse.latencyUs}μs` : '--'}</span>
        <span>Active Agents: {synapse?.activeAgents?.PAT || 7}</span>
      </footer>
    </div>
  );
}

// Circle node component
function CircleNode({
  circle,
  isHovered,
  onHover,
  onLeave,
  disabled = false,
}: {
  circle: (typeof CIRCLES)[0];
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.div
      className={`relative cursor-pointer ${disabled ? 'opacity-50' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      whileHover={disabled ? {} : { scale: 1.15 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {/* Glow on hover */}
      <AnimatePresence>
        {isHovered && !disabled && (
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${circle.color} blur-xl`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6, scale: 1.5 }}
            exit={{ opacity: 0, scale: 0.8 }}
          />
        )}
      </AnimatePresence>

      {/* Circle */}
      <div
        className={`relative w-20 h-20 rounded-full bg-gradient-to-br ${circle.color} flex items-center justify-center shadow-lg border-2 ${
          isHovered ? 'border-white/40' : 'border-white/10'
        } transition-all`}
      >
        <span className="text-3xl">{circle.icon}</span>
      </div>

      {/* Label */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
        <span className={`text-xs font-medium ${isHovered ? 'text-white' : 'text-white/60'}`}>
          {circle.name}
        </span>
      </div>
    </motion.div>
  );
}
