'use client';

/**
 * BIZRA Premium Glass Card Component
 * Glass morphism card with hover effects
 * Adapted from award-winner-design
 * 
 * Features:
 * - Frosted glass effect
 * - Gold border accents
 * - Smooth hover transitions
 * - Flexible content slots
 */

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'elevated' | 'subtle' | 'bordered';
  /** Enable hover animation */
  hoverable?: boolean;
  /** Glow effect on hover */
  glowOnHover?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles = {
  default: 'glass-card',
  elevated: 'glass-panel',
  subtle: 'bg-white/[0.02] backdrop-blur-sm border border-white/[0.05]',
  bordered: 'bg-transparent border border-gold/20 backdrop-blur-md',
} as const;

/**
 * Premium glass morphism card component
 */
export function GlassCard({
  children,
  variant = 'default',
  hoverable = true,
  glowOnHover = false,
  className = '',
  ...motionProps
}: GlassCardProps) {
  return (
    <motion.div
      className={`
        rounded-xl p-6 
        ${variantStyles[variant]}
        ${hoverable ? 'transition-all duration-500' : ''}
        ${className}
      `}
      whileHover={hoverable ? {
        y: -4,
        transition: { duration: 0.3 },
      } : undefined}
      style={glowOnHover ? {
        // @ts-ignore - CSS custom properties
        '--glow-opacity': 0,
      } : undefined}
      onHoverStart={() => {
        if (glowOnHover) {
          // Could trigger glow animation here
        }
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}

/**
 * Glass card with header section
 */
interface GlassCardWithHeaderProps extends GlassCardProps {
  /** Header content */
  header?: React.ReactNode;
  /** Header title */
  title?: string;
  /** Header subtitle */
  subtitle?: string;
  /** Header action button */
  action?: React.ReactNode;
}

export function GlassCardWithHeader({
  children,
  header,
  title,
  subtitle,
  action,
  ...props
}: GlassCardWithHeaderProps) {
  return (
    <GlassCard {...props}>
      {(header || title) && (
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-gold/10">
          <div>
            {header || (
              <>
                {title && (
                  <h3 className="text-lg font-semibold text-soft-white mb-1">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-white/60">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </GlassCard>
  );
}

/**
 * Metric display card for dashboard
 */
interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string | number;
  /** Metric unit */
  unit?: string;
  /** Trend indicator (positive/negative/neutral) */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend percentage */
  trendValue?: number;
  /** Icon */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  className = '',
}: MetricCardProps) {
  const trendColors = {
    up: 'text-accent-teal',
    down: 'text-red-400',
    neutral: 'text-white/60',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <GlassCard variant="subtle" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-white/60 mb-1">{label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-gold">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
            {unit && (
              <span className="text-sm text-white/40">{unit}</span>
            )}
          </div>
          {trend && trendValue !== undefined && (
            <div className={`text-xs mt-1 ${trendColors[trend]}`}>
              {trendIcons[trend]} {Math.abs(trendValue)}%
            </div>
          )}
        </div>
        {icon && (
          <div className="text-gold/60">
            {icon}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

/**
 * Glass panel for section containers
 */
interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`glass-panel rounded-2xl p-8 ${className}`}>
      {children}
    </div>
  );
}

export default GlassCard;
