'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'warning' | 'danger' | 'success';
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-gray-800 border-gray-700',
    warning: 'bg-yellow-900/30 border-yellow-600/50',
    danger: 'bg-red-900/30 border-red-600/50',
    success: 'bg-green-900/30 border-green-600/50'
  };

  const valueStyles = {
    default: 'text-white',
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    success: 'text-green-400'
  };

  return (
    <div className={clsx(
      'rounded-lg border p-4 transition-all hover:border-gray-600',
      variantStyles[variant]
    )}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-gray-500" />}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={clsx('text-2xl font-bold', valueStyles[variant])}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {trend && (
          <span className={clsx(
            'text-xs font-medium',
            trend === 'up' && 'text-green-500',
            trend === 'down' && 'text-red-500',
            trend === 'neutral' && 'text-gray-500'
          )}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      )}
    </div>
  );
}
