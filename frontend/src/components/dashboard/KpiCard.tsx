'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: 'primary' | 'secondary' | 'accent' | 'emerald' | 'blue' | 'rose';
  prefix?: string;
  suffix?: string;
  loading?: boolean;
}

const colorMap = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-teal-500/10 text-teal-600',
  accent: 'bg-amber-500/10 text-amber-600',
  emerald: 'bg-emerald-500/10 text-emerald-600',
  blue: 'bg-blue-500/10 text-blue-600',
  rose: 'bg-rose-500/10 text-rose-600',
};

export function KpiCard({ title, value, change, changeLabel, icon, color = 'primary', prefix, suffix, loading }: KpiCardProps) {
  const isPositive = (change ?? 0) > 0;
  const isNeutral = change === 0 || change === undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <div className={cn('p-2 rounded-lg', colorMap[color])}>{icon}</div>
      </div>

      {loading ? (
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-foreground">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}
        </p>
      )}

      {change !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {isNeutral ? (
            <Minus size={12} className="text-muted-foreground" />
          ) : isPositive ? (
            <TrendingUp size={12} className="text-emerald-500" />
          ) : (
            <TrendingDown size={12} className="text-rose-500" />
          )}
          <span className={cn('text-xs font-medium', isNeutral ? 'text-muted-foreground' : isPositive ? 'text-emerald-600' : 'text-rose-600')}>
            {isPositive ? '+' : ''}{change?.toFixed(1)}%
          </span>
          {changeLabel && <span className="text-xs text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </motion.div>
  );
}
