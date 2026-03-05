'use client';

import type { StaleLead } from '@/lib/types';

interface StaleLeadsTableProps {
  data: StaleLead[];
  daysFilter: number;
  onFilterChange: (days: number) => void;
}

export function StaleLeadsTable({ data, daysFilter, onFilterChange }: StaleLeadsTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Stale Leads</h3>
        <div className="flex gap-2">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => onFilterChange(days)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                daysFilter === days
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {days}d+
            </button>
          ))}
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Lead Name</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 pr-4 font-medium">Rep</th>
              <th className="pb-3 pr-4 font-medium text-right">Days Stale</th>
              <th className="pb-3 pr-4 font-medium">Phone</th>
              <th className="pb-3 font-medium">Email</th>
            </tr>
          </thead>
          <tbody>
            {data.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 pr-4 text-white">{lead.name}</td>
                <td className="py-3 pr-4 text-gray-300">{lead.status}</td>
                <td className="py-3 pr-4 text-gray-400">{lead.repName}</td>
                <td className="py-3 pr-4 text-right text-red-400 font-medium">
                  {lead.daysSinceActivity}d
                </td>
                <td className="py-3 pr-4 text-gray-400">{lead.phone || '-'}</td>
                <td className="py-3 text-gray-400 truncate max-w-xs">{lead.email || '-'}</td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No stale leads found for this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
