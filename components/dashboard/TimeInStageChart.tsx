'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function TimeInStageChart({ loading }: { loading: boolean }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/leads/time-in-stage')
      .then((r) => r.json())
      .then((d) => setData(d.stages || []))
      .catch(() => {});
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <h2 className="text-sm font-semibold text-white mb-1">Avg Days Per Lead Status</h2>
      <p className="text-xs text-gray-500 mb-4">How long leads sit in each stage on average</p>
      {loading || data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-gray-600 text-sm">
          {loading ? 'Loading...' : 'Sync data to see time-in-stage metrics'}
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} unit="d" />
            <YAxis type="category" dataKey="stage" tick={{ fill: '#d1d5db', fontSize: 11 }} width={100} />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8 }}
              formatter={(v: number | undefined) => [`${v ?? 0} days`, 'Avg time']}
            />
            <Bar dataKey="avgDays" radius={[0, 4, 4, 0]}>
              {data.map((_: any, i: number) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
