// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - IHSAN METER                                        ║
// ║  Real-time system quality score visualization                             ║
// ║  The "Lyapunov Function Made Visible" - Ethics embodied in color         ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

import { motion } from 'framer-motion'
import { useTelemetry, type IhsanVisualState } from '../../hooks/useTelemetryStream'

interface IhsanMeterProps {
  /** Size variant */
  size?: 'small' | 'medium' | 'large'
  /** Show numeric value */
  showValue?: boolean
  /** Show state label */
  showLabel?: boolean
  /** Show pulse animation when in excellence state */
  showPulse?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * IHSAN METER - System Quality Visualization
 *
 * Displays the live Ihsan quality score from the Rust API telemetry.
 * The Ihsan score is the "soul" of the system - a Lyapunov-style stability
 * function that measures ethical alignment and system health.
 *
 * Visual States:
 * - Excellence (≥0.95): Gold glow, gentle pulse
 * - Stable (≥0.85): Calm teal
 * - Attention (≥0.70): Amber warning
 * - Degraded (<0.70): Red alert with faster pulse
 *
 * @example
 * ```tsx
 * <TelemetryProvider>
 *   <IhsanMeter size="large" showPulse />
 * </TelemetryProvider>
 * ```
 */
export function IhsanMeter({
  size = 'medium',
  showValue = true,
  showLabel = true,
  showPulse = true,
  className = ''
}: IhsanMeterProps) {
  const { telemetry, status, ihsanState, ihsanColor } = useTelemetry()

  // Size configuration
  const sizeConfig = {
    small: { diameter: 80, thickness: 6, fontSize: 'text-lg', labelSize: 'text-xs' },
    medium: { diameter: 140, thickness: 10, fontSize: 'text-2xl', labelSize: 'text-sm' },
    large: { diameter: 200, thickness: 14, fontSize: 'text-4xl', labelSize: 'text-base' }
  }

  const config = sizeConfig[size]
  const radius = (config.diameter - config.thickness) / 2
  const circumference = radius * 2 * Math.PI

  // Default to 0 if no telemetry yet
  const score = telemetry?.ihsan_score ?? 0
  const strokeDashoffset = circumference * (1 - score)

  // State descriptions
  const stateDescriptions: Record<IhsanVisualState, string> = {
    excellence: 'System operating at peak virtue',
    stable: 'Healthy and balanced state',
    attention: 'Needs optimization attention',
    degraded: 'Critical - intervention required'
  }

  // Pulse animation for excellence or degraded states
  const shouldPulse = showPulse && (ihsanState === 'excellence' || ihsanState === 'degraded')
  const pulseSpeed = ihsanState === 'degraded' ? 0.8 : 2.5

  // Loading state
  if (status === 'connecting') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div
          className="rounded-full border-4 border-slate-700 animate-pulse"
          style={{ width: config.diameter, height: config.diameter }}
        />
        <p className={`mt-2 text-slate-500 ${config.labelSize}`}>Connecting...</p>
      </div>
    )
  }

  // Disconnected state
  if (status === 'disconnected' || status === 'error') {
    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative">
          <svg width={config.diameter} height={config.diameter} className="transform -rotate-90">
            <circle
              cx={config.diameter / 2}
              cy={config.diameter / 2}
              r={radius}
              fill="none"
              stroke="#374151"
              strokeWidth={config.thickness}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-500 text-2xl">⚠</span>
          </div>
        </div>
        <p className={`mt-2 text-slate-500 ${config.labelSize}`}>
          {status === 'error' ? 'Connection error' : 'Disconnected'}
        </p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Background glow for excellence state */}
        {ihsanState === 'excellence' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${ihsanColor}30 0%, transparent 70%)`,
              transform: 'scale(1.3)'
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1.2, 1.4, 1.2]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        )}

        <svg width={config.diameter} height={config.diameter} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            fill="none"
            stroke={`${ihsanColor}20`}
            strokeWidth={config.thickness}
          />

          {/* Progress ring */}
          <motion.circle
            cx={config.diameter / 2}
            cy={config.diameter / 2}
            r={radius}
            fill="none"
            stroke={ihsanColor}
            strokeWidth={config.thickness}
            strokeDasharray={circumference}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset,
              filter: shouldPulse
                ? [
                    `drop-shadow(0 0 4px ${ihsanColor}80)`,
                    `drop-shadow(0 0 12px ${ihsanColor}ff)`,
                    `drop-shadow(0 0 4px ${ihsanColor}80)`
                  ]
                : `drop-shadow(0 0 4px ${ihsanColor}60)`
            }}
            transition={{
              strokeDashoffset: { duration: 1.5, ease: 'easeOut' },
              filter: shouldPulse
                ? { duration: pulseSpeed, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }}
          />

          {/* Pulse rings for attention */}
          {shouldPulse && (
            <>
              {[0, 1, 2].map(i => (
                <motion.circle
                  key={i}
                  cx={config.diameter / 2}
                  cy={config.diameter / 2}
                  r={radius}
                  fill="none"
                  stroke={ihsanColor}
                  strokeWidth={1}
                  initial={{ opacity: 0.6, scale: 1 }}
                  animate={{
                    opacity: [0.4, 0],
                    scale: [1, 1.5]
                  }}
                  transition={{
                    duration: pulseSpeed,
                    repeat: Infinity,
                    delay: i * (pulseSpeed / 3),
                    ease: 'easeOut'
                  }}
                  style={{ transformOrigin: 'center' }}
                />
              ))}
            </>
          )}
        </svg>

        {/* Center value */}
        {showValue && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                className={`font-bold ${config.fontSize} font-mono`}
                style={{ color: ihsanColor }}
                key={Math.round(score * 100)}
                initial={{ scale: 0.9, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {Math.round(score * 100)}
              </motion.div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">Ihsan</div>
            </div>
          </div>
        )}
      </div>

      {/* State label */}
      {showLabel && (
        <div className="text-center mt-3">
          <motion.div
            className={`font-medium capitalize ${config.labelSize}`}
            style={{ color: ihsanColor }}
            key={ihsanState}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {ihsanState}
          </motion.div>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
            {stateDescriptions[ihsanState]}
          </p>
        </div>
      )}
    </div>
  )
}

export default IhsanMeter
