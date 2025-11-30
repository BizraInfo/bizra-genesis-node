// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - PERFORMANCE COMMAND CENTER                         ║
// ║  Revolutionary real-time monitoring dashboard showcasing APEX & SNR      ║
// ║  The visual embodiment of BIZRA's cognitive architecture                 ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Cpu, Activity, Shield, Zap, Database, 
  Radio, Brain, Eye, Gauge, RefreshCw
} from 'lucide-react'

// Components
import { ApexPerformanceCard } from '../components/apex'
import { SNRIntelligenceCard } from '../components/snr'
import { ConsensusHealthCard } from '../components/consensus'
import { IhsanMeter } from '../components/telemetry'

// Hooks
import { useMetricsDashboard } from '../hooks/useMetricsDashboard'

// Note: Global styles (apex-snr.css, performance-command-center.css) 
// are imported in _app.tsx per Next.js requirements

/**
 * PERFORMANCE COMMAND CENTER
 * 
 * The crown jewel of BIZRA's monitoring infrastructure.
 * This page brings together all revolutionary metrics systems:
 * - APEX Performance Engine visualization
 * - SNR Intelligence decision clarity
 * - Consensus Health monitoring
 * - Ihsan Quality Gate metrics
 * - Real-time system coherence
 */
export function PerformanceCommandCenter() {
  const { metrics, status, lastUpdateAge, refresh } = useMetricsDashboard()

  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' }
    },
  }

  return (
    <div className="performance-command-center">
      {/* Hero Header */}
      <motion.header 
        className="pcc-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="pcc-header__content">
          <div className="pcc-header__title-group">
            <motion.div 
              className="pcc-header__icon"
              animate={{ 
                boxShadow: [
                  '0 0 20px rgba(99, 102, 241, 0.3)',
                  '0 0 40px rgba(99, 102, 241, 0.5)',
                  '0 0 20px rgba(99, 102, 241, 0.3)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Cpu className="w-8 h-8" />
            </motion.div>
            <div>
              <h1 className="pcc-header__title">Performance Command Center</h1>
              <p className="pcc-header__subtitle">
                Real-time cognitive architecture monitoring • APEX Engine • SNR Intelligence
              </p>
            </div>
          </div>
          
          <div className="pcc-header__actions">
            {/* Connection Status */}
            <div className={`pcc-status pcc-status--${status}`}>
              <span className="pcc-status__dot" />
              <span className="pcc-status__text">
                {status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            
            {/* Refresh Button */}
            <motion.button 
              className="pcc-refresh-btn"
              onClick={refresh}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </motion.button>
          </div>
        </div>

        {/* System Pulse Bar */}
        <div className="pcc-pulse-bar">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="pcc-pulse-bar__segment"
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scaleY: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.03,
              }}
            />
          ))}
        </div>
      </motion.header>

      {/* Main Dashboard Grid */}
      <motion.main 
        className="pcc-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Row 1: Hero Cards */}
        <motion.div className="pcc-grid__row pcc-grid__row--hero" variants={itemVariants}>
          {/* APEX Performance - Full Width Hero */}
          <ApexPerformanceCard className="pcc-card pcc-card--apex" />
        </motion.div>

        {/* Row 2: Intelligence Cards */}
        <motion.div className="pcc-grid__row pcc-grid__row--triple" variants={itemVariants}>
          {/* Consensus Health */}
          <ConsensusHealthCard className="pcc-card" />
          
          {/* Ihsan Quality Gate */}
          <div className="pcc-card pcc-card--ihsan">
            <div className="pcc-card__header">
              <Shield className="w-5 h-5" style={{ color: '#fbbf24' }} />
              <h3>Ihsan Quality Gate</h3>
            </div>
            <div className="pcc-card__ihsan-content">
              <IhsanMeter size="medium" showPulse />
            </div>
          </div>
          
          {/* SNR Intelligence */}
          <SNRIntelligenceCard className="pcc-card" />
        </motion.div>

        {/* Row 3: System Metrics */}
        <motion.div className="pcc-grid__row pcc-grid__row--quad" variants={itemVariants}>
          {/* Database Health */}
          <div className="pcc-metric-card">
            <div className="pcc-metric-card__icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
              <Database className="w-5 h-5" style={{ color: '#818cf8' }} />
            </div>
            <div className="pcc-metric-card__content">
              <span className="pcc-metric-card__value">
                {metrics?.database?.activeConnections || 0}
              </span>
              <span className="pcc-metric-card__label">Active DB Connections</span>
            </div>
            <div className="pcc-metric-card__trend pcc-metric-card__trend--up">
              +{metrics?.database?.idleConnections || 0} idle
            </div>
          </div>

          {/* Cache Performance */}
          <div className="pcc-metric-card">
            <div className="pcc-metric-card__icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
              <Zap className="w-5 h-5" style={{ color: '#10b981' }} />
            </div>
            <div className="pcc-metric-card__content">
              <span className="pcc-metric-card__value">
                {((metrics?.cache?.hitRate || 0) * 100).toFixed(1)}%
              </span>
              <span className="pcc-metric-card__label">Cache Hit Rate</span>
            </div>
            <div className="pcc-metric-card__trend pcc-metric-card__trend--up">
              {(metrics?.cache?.avgDurationSeconds || 0).toFixed(3)}s avg
            </div>
          </div>

          {/* Crypto Operations */}
          <div className="pcc-metric-card">
            <div className="pcc-metric-card__icon" style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
              <Shield className="w-5 h-5" style={{ color: '#a78bfa' }} />
            </div>
            <div className="pcc-metric-card__content">
              <span className="pcc-metric-card__value">
                {metrics?.crypto?.receiptsGenerated || 0}
              </span>
              <span className="pcc-metric-card__label">Trust Receipts</span>
            </div>
            <div className="pcc-metric-card__trend">
              {((metrics?.crypto?.verificationSuccessRate || 0) * 100).toFixed(0)}% verified
            </div>
          </div>

          {/* System Coherence */}
          <div className="pcc-metric-card">
            <div className="pcc-metric-card__icon" style={{ backgroundColor: 'rgba(6, 182, 212, 0.2)' }}>
              <Activity className="w-5 h-5" style={{ color: '#06b6d4' }} />
            </div>
            <div className="pcc-metric-card__content">
              <span className="pcc-metric-card__value">
                {((metrics?.coherence?.systemCoherence || 0) * 100).toFixed(0)}%
              </span>
              <span className="pcc-metric-card__label">System Coherence</span>
            </div>
            <div className="pcc-metric-card__trend">
              {metrics?.coherence?.stabilityScore?.toFixed(2) || '0.00'} stability
            </div>
          </div>
        </motion.div>

        {/* Row 4: PoI & Routing */}
        <motion.div className="pcc-grid__row pcc-grid__row--double" variants={itemVariants}>
          {/* Proof of Impact */}
          <div className="pcc-card pcc-card--poi">
            <div className="pcc-card__header">
              <Eye className="w-5 h-5" style={{ color: '#f59e0b' }} />
              <h3>Proof of Impact</h3>
              <span className="pcc-card__badge">
                {((metrics?.poi?.validationSuccessRate || 0) * 100).toFixed(0)}% success
              </span>
            </div>
            <div className="pcc-card__poi-stats">
              <div className="pcc-poi-stat">
                <span className="pcc-poi-stat__value">{metrics?.poi?.successTotal || 0}</span>
                <span className="pcc-poi-stat__label">Validated</span>
              </div>
              <div className="pcc-poi-stat">
                <span className="pcc-poi-stat__value">{metrics?.poi?.attemptsTotal || 0}</span>
                <span className="pcc-poi-stat__label">Attempts</span>
              </div>
              <div className="pcc-poi-stat">
                <span className="pcc-poi-stat__value">{metrics?.poi?.failureTotal || 0}</span>
                <span className="pcc-poi-stat__label">Failed</span>
              </div>
            </div>
            <div className="pcc-card__poi-bar">
              <motion.div 
                className="pcc-card__poi-fill"
                initial={{ width: 0 }}
                animate={{ width: `${(metrics?.poi?.validationSuccessRate || 0) * 100}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>

          {/* Thompson Routing */}
          <div className="pcc-card pcc-card--routing">
            <div className="pcc-card__header">
              <Radio className="w-5 h-5" style={{ color: '#06b6d4' }} />
              <h3>Thompson Sampling Router</h3>
              <span className="pcc-card__badge">
                {metrics?.routing?.totalOperations || 0} ops
              </span>
            </div>
            <div className="pcc-card__routing-stats">
              <div className="pcc-routing-stat">
                <Gauge className="w-4 h-4" />
                <span className="pcc-routing-stat__value">
                  {((metrics?.routing?.avgLatencyMicroseconds || 0) / 1000).toFixed(2)}ms
                </span>
                <span className="pcc-routing-stat__label">Avg Latency</span>
              </div>
              <div className="pcc-routing-stat">
                <Brain className="w-4 h-4" />
                <span className="pcc-routing-stat__value">
                  {Object.keys(metrics?.routing?.winRates || {}).length}
                </span>
                <span className="pcc-routing-stat__label">Active Routes</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.main>

      {/* Footer with last update */}
      <motion.footer 
        className="pcc-footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <span className="pcc-footer__update">
          Last updated: {lastUpdateAge < 1000 ? 'Just now' : `${Math.round(lastUpdateAge / 1000)}s ago`}
        </span>
        <span className="pcc-footer__version">BIZRA Genesis Node v1.0 • APEX Engine Active</span>
      </motion.footer>
    </div>
  )
}

export default PerformanceCommandCenter
