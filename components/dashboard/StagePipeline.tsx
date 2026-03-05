'use client';

import clsx from 'clsx';
import type { OppStageBreakdown } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface StagePipelineProps {
  data: OppStageBreakdown[];
}

export function StagePipeline({ data }: StagePipelineProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Opportunity Stage Pipeline</h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {data.map((stage) => (
          <div
            key={stage.stage}
            className={clsx(
              'flex-shrink-0 w-48 rounded-lg border-l-4 p-4',
              stage.isGraveyard 
                ? 'border-purple-500 bg-purple-900/20' 
                : stage.isWarning 
                  ? 'border-red-500 bg-red-900/20'
                  : 'border-blue-500 bg-gray-800'
            )}
          >
            <div className="flex items-center justify-between">
              <h4 className={clsx(
                'font-medium text-sm',
                stage.isGraveyard 
                  ? 'text-purple-400' 
                  : stage.isWarning 
                    ? 'text-red-400'
                    : 'text-blue-400'
              )}>
                {stage.stage}
              </h4>
            </div>
            
            <div className="mt-2">
              <span className="text-2xl font-bold text-white">
                {stage.count.toLocaleString()}
              </span>
              {stage.isGraveyard && (
                <span className="ml-2 text-xs text-purple-400">⚠️ Graveyard</span>
              )}
            </div>
            
            <div className="mt-2 text-sm text-gray-400">
              {formatCurrency(stage.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
