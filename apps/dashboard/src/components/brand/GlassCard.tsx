"use client"

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, 'children'> {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'teal' | 'elevated';
  hover?: boolean;
  glow?: boolean;
  className?: string;
}

export function GlassCard({ 
  children, 
  variant = 'default',
  hover = true,
  glow = false,
  className = '',
  ...props
}: GlassCardProps) {
  const variants = {
    default: 'bg-white/[0.03] border-white/10',
    gold: 'bg-bizra-gold/[0.03] border-bizra-gold/20',
    teal: 'bg-bizra-teal/[0.03] border-bizra-teal/20',
    elevated: 'bg-white/[0.05] border-white/15 shadow-xl',
  };

  const hoverStyles = hover ? 'hover:border-bizra-gold/30 hover:bg-white/[0.05]' : '';
  const glowStyles = glow ? 'glow-gold' : '';

  return (
    <motion.div
      className={`
        backdrop-blur-xl rounded-2xl border p-6
        transition-all duration-300
        ${variants[variant]}
        ${hoverStyles}
        ${glowStyles}
        ${className}
      `}
      whileHover={hover ? { y: -4, scale: 1.01 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: { value: number; positive: boolean };
  variant?: 'default' | 'gold' | 'teal';
}

export function StatCard({ label, value, icon, trend, variant = 'default' }: StatCardProps) {
  const colorMap = {
    default: 'text-white',
    gold: 'text-bizra-gold',
    teal: 'text-bizra-teal',
  };

  return (
    <GlassCard variant={variant} className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-sm mb-1">{label}</p>
          <p className={`text-3xl font-bold ${colorMap[variant]}`}>{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-xl bg-white/5 ${colorMap[variant]}`}>
            {icon}
          </div>
        )}
      </div>
      
      {/* Subtle corner accent */}
      <div 
        className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20"
        style={{ 
          background: variant === 'gold' 
            ? 'rgba(201, 169, 98, 0.5)' 
            : variant === 'teal' 
              ? 'rgba(42, 157, 143, 0.5)' 
              : 'rgba(255, 255, 255, 0.1)' 
        }}
      />
    </GlassCard>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <h2 className="text-2xl font-serif text-gradient-gold">{title}</h2>
        {subtitle && <p className="text-white/50 text-sm mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className={`min-h-screen pt-20 pb-24 lg:pb-8 px-4 md:px-6 ${className}`}>
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}
