'use client';

import type { BlockedTransaction } from '@/lib/types';

interface BlockedTransactionsProps {
  transactions: BlockedTransaction[];
}

const SF_BASE_URL = 'https://trinityoffers.my.salesforce.com';

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function BlockedTransactions({ transactions }: BlockedTransactionsProps) {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-red-800/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-500">⚠️</span>
        <h2 className="text-lg font-semibold text-red-400">
          Blocked Transactions ({transactions.length})
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-700">
              <th className="pb-2 pr-4">Property Address</th>
              <th className="pb-2 px-4">Path Stage</th>
              <th className="pb-2 px-4">Dispo Decision</th>
              <th className="pb-2 px-4">Acq Rep</th>
              <th className="pb-2 px-4">Dispo Rep</th>
              <th className="pb-2 px-4 text-right">Days Blocked</th>
              <th className="pb-2 px-4 text-right">Contract Price</th>
              <th className="pb-2 pl-4"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((trans) => (
              <tr 
                key={trans.id} 
                className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
              >
                <td className="py-2 pr-4 text-gray-200 max-w-[200px] truncate" title={trans.propertyAddress}>
                  {trans.propertyAddress}
                </td>
                <td className="py-2 px-4">
                  <span className="inline-block px-2 py-0.5 text-xs rounded bg-red-900/50 text-red-300 border border-red-700/50">
                    {trans.pathStage}
                  </span>
                </td>
                <td className="py-2 px-4 text-gray-400">
                  {trans.dispoDecision || '—'}
                </td>
                <td className="py-2 px-4 text-gray-400">
                  {trans.acqRepName || '—'}
                </td>
                <td className="py-2 px-4 text-gray-400">
                  {trans.dispoRepName || '—'}
                </td>
                <td className="py-2 px-4 text-right">
                  <span className={trans.daysBlocked > 7 ? 'text-red-400' : trans.daysBlocked > 3 ? 'text-yellow-400' : 'text-gray-200'}>
                    {trans.daysBlocked}d
                  </span>
                </td>
                <td className="py-2 px-4 text-right text-gray-200">
                  {formatCurrency(trans.contractPrice)}
                </td>
                <td className="py-2 pl-4">
                  <a
                    href={`${SF_BASE_URL}/${trans.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs whitespace-nowrap"
                  >
                    Open in SF ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
