'use client';

import clsx from 'clsx';
import type { ClosingSoonDeal } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface ClosingSoonPanelProps {
  data: ClosingSoonDeal[];
}

export function ClosingSoonPanel({ data }: ClosingSoonPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">📅 Closing Soon (14 days)</h3>
        <span className="px-2 py-0.5 text-sm font-medium bg-emerald-600 text-white rounded-full">
          {data.length}
        </span>
      </div>
      
      <div className="space-y-2">
        {data.map((deal) => (
          <div 
            key={deal.id}
            className={clsx(
              'flex flex-wrap items-center gap-x-4 gap-y-1 text-sm rounded-lg p-3',
              deal.daysUntilClose <= 3 
                ? 'bg-yellow-900/30 border border-yellow-600/50' 
                : 'bg-gray-800'
            )}
          >
            <span className="text-white font-medium flex-shrink-0">
              {deal.propertyAddress}
            </span>
            <span className={clsx(
              'font-medium px-2 py-0.5 rounded',
              deal.daysUntilClose <= 1 
                ? 'bg-red-600 text-white'
                : deal.daysUntilClose <= 3
                  ? 'bg-yellow-600 text-white'
                  : 'bg-emerald-600/30 text-emerald-400'
            )}>
              {deal.daysUntilClose === 0 
                ? 'TODAY' 
                : deal.daysUntilClose === 1 
                  ? 'TOMORROW'
                  : `${deal.daysUntilClose} days`
              }
            </span>
            <span className="text-gray-400">
              {new Date(deal.closingDate).toLocaleDateString()}
            </span>
            <span className="text-gray-400">
              Acq: <span className="text-gray-300">{deal.acqRepName}</span>
            </span>
            <span className="text-gray-400">
              Dispo: <span className="text-gray-300">{deal.dispoRepName}</span>
            </span>
            {deal.dispoDecision && (
              <span className="text-blue-400">{deal.dispoDecision}</span>
            )}
            {deal.contractPrice && (
              <span className="text-green-400">{formatCurrency(deal.contractPrice)}</span>
            )}
          </div>
        ))}
        
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg">
            No deals closing in the next 14 days
          </div>
        )}
      </div>
    </div>
  );
}
