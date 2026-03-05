'use client';

import clsx from 'clsx';
import type { StuckDeal } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface StuckDealsTableProps {
  data: StuckDeal[];
}

export function StuckDealsTable({ data }: StuckDealsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">🐢 Stuck Deals (30+ days / Past Due)</h3>
        <span className="px-2 py-0.5 text-sm font-medium bg-orange-600 text-white rounded-full">
          {data.length}
        </span>
      </div>
      
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Deal Name</th>
              <th className="pb-3 pr-4 font-medium">Stage</th>
              <th className="pb-3 pr-4 font-medium">Rep</th>
              <th className="pb-3 pr-4 font-medium text-right">Days Stuck</th>
              <th className="pb-3 pr-4 font-medium">Close Date</th>
              <th className="pb-3 pr-4 font-medium text-right">Amount</th>
              <th className="pb-3 font-medium">Issue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((deal) => (
              <tr 
                key={deal.id} 
                className={clsx(
                  'border-b border-gray-800 hover:bg-gray-800/50',
                  deal.isPastDue && 'bg-red-900/10'
                )}
              >
                <td className="py-3 pr-4 text-white font-medium max-w-xs truncate">
                  {deal.name}
                </td>
                <td className="py-3 pr-4 text-gray-300">{deal.stage}</td>
                <td className="py-3 pr-4 text-gray-400">{deal.repName}</td>
                <td className="py-3 pr-4 text-right text-orange-400 font-medium">
                  {deal.daysInStage}d
                </td>
                <td className={clsx(
                  'py-3 pr-4',
                  deal.isPastDue ? 'text-red-400 font-medium' : 'text-gray-400'
                )}>
                  {deal.closeDate 
                    ? new Date(deal.closeDate).toLocaleDateString() 
                    : '-'
                  }
                </td>
                <td className="py-3 pr-4 text-right text-green-400">
                  {deal.amount ? formatCurrency(deal.amount) : '-'}
                </td>
                <td className="py-3">
                  {deal.isPastDue ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-600 text-white">
                      PAST DUE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-600/30 text-orange-400">
                      STUCK
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">
                  ✅ No stuck deals - everything is moving!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
