'use client';

import type { OppRepStats } from '@/lib/types';
import { formatCurrency } from '@/lib/analytics';

interface OppRepTableProps {
  data: OppRepStats[];
}

export function OppRepTable({ data }: OppRepTableProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Rep Performance</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Rep Name</th>
              <th className="pb-3 pr-4 font-medium text-right">Total Opps</th>
              <th className="pb-3 pr-4 font-medium text-right">Closing Rate</th>
              <th className="pb-3 pr-4 font-medium text-right">Avg Days to Close</th>
              <th className="pb-3 pr-4 font-medium text-right">Pipeline Value</th>
              <th className="pb-3 font-medium text-right">Closed Won (Month)</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 15).map((rep) => (
              <tr key={rep.repName} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4 text-white font-medium">{rep.repName}</td>
                <td className="py-3 pr-4 text-right text-gray-300">{rep.totalOpps}</td>
                <td className="py-3 pr-4 text-right">
                  <span className={`font-medium ${
                    rep.closingRate >= 30 ? 'text-green-400' : 
                    rep.closingRate >= 15 ? 'text-yellow-400' : 
                    'text-red-400'
                  }`}>
                    {rep.closingRate}%
                  </span>
                </td>
                <td className="py-3 pr-4 text-right text-gray-400">{rep.avgDaysToClose}d</td>
                <td className="py-3 pr-4 text-right text-blue-400">
                  {formatCurrency(rep.pipelineValue)}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-medium ${rep.closedWonMonth > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {rep.closedWonMonth}
                  </span>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No rep data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
