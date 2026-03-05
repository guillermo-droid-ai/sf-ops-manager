'use client';

import clsx from 'clsx';
import type { LeadRepStats } from '@/lib/types';

interface RepAccountabilityTableProps {
  data: LeadRepStats[];
}

export function RepAccountabilityTable({ data }: RepAccountabilityTableProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Rep Accountability</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Rep Name</th>
              <th className="pb-3 pr-4 font-medium text-right">Total</th>
              <th className="pb-3 pr-4 font-medium text-right">New</th>
              <th className="pb-3 pr-4 font-medium text-right">Working</th>
              <th className="pb-3 pr-4 font-medium text-right">Qualified</th>
              <th className="pb-3 pr-4 font-medium text-right">Offer</th>
              <th className="pb-3 pr-4 font-medium text-right text-red-400">Unqualified</th>
              <th className="pb-3 pr-4 font-medium text-right">Avg Days No Activity</th>
              <th className="pb-3 font-medium">Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((rep) => (
              <tr 
                key={rep.repName}
                className={clsx(
                  'border-b border-gray-800',
                  rep.isWarning && 'bg-red-900/10'
                )}
              >
                <td className="py-3 pr-4 text-white font-medium">
                  {rep.repName}
                  {rep.isWarning && <span className="ml-2 text-red-400">⚠️</span>}
                </td>
                <td className="py-3 pr-4 text-right text-gray-300">{rep.totalAssigned.toLocaleString()}</td>
                <td className="py-3 pr-4 text-right text-blue-400">{rep.newCount}</td>
                <td className="py-3 pr-4 text-right text-cyan-400">{rep.workingCount}</td>
                <td className="py-3 pr-4 text-right text-green-400">{rep.qualifiedCount}</td>
                <td className="py-3 pr-4 text-right text-emerald-400">{rep.offerCount}</td>
                <td className={clsx(
                  'py-3 pr-4 text-right font-medium',
                  rep.unqualifiedCount > 50 ? 'text-red-400' : 'text-gray-400'
                )}>
                  {rep.unqualifiedCount.toLocaleString()}
                </td>
                <td className={clsx(
                  'py-3 pr-4 text-right',
                  rep.avgDaysNoActivity > 7 ? 'text-red-400' : 'text-gray-400'
                )}>
                  {rep.avgDaysNoActivity}d
                </td>
                <td className="py-3 text-gray-500">
                  {rep.lastActivity 
                    ? new Date(rep.lastActivity).toLocaleDateString()
                    : 'Never'
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
