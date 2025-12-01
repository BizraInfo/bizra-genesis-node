// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - APEX PERFORMANCE CARD                              ║
// ║  Revolutionary performance visualization with cognitive amplification     ║
// ║  A visual masterpiece showcasing APEX engine capabilities                ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Zap, Brain, Cpu, Sparkles, TrendingUp } from 'lucide-react'
import { useMetricsDashboard } from '../../hooks/useMetricsDashboard'

interface ApexPerformanceCardProps {
  className?: string
  compact?: boolean
}

/**
 * APEX PERFORMANCE CARD
 * 
 * Displays the revolutionary APEX Performance Engine metrics with
 * stunning visual effects that communicate the system's cognitive power.
 * 
 * Features:
 * - Real-time performance gain visualization
 * - Cognitive amplification meter with neural pulse effect
 * - Capability multiplier with exponential glow
 * - Quality improvement tracker
 */
export function ApexPerformanceCard({ className = '', compact = false }: ApexPerformanceCardProps) {
  const { metrics, status } = useMetricsDashboard()
  const apex = metrics?.apex

  // Calculate visual intensity based on performance
  const intensity = useMemo(() => {
    if (!apex) {
      return 0.3
    }
    return Math.min(1, apex.capabilityMultiplier / 50) // Normalize to 0-1
  }, [apex])

  // Dynamic gradient based on performance
  const gradientColors = useMemo(() => {
    if (!apex) {
      return ['#1e3a5f', '#0f172a']
    }
    if (apex.capabilityMultiplier >= 20) {
      return ['#fbbf24', '#f59e0b', '#d97706'] // Gold
    }
    if (apex.capabilityMultiplier >= 10) {
      return ['#06b6d4', '#0891b2', '#0e7490'] // Cyan
    }
    return ['#6366f1', '#4f46e5', '#4338ca'] // Indigo
  }, [apex])

  if (status === 'connecting') {
    return (
      <div className={`apex-card apex-card--loading ${className}`}>
        <div className="apex-card__skeleton">
          <motion.div 
            className="apex-card__pulse"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className={`apex-card ${compact ? 'apex-card--compact' : ''} ${className}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 50%, ${gradientColors[2] || gradientColors[1]} 100%)`,
      }}
    >
      {/* Animated background particles */}
      <div className="apex-card__particles">
        {Array.from({ length: 6 }, (_, i) => (
          <motion.div
            key={i}
            className="apex-card__particle"
            animate={{
              y: [0, -20, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              left: `${15 + i * 15}%`,
              top: `${60 + (i % 3) * 10}%`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <div className="apex-card__header">
        <div className="apex-card__title-group">
          <motion.div 
            className="apex-card__icon"
            animate={{ 
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Zap className="w-6 h-6" />
          </motion.div>
          <div>
            <h3 className="apex-card__title">APEX Engine</h3>
            <p className="apex-card__subtitle">Performance Optimization</p>
          </div>
        </div>
        <motion.div 
          className="apex-card__status"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="apex-card__status-dot" />
          <span>Active</span>
        </motion.div>
      </div>

      {/* Main Metrics */}
      <div className="apex-card__metrics">
        {/* Capability Multiplier - Hero Metric */}
        <div className="apex-card__hero-metric">
          <div className="apex-card__hero-value">
            <motion.span
              key={apex?.capabilityMultiplier}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="apex-card__multiplier"
            >
              {apex?.capabilityMultiplier.toFixed(1) || '0.0'}
            </motion.span>
            <span className="apex-card__multiplier-suffix">×</span>
          </div>
          <p className="apex-card__hero-label">Revolutionary Multiplier</p>
          
          {/* Capability bar */}
          <div className="apex-card__capability-bar">
            <motion.div 
              className="apex-card__capability-fill"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (apex?.capabilityMultiplier || 0) * 2)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                boxShadow: `0 0 ${20 * intensity}px rgba(251, 191, 36, ${intensity})`,
              }}
            />
            <div className="apex-card__capability-glow" style={{ opacity: intensity }} />
          </div>
        </div>

        {/* Secondary Metrics Grid */}
        <div className="apex-card__secondary-grid">
          {/* Performance Gain */}
          <div className="apex-card__metric">
            <div className="apex-card__metric-icon">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="apex-card__metric-content">
              <span className="apex-card__metric-value">
                {apex?.performanceGain.toFixed(2) || '0.00'}×
              </span>
              <span className="apex-card__metric-label">Performance</span>
            </div>
          </div>

          {/* Cognitive Amplification */}
          <div className="apex-card__metric">
            <div className="apex-card__metric-icon apex-card__metric-icon--brain">
              <Brain className="w-4 h-4" />
            </div>
            <div className="apex-card__metric-content">
              <span className="apex-card__metric-value">
                {apex?.cognitiveAmplification.toFixed(2) || '0.00'}×
              </span>
              <span className="apex-card__metric-label">Cognitive</span>
            </div>
          </div>

          {/* Quality Improvement */}
          <div className="apex-card__metric">
            <div className="apex-card__metric-icon apex-card__metric-icon--quality">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="apex-card__metric-content">
              <span className="apex-card__metric-value">
                +{((apex?.qualityImprovement || 0) * 100).toFixed(0)}%
              </span>
              <span className="apex-card__metric-label">Quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Neural Activity Indicator */}
      <div className="apex-card__neural">
        <div className="apex-card__neural-label">
          <Cpu className="w-3 h-3" />
          <span>Neural Activity</span>
        </div>
        <div className="apex-card__neural-waves">
          {Array.from({ length: 12 }, (_, i) => (
            <motion.div
              key={i}
              className="apex-card__neural-bar"
              animate={{
                height: [8, 16 + Math.random() * 16, 8],
                opacity: [0.4, 0.9, 0.4],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.4,
                repeat: Infinity,
                delay: i * 0.05,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default ApexPerformanceCard
