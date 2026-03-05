'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendPoint {
  date: string;
  activeLeads: number;
  openOpportunities: number;
  staleLeads: number;
}

export default function PipelineTrend({ data, loading }: { data: TrendPoint[]; loading: boolean }) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), 'MMM d HH:mm'),
  }));

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-white mb-4">Pipeline Trend (Last 24h)</h2>
      {loading || data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-600 text-sm">
          {loading ? 'Loading...' : 'No trend data yet — will build after first sync'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="label" tick={{ fill: '#6b7280', fontSize: 10 }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <Legend />
            <Line type="monotone" dataKey="activeLeads" stroke="#3b82f6" dot={false} name="Active Leads" strokeWidth={2} />
            <Line type="monotone" dataKey="openOpportunities" stroke="#10b981" dot={false} name="Open Opps" strokeWidth={2} />
            <Line type="monotone" dataKey="staleLeads" stroke="#ef4444" dot={false} name="Stale Leads" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
