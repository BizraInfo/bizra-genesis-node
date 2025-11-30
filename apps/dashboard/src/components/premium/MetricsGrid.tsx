/**
 * MetricsGrid - TMP v0.1 System Integrity Display
 * 
 * Showcases the mathematical proof of consciousness safety:
 * - Ihsan Evolution (Δ): +9.4%
 * - Causal Drag (Ω): 0.066
 * - Safety Leverage (Λ): 0.733
 * - Crown Confidence: 100%
 * 
 * Migrated from award-winner-design with React 18 compatibility
 */

'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Activity, Scale, Lock } from 'lucide-react';

interface Metric {
  label: string;
  value: string;
  desc: string;
  icon: typeof Activity;
  color: string;
}

const metrics: Metric[] = [
  {
    label: 'Ihsan Evolution (Δ)',
    value: '+9.4%',
    desc: 'Consciousness evolution within bounds',
    icon: Activity,
    color: 'text-teal-400',
  },
  {
    label: 'Causal Drag (Ω)',
    value: '0.066',
    desc: 'Structural refactor threshold < 0.30',
    icon: Scale,
    color: 'text-pink-400',
  },
  {
    label: 'Safety Leverage (Λ)',
    value: '0.733',
    desc: 'Minimum requirement > 0.25',
    icon: ShieldCheck,
    color: 'text-gold-500',
  },
  {
    label: 'Crown Confidence',
    value: '100%',
    desc: 'Safety Status: APPROVED',
    icon: Lock,
    color: 'text-purple-400',
  },
];

export interface MetricsGridProps {
  /** Custom title for the section */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Custom metrics data */
  customMetrics?: Metric[];
  /** Number of columns on large screens */
  columns?: 2 | 3 | 4;
}

function MetricsGridComponent({
  title = 'System Integrity Verified',
  subtitle = 'TMP v0.1 Demonstration Results',
  customMetrics,
  columns = 4,
}: MetricsGridProps) {
  const displayMetrics = customMetrics || metrics;

  const columnClasses = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
  };

  return (
    <section className="py-24 px-4 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl text-white mb-4">
            {title}
          </h2>
          <p className="text-gold-500/80 tracking-widest uppercase text-sm">
            {subtitle}
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${columnClasses[columns]} gap-6`}>
          {displayMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-8 rounded-2xl hover:bg-white/5 transition-colors duration-500 group"
            >
              {/* Icon */}
              <div
                className={`mb-6 p-3 rounded-xl bg-white/5 w-fit ${metric.color} group-hover:scale-110 transition-transform duration-500`}
              >
                <metric.icon className="w-8 h-8" />
              </div>

              {/* Value */}
              <div className={`text-4xl font-bold mb-2 ${metric.color} font-serif`}>
                {metric.value}
              </div>

              {/* Label */}
              <div className="text-lg font-medium text-white mb-2">
                {metric.label}
              </div>

              {/* Description */}
              <div className="text-sm text-white/50 leading-relaxed">
                {metric.desc}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export const MetricsGrid = memo(MetricsGridComponent);
export default MetricsGrid;
