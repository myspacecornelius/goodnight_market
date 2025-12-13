/**
 * Elegant Metric Card Component
 * Displays key metrics with refined styling and smooth animations
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface ElegantMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
  delay?: number;
  className?: string;
}

export const ElegantMetricCard: React.FC<ElegantMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  delay = 0,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={`card-elegant group ${className}`}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 rounded-lg bg-gradient-elegant">
          <Icon 
            className="w-5 h-5 text-indigo-600 transition-transform duration-300 group-hover:scale-110" 
            strokeWidth={1.5}
          />
        </div>
        
        {trend && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.isPositive 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        <h3 className="text-3xl font-bold font-serif text-primary mb-1">
          {value}
        </h3>
        <p className="text-sm font-medium text-muted-foreground">
          {title}
        </p>
      </div>

      {/* Subtitle & Trend */}
      <div className="flex items-center justify-between text-xs text-subtle">
        {subtitle && <span>{subtitle}</span>}
        {trend && <span className="text-muted">{trend.label}</span>}
      </div>
    </motion.div>
  );
};

export default ElegantMetricCard;
