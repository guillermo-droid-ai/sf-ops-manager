'use client';

import clsx from 'clsx';
import type { BlockedDeal } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface BlockedDealsPanelProps {
  data: BlockedDeal[];
}

export function BlockedDealsPanel({ data }: BlockedDealsPanelProps) {
  const groupedByStage: Record<string, BlockedDeal[]> = {};
  for (const deal of data) {
    if (!groupedByStage[deal.pathStage]) {
      groupedByStage[deal.pathStage] = [];
    }
    groupedByStage[deal.pathStage].push(deal);
  }

  const stageColors: Record<string, string> = {
    'On Hold': 'border-yellow-500 bg-yellow-900/20',
    'Title Issues': 'border-orange-500 bg-orange-900/20',
    'Waiting on Funds': 'border-purple-500 bg-purple-900/20',
    'Cancellation Sent - Waiting to Sign': 'border-red-500 bg-red-900/20'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">🚨 Blocked Deals</h3>
        <span className="px-2 py-0.5 text-sm font-medium bg-red-600 text-white rounded-full">
          {data.length}
        </span>
      </div>
      
      {Object.entries(groupedByStage).map(([stage, deals]) => (
        <div 
          key={stage}
          className={clsx(
            'rounded-lg border-l-4 p-4',
            stageColors[stage] || 'border-gray-500 bg-gray-800'
          )}
        >
          <h4 className="font-medium text-white mb-3">
            {stage} ({deals.length})
          </h4>
          <div className="space-y-2">
            {deals.map((deal) => (
              <div 
                key={deal.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm bg-gray-900/50 rounded p-2"
              >
                <span className="text-white font-medium flex-shrink-0">
                  {deal.propertyAddress}
                </span>
                <span className="text-gray-400">
                  Acq: <span className="text-gray-300">{deal.acqRepName}</span>
                </span>
                <span className="text-gray-400">
                  Dispo: <span className="text-gray-300">{deal.dispoRepName}</span>
                </span>
                <span className="text-red-400 font-medium">
                  {deal.daysBlocked}d blocked
                </span>
                {deal.dispoDecision && (
                  <span className="text-blue-400">{deal.dispoDecision}</span>
                )}
                {deal.contractPrice && (
                  <span className="text-green-400">{formatCurrency(deal.contractPrice)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500 bg-gray-800/50 rounded-lg">
          ✅ No blocked deals - everything is flowing!
        </div>
      )}
    </div>
  );
}
