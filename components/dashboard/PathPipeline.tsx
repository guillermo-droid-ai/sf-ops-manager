'use client';

import clsx from 'clsx';
import type { TransactionPathBreakdown } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface PathPipelineProps {
  data: TransactionPathBreakdown[];
}

export function PathPipeline({ data }: PathPipelineProps) {
  // Filter out closed statuses for main pipeline view
  const activePaths = data.filter(p => 
    !['Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'].includes(p.path)
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Transaction Path Pipeline</h3>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activePaths.map((path) => (
          <div
            key={path.path}
            className={clsx(
              'flex-shrink-0 w-40 rounded-lg border-l-4 p-3',
              path.isBlocked 
                ? 'border-red-500 bg-red-900/30' 
                : 'border-emerald-500 bg-gray-800'
            )}
          >
            <h4 className={clsx(
              'font-medium text-xs leading-tight',
              path.isBlocked ? 'text-red-400' : 'text-emerald-400'
            )}>
              {path.path}
            </h4>
            
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">
                {path.count}
              </span>
              {path.isBlocked && (
                <span className="text-xs text-red-400">🚫</span>
              )}
            </div>
            
            <div className="mt-1 text-xs text-gray-400">
              {formatCurrency(path.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
