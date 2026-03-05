'use client';

import clsx from 'clsx';
import type { LeadStatusBreakdown } from '@/lib/types';

interface StatusPipelineProps {
  data: LeadStatusBreakdown[];
}

export function StatusPipeline({ data }: StatusPipelineProps) {
  const colorMap = {
    green: 'border-green-500 bg-green-900/20',
    yellow: 'border-yellow-500 bg-yellow-900/20',
    red: 'border-red-500 bg-red-900/20'
  };

  const headerColorMap = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Lead Status Pipeline</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {data.map((status) => (
          <div
            key={status.status}
            className={clsx(
              'flex-shrink-0 w-48 rounded-lg border-l-4 bg-gray-800 p-4',
              colorMap[status.color]
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className={clsx('font-medium', headerColorMap[status.color])}>
                {status.status}
              </h4>
              <span className="text-2xl font-bold text-white">
                {status.count.toLocaleString()}
              </span>
            </div>
            
            <div className="mt-3 text-xs text-gray-400">
              Avg {status.avgDaysInStatus} days in status
            </div>
            
            {status.topReps.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Top Reps</p>
                {status.topReps.map((rep) => (
                  <div key={rep.name} className="flex justify-between text-xs">
                    <span className="text-gray-300 truncate">{rep.name}</span>
                    <span className="text-gray-500">{rep.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
