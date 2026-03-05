'use client';

import { useState } from 'react';
import { Phone, Mail, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface StaleLead {
  id: string;
  name: string;
  status: string;
  owner: string;
  daysStale: number;
  lastActivity: string | null;
  phone: string | null;
  email: string | null;
}

export default function StaleLeadsTable({
  leads,
  loading,
  onRefresh,
}: {
  leads: StaleLead[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<'7' | '14' | '30'>('7');

  const thresholds = { '7': 7, '14': 14, '30': 30 };
  const filtered = leads.filter((l) => l.daysStale >= thresholds[filter]);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <h2 className="text-sm font-semibold text-white">Stale Leads</h2>
          <p className="text-xs text-gray-500">{filtered.length} leads need attention</p>
        </div>
        <div className="flex gap-1">
          {(['7', '14', '30'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={clsx(
                'text-xs px-3 py-1 rounded-md font-medium transition',
                filter === d
                  ? 'bg-red-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              {d}d+
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-600 text-sm">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-gray-600 text-sm">
          🎉 No stale leads over {filter} days!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                <th className="text-left px-5 py-3">Lead</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Owner</th>
                <th className="text-left px-4 py-3">
                  <Clock className="h-3 w-3 inline mr-1" />
                  Days Stale
                </th>
                <th className="text-left px-4 py-3">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.slice(0, 50).map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/50 transition">
                  <td className="px-5 py-3 font-medium text-white">{lead.name}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{lead.owner}</td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'font-bold',
                        lead.daysStale >= 30
                          ? 'text-red-400'
                          : lead.daysStale >= 14
                          ? 'text-yellow-400'
                          : 'text-orange-400'
                      )}
                    >
                      {lead.daysStale}d
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="text-blue-400 hover:text-blue-300">
                          <Phone className="h-4 w-4" />
                        </a>
                      )}
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="text-green-400 hover:text-green-300">
                          <Mail className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
