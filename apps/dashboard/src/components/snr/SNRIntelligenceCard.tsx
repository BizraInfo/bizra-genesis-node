// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - SNR INTELLIGENCE CARD                              ║
// ║  Signal-to-Noise Ratio visualization with decision clarity metrics       ║
// ║  Unique visual representation of consensus intelligence quality          ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Radio, Target, Shield, Waves, Eye } from 'lucide-react'
import { useMetricsDashboard, getSNRColor, formatSNRClarity } from '../../hooks/useMetricsDashboard'

interface SNRIntelligenceCardProps {
  className?: string
  showWaveform?: boolean
}

/**
 * SNR INTELLIGENCE CARD
 * 
 * Visualizes Signal-to-Noise Ratio metrics for consensus decisions.
 * Shows how clearly the system can distinguish winning candidates
 * from alternatives - the "clarity" of AI decision-making.
 * 
 * Visual metaphor: Radio signal tuning - clearer signal = better decisions
 */
export function SNRIntelligenceCard({ className = '', showWaveform = true }: SNRIntelligenceCardProps) {
  const { metrics, status } = useMetricsDashboard()
  const snr = metrics?.snr

  // Calculate signal quality indicator
  const signalQuality = useMemo(() => {
    if (!snr) {return { label: 'Initializing', color: '#64748b', level: 0 }}
    
    const clarity = snr.consensusClarity
    if (clarity >= 1.5) {return { label: 'Crystal Clear', color: '#fbbf24', level: 100 }}
    if (clarity >= 1.0) {return { label: 'Excellent', color: '#10b981', level: 80 }}
    if (clarity >= 0.7) {return { label: 'Good', color: '#06b6d4', level: 60 }}
    if (clarity >= 0.4) {return { label: 'Moderate', color: '#f59e0b', level: 40 }}
    return { label: 'Weak Signal', color: '#ef4444', level: 20 }
  }, [snr])

  // Generate waveform data based on SNR
  const waveformData = useMemo<number[]>(() => {
    if (!snr) {
      return Array.from<unknown, number>({ length: 32 }, () => 0.5)
    }

    const baseAmplitude = snr.consensusClarity / 2
    const noise = 1 - snr.decisionQuality

    return Array.from<unknown, number>({ length: 32 }, (_v, i) => {
      const signal = Math.sin(i * 0.3) * baseAmplitude
      const noiseValue = (Math.random() - 0.5) * noise * 0.3
      return 0.5 + signal + noiseValue
    })
  }, [snr])

  if (status === 'connecting') {
    return (
      <div className={`snr-card snr-card--loading ${className}`}>
        <div className="snr-card__skeleton" />
      </div>
    )
  }

  return (
    <motion.div 
      className={`snr-card ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow based on signal quality */}
      <div 
        className="snr-card__ambient"
        style={{ 
          background: `radial-gradient(ellipse at center, ${signalQuality.color}15 0%, transparent 70%)`,
        }}
      />

      {/* Header */}
      <div className="snr-card__header">
        <div className="snr-card__title-group">
          <motion.div 
            className="snr-card__icon"
            style={{ color: signalQuality.color }}
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Radio className="w-5 h-5" />
          </motion.div>
          <div>
            <h3 className="snr-card__title">SNR Intelligence</h3>
            <p className="snr-card__subtitle">Decision Clarity Analysis</p>
          </div>
        </div>
        
        {/* Signal Quality Badge */}
        <motion.div 
          className="snr-card__quality-badge"
          style={{ 
            backgroundColor: `${signalQuality.color}20`,
            borderColor: `${signalQuality.color}40`,
            color: signalQuality.color,
          }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Waves className="w-3 h-3" />
          <span>{signalQuality.label}</span>
        </motion.div>
      </div>

      {/* Signal Waveform Visualization */}
      {showWaveform && (
        <div className="snr-card__waveform">
          <svg viewBox="0 0 320 60" className="snr-card__waveform-svg">
            {/* Background grid */}
            <defs>
              <pattern id="snr-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
              </pattern>
            </defs>
            <rect width="320" height="60" fill="url(#snr-grid)" />
            
            {/* Center line */}
            <line x1="0" y1="30" x2="320" y2="30" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
            
            {/* Waveform path */}
            <motion.path
              d={`M 0 30 ${waveformData.map((v, i) => `L ${i * 10} ${60 - v * 60}`).join(' ')}`}
              fill="none"
              stroke={signalQuality.color}
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            
            {/* Signal glow */}
            <motion.path
              d={`M 0 30 ${waveformData.map((v, i) => `L ${i * 10} ${60 - v * 60}`).join(' ')}`}
              fill="none"
              stroke={signalQuality.color}
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.3"
              filter="blur(4px)"
            />
          </svg>
          
          {/* Scanning line */}
          <motion.div 
            className="snr-card__scan-line"
            style={{ backgroundColor: signalQuality.color }}
            animate={{ x: [0, 320, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Main Metrics */}
      <div className="snr-card__metrics">
        {/* Consensus Clarity - Primary */}
        <div className="snr-card__primary-metric">
          <div className="snr-card__gauge">
            <svg viewBox="0 0 120 70" className="snr-card__gauge-svg">
              {/* Gauge background arc */}
              <path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                opacity="0.1"
                strokeLinecap="round"
              />
              {/* Gauge fill arc */}
              <motion.path
                d="M 10 60 A 50 50 0 0 1 110 60"
                fill="none"
                stroke={signalQuality.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="157"
                initial={{ strokeDashoffset: 157 }}
                animate={{ 
                  strokeDashoffset: 157 - (157 * signalQuality.level / 100),
                }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
              {/* Center dot */}
              <circle cx="60" cy="60" r="4" fill={signalQuality.color} />
              {/* Needle */}
              <motion.line
                x1="60"
                y1="60"
                x2="60"
                y2="20"
                stroke={signalQuality.color}
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transformOrigin: '60px 60px' }}
                initial={{ rotate: -90 }}
                animate={{ rotate: -90 + (180 * signalQuality.level / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="snr-card__gauge-value">
              <span className="snr-card__gauge-number" style={{ color: signalQuality.color }}>
                {formatSNRClarity(snr?.consensusClarity || 0)}
              </span>
              <span className="snr-card__gauge-label">Clarity</span>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="snr-card__secondary-metrics">
          {/* Agent Reliability */}
          <div className="snr-card__metric">
            <div className="snr-card__metric-header">
              <Shield className="w-4 h-4" style={{ color: getSNRColor(snr?.agentReliability || 0) }} />
              <span>Agent Reliability</span>
            </div>
            <div className="snr-card__metric-bar">
              <motion.div 
                className="snr-card__metric-fill"
                style={{ backgroundColor: getSNRColor(snr?.agentReliability || 0) }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (snr?.agentReliability || 0) * 50)}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <span className="snr-card__metric-value">
              {((snr?.agentReliability || 0) * 100).toFixed(0)}%
            </span>
          </div>

          {/* Decision Quality */}
          <div className="snr-card__metric">
            <div className="snr-card__metric-header">
              <Target className="w-4 h-4" style={{ color: getSNRColor(snr?.decisionQuality || 0) }} />
              <span>Decision Quality</span>
            </div>
            <div className="snr-card__metric-bar">
              <motion.div 
                className="snr-card__metric-fill"
                style={{ backgroundColor: getSNRColor(snr?.decisionQuality || 0) }}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (snr?.decisionQuality || 0) * 50)}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>
            <span className="snr-card__metric-value">
              {((snr?.decisionQuality || 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Signal Analysis Footer */}
      <div className="snr-card__footer">
        <div className="snr-card__signal-indicator">
          <Eye className="w-3 h-3" />
          <span>Signal Analysis</span>
        </div>
        <div className="snr-card__signal-bars">
          {[1, 2, 3, 4, 5].map((level) => (
            <motion.div
              key={level}
              className="snr-card__signal-bar"
              style={{
                height: `${level * 4}px`,
                backgroundColor: level <= Math.ceil(signalQuality.level / 20) 
                  ? signalQuality.color 
                  : 'currentColor',
                opacity: level <= Math.ceil(signalQuality.level / 20) ? 1 : 0.2,
              }}
              animate={level <= Math.ceil(signalQuality.level / 20) ? {
                opacity: [0.7, 1, 0.7],
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity, delay: level * 0.1 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default SNRIntelligenceCard
