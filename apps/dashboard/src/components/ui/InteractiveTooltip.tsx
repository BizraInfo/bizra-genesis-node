/**
 * Interactive Tooltip Component
 * Provides rich tooltips with animations and micro-interactions
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, TrendingUp, Zap, Shield } from 'lucide-react';
import { BRAND } from '../../constants/brand';

interface TooltipContent {
  title: string;
  description: string;
  icon?: React.ReactNode;
  stats?: Array<{
    label: string;
    value: string;
    trend?: 'up' | 'down' | 'neutral';
  }>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface InteractiveTooltipProps {
  content: TooltipContent;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  trigger?: 'hover' | 'click';
  className?: string;
}

export const InteractiveTooltip: React.FC<InteractiveTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 300,
  trigger = 'hover',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  const toggleTooltip = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-navy-800';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-navy-800';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-navy-800';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-navy-800';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-navy-800';
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={trigger === 'hover' ? showTooltip : undefined}
        onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
        onClick={toggleTooltip}
        className="cursor-pointer"
      >
        {children}
      </div>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`absolute ${getPositionClasses()} z-50`}
          >
            <div className="glass-panel p-4 rounded-xl max-w-xs shadow-2xl border border-white/10">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                {content.icon && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gold-500/20 rounded-lg flex items-center justify-center">
                    {content.icon}
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="text-white font-medium text-sm mb-1">
                    {content.title}
                  </h4>
                  <p className="text-white/70 text-xs leading-relaxed">
                    {content.description}
                  </p>
                </div>
              </div>

              {/* Stats */}
              {content.stats && content.stats.length > 0 && (
                <div className="space-y-2 mb-3">
                  {content.stats.map((stat, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-white/60 text-xs">{stat.label}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-white font-medium text-sm">{stat.value}</span>
                        {stat.trend && (
                          <motion.div
                            animate={{
                              rotate: stat.trend === 'up' ? 0 : stat.trend === 'down' ? 180 : 0,
                              scale: stat.trend !== 'neutral' ? [1, 1.2, 1] : 1,
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <TrendingUp
                              size={12}
                              className={
                                stat.trend === 'up'
                                  ? 'text-green-400'
                                  : stat.trend === 'down'
                                  ? 'text-red-400'
                                  : 'text-white/40'
                              }
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Button */}
              {content.action && (
                <motion.button
                  onClick={content.action.onClick}
                  className="w-full px-3 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 text-xs font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {content.action.label}
                </motion.button>
              )}
            </div>

            {/* Arrow */}
            <div className={`absolute ${getArrowClasses()}`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Pre-configured tooltip variants for common use cases
export const InfoTooltip: React.FC<Omit<InteractiveTooltipProps, 'content'> & { text: string }> = ({
  text,
  ...props
}) => (
  <InteractiveTooltip
    {...props}
    content={{
      title: 'Information',
      description: text,
      icon: <Info size={16} className="text-gold-400" />,
    }}
  />
);

export const PerformanceTooltip: React.FC<Omit<InteractiveTooltipProps, 'content'> & { metrics: any[] }> = ({
  metrics,
  ...props
}) => (
  <InteractiveTooltip
    {...props}
    content={{
      title: 'Performance Metrics',
      description: 'Real-time system performance indicators',
      icon: <Zap size={16} className="text-teal-400" />,
      stats: metrics,
    }}
  />
);

export const SecurityTooltip: React.FC<Omit<InteractiveTooltipProps, 'content'> & { features: string[] }> = ({
  features,
  ...props
}) => (
  <InteractiveTooltip
    {...props}
    content={{
      title: 'Security Features',
      description: 'Advanced security measures protecting your assets',
      icon: <Shield size={16} className="text-green-400" />,
      stats: features.map(feature => ({ label: feature, value: '✓' })),
    }}
  />
);

export default InteractiveTooltip;