// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - CONSENSUS HEALTH CARD                              ║
// ║  Real-time consensus system health visualization                          ║
// ║  Shows the heartbeat of BIZRA's multi-agent decision system             ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useMemo, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Users, Clock, CheckCircle2, AlertTriangle, Zap, Activity } from 'lucide-react'
import { useMetricsDashboard } from '../../hooks/useMetricsDashboard'

interface ConsensusHealthCardProps {
  className?: string
  showHeartbeat?: boolean
}

/**
 * CONSENSUS HEALTH CARD
 * 
 * Displays the health of BIZRA's consensus system with:
 * - Live heartbeat animation synchronized to operations
 * - Health score with visual indicators
 * - Latency metrics with performance grades
 * - Pareto candidate visualization
 */
export function ConsensusHealthCard({ className = '', showHeartbeat = true }: ConsensusHealthCardProps) {
  const { metrics, status, lastUpdateAge } = useMetricsDashboard()
  const consensus = metrics?.consensus

  // Heartbeat animation timing based on operations
  const [heartbeatRate, setHeartbeatRate] = useState(1000) // ms per beat
  
  useEffect(() => {
    if (consensus?.totalOperations) {
      // Faster heartbeat = more active system
      const rate = Math.max(400, Math.min(2000, 2000 - (consensus.totalOperations * 10)))
      setHeartbeatRate(rate)
    }
  }, [consensus?.totalOperations])

  // Health status calculation
  const healthStatus = useMemo(() => {
    if (!consensus) {
      return { status: 'unknown', label: 'Initializing', color: '#64748b', icon: Clock }
    }
    
    const health = consensus.health
    if (health >= 0.95) {
      return { status: 'excellent', label: 'Excellent', color: '#10b981', icon: CheckCircle2 }
    }
    if (health >= 0.85) {
      return { status: 'healthy', label: 'Healthy', color: '#06b6d4', icon: Heart }
    }
    if (health >= 0.70) {
      return { status: 'attention', label: 'Attention', color: '#f59e0b', icon: AlertTriangle }
    }
    return { status: 'critical', label: 'Critical', color: '#ef4444', icon: AlertTriangle }
  }, [consensus])

  // Latency grade
  const latencyGrade = useMemo(() => {
    if (!consensus) {
      return { grade: '-', color: '#64748b', label: 'N/A' }
    }
    
    const latencyMs = consensus.avgLatencyMicroseconds / 1000
    if (latencyMs < 10) {
      return { grade: 'A+', color: '#10b981', label: 'Ultra-fast' }
    }
    if (latencyMs < 50) {
      return { grade: 'A', color: '#22c55e', label: 'Excellent' }
    }
    if (latencyMs < 100) {
      return { grade: 'B', color: '#06b6d4', label: 'Good' }
    }
    if (latencyMs < 250) {
      return { grade: 'C', color: '#f59e0b', label: 'Moderate' }
    }
    return { grade: 'D', color: '#ef4444', label: 'Slow' }
  }, [consensus])

  const StatusIcon = healthStatus.icon

  if (status === 'connecting') {
    return (
      <div className={`consensus-card consensus-card--loading ${className}`}>
        <div className="consensus-card__skeleton" />
      </div>
    )
  }

  return (
    <motion.div 
      className={`consensus-card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient pulse based on health */}
      <div 
        className="consensus-card__ambient"
        style={{ 
          background: `radial-gradient(ellipse at 30% 20%, ${healthStatus.color}15 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="consensus-card__header">
        <div className="consensus-card__title-section">
          {/* Heartbeat Icon */}
          {showHeartbeat && (
            <motion.div 
              className="consensus-card__heartbeat"
              style={{ color: healthStatus.color }}
              animate={{ 
                scale: [1, 1.2, 1],
              }}
              transition={{ 
                duration: heartbeatRate / 1000,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Heart className="w-6 h-6" fill="currentColor" />
            </motion.div>
          )}
          <div>
            <h3 className="consensus-card__title">Consensus Health</h3>
            <p className="consensus-card__subtitle">Multi-Agent Decision System</p>
          </div>
        </div>

        {/* Health Status Badge */}
        <motion.div 
          className="consensus-card__status-badge"
          style={{ 
            backgroundColor: `${healthStatus.color}20`,
            borderColor: `${healthStatus.color}40`,
            color: healthStatus.color,
          }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{healthStatus.label}</span>
        </motion.div>
      </div>

      {/* Health Score Circle */}
      <div className="consensus-card__health-circle">
        <svg viewBox="0 0 120 120" className="consensus-card__health-svg">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            opacity="0.1"
          />
          {/* Health arc */}
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={healthStatus.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
            animate={{ 
              strokeDashoffset: 2 * Math.PI * 52 * (1 - (consensus?.health || 0)),
            }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
          {/* Glow effect */}
          <motion.circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={healthStatus.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={2 * Math.PI * 52 * (1 - (consensus?.health || 0))}
            opacity="0.2"
            filter="blur(4px)"
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
          />
        </svg>
        
        {/* Center content */}
        <div className="consensus-card__health-center">
          <motion.span 
            className="consensus-card__health-value"
            key={consensus?.health}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{ color: healthStatus.color }}
          >
            {((consensus?.health || 0) * 100).toFixed(0)}
          </motion.span>
          <span className="consensus-card__health-unit">%</span>
          <span className="consensus-card__health-label">Health</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="consensus-card__metrics-grid">
        {/* Total Operations */}
        <div className="consensus-card__metric">
          <div className="consensus-card__metric-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
            <Zap className="w-4 h-4" style={{ color: '#818cf8' }} />
          </div>
          <div className="consensus-card__metric-content">
            <span className="consensus-card__metric-value">
              {(consensus?.totalOperations || 0).toLocaleString()}
            </span>
            <span className="consensus-card__metric-label">Operations</span>
          </div>
        </div>

        {/* Average Latency */}
        <div className="consensus-card__metric">
          <div className="consensus-card__metric-icon" style={{ backgroundColor: `${latencyGrade.color}20` }}>
            <Clock className="w-4 h-4" style={{ color: latencyGrade.color }} />
          </div>
          <div className="consensus-card__metric-content">
            <div className="consensus-card__metric-row">
              <span className="consensus-card__metric-value">
                {((consensus?.avgLatencyMicroseconds || 0) / 1000).toFixed(1)}ms
              </span>
              <span 
                className="consensus-card__metric-grade"
                style={{ color: latencyGrade.color }}
              >
                {latencyGrade.grade}
              </span>
            </div>
            <span className="consensus-card__metric-label">Avg Latency</span>
          </div>
        </div>

        {/* Pareto Candidates */}
        <div className="consensus-card__metric">
          <div className="consensus-card__metric-icon" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }}>
            <Users className="w-4 h-4" style={{ color: '#fbbf24' }} />
          </div>
          <div className="consensus-card__metric-content">
            <span className="consensus-card__metric-value">
              {consensus?.paretoCandidates || 0}
            </span>
            <span className="consensus-card__metric-label">Pareto Candidates</span>
          </div>
        </div>

        {/* Activity Indicator */}
        <div className="consensus-card__metric">
          <div className="consensus-card__metric-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
            <Activity className="w-4 h-4" style={{ color: '#10b981' }} />
          </div>
          <div className="consensus-card__metric-content">
            <span className="consensus-card__metric-value">
              {lastUpdateAge < 5000 ? 'Live' : `${Math.round(lastUpdateAge / 1000)}s ago`}
            </span>
            <span className="consensus-card__metric-label">Last Update</span>
          </div>
        </div>
      </div>

      {/* Activity Bar */}
      <div className="consensus-card__activity-bar">
        <div className="consensus-card__activity-label">System Activity</div>
        <div className="consensus-card__activity-waves">
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              className="consensus-card__activity-segment"
              style={{ backgroundColor: healthStatus.color }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                height: [4, 8 + Math.random() * 8, 4],
              }}
              transition={{
                duration: 1 + Math.random() * 0.5,
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

export default ConsensusHealthCard
