'use client';

import clsx from 'clsx';
import type { ActiveTransaction } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface ActiveDealsTableProps {
  data: ActiveTransaction[];
}

export function ActiveDealsTable({ data }: ActiveDealsTableProps) {
  const statusStyles = {
    overdue: 'text-red-400 bg-red-900/30',
    urgent: 'text-yellow-400 bg-yellow-900/30',
    ok: 'text-green-400 bg-green-900/30'
  };

  const statusLabels = {
    overdue: 'OVERDUE',
    urgent: 'URGENT',
    ok: 'ON TRACK'
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Active Transactions</h3>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Property</th>
              <th className="pb-3 pr-4 font-medium">Path Stage</th>
              <th className="pb-3 pr-4 font-medium">Dispo Decision</th>
              <th className="pb-3 pr-4 font-medium">Acq Rep</th>
              <th className="pb-3 pr-4 font-medium">Dispo Rep</th>
              <th className="pb-3 pr-4 font-medium text-right">Days in Stage</th>
              <th className="pb-3 pr-4 font-medium">Closing Date</th>
              <th className="pb-3 pr-4 font-medium text-right">Contract Price</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((deal) => (
              <tr 
                key={deal.id} 
                className={clsx(
                  'border-b border-gray-800 hover:bg-gray-800/50',
                  deal.status === 'overdue' && 'bg-red-900/10'
                )}
              >
                <td className="py-3 pr-4 text-white font-medium max-w-xs truncate">
                  {deal.propertyAddress}
                </td>
                <td className="py-3 pr-4 text-gray-300">{deal.pathStage}</td>
                <td className="py-3 pr-4 text-blue-400">{deal.dispoDecision || '-'}</td>
                <td className="py-3 pr-4 text-gray-400">{deal.acqRepName}</td>
                <td className="py-3 pr-4 text-gray-400">{deal.dispoRepName}</td>
                <td className="py-3 pr-4 text-right text-gray-300">{deal.daysInStage}d</td>
                <td className="py-3 pr-4 text-gray-400">
                  {deal.closingDate 
                    ? new Date(deal.closingDate).toLocaleDateString() 
                    : '-'
                  }
                </td>
                <td className="py-3 pr-4 text-right text-green-400">
                  {deal.contractPrice ? formatCurrency(deal.contractPrice) : '-'}
                </td>
                <td className="py-3">
                  <span className={clsx(
                    'px-2 py-0.5 text-xs font-medium rounded',
                    statusStyles[deal.status]
                  )}>
                    {statusLabels[deal.status]}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500">
                  No active transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data.length > 50 && (
        <p className="text-sm text-gray-500">Showing 50 of {data.length} transactions</p>
      )}
    </div>
  );
}
