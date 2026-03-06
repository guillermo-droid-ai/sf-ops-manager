'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import type { AnalyticsData } from '@/lib/types';

type ActiveTab = 'all' | 'leads' | 'opportunities' | 'transactions';

interface ChartsSectionProps {
  activeTab: ActiveTab;
}

const CHART_COLORS = {
  grid: '#1f2937',
  axis: '#6b7280',
  tooltipBg: '#111827',
  tooltipBorder: '#374151',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ChartTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-sm"
      style={{
        backgroundColor: CHART_COLORS.tooltipBg,
        borderColor: CHART_COLORS.tooltipBorder,
      }}
    >
      <div className="text-gray-400 mb-1">{label}</div>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-white">
            {entry.name}: {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChartsSection({ activeTab }: ChartsSectionProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="text-red-400">Failed to load charts: {error}</div>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-gray-900 rounded-xl border border-gray-800 p-6 h-72 animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Calculate average for reference line
  const avgLeads =
    data.leadCreationTrend.length > 0
      ? Math.round(
          data.leadCreationTrend.reduce((sum, d) => sum + d.count, 0) /
            data.leadCreationTrend.length
        )
      : 0;

  // Format dates for display
  const trendData = data.leadCreationTrend.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  // Determine which charts to show based on tab
  const showLeadCharts = activeTab === 'all' || activeTab === 'leads';
  const showOppCharts = activeTab === 'all' || activeTab === 'opportunities';
  const showTransCharts = activeTab === 'all' || activeTab === 'transactions';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart 1: Lead Creation Trend */}
      {showLeadCharts && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">
            Lead Volume — Last 30 Days
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickFormatter={formatNumber}
              />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine
                y={avgLeads}
                stroke="#6b7280"
                strokeDasharray="5 5"
                label={{
                  value: `Avg: ${avgLeads}`,
                  fill: '#6b7280',
                  fontSize: 11,
                  position: 'insideTopRight',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Leads"
                stroke={CHART_COLORS.blue}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.blue }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 2: Lead Source Performance */}
      {(showLeadCharts || showOppCharts) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">
            Lead Sources: Volume vs Conversions
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.leadSourceBreakdown.slice(0, 8)} layout="vertical">
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickFormatter={formatNumber}
              />
              <YAxis
                dataKey="source"
                type="category"
                tick={{ fill: CHART_COLORS.axis, fontSize: 10 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                width={70}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="count"
                name="Total Leads"
                fill={CHART_COLORS.blue}
                radius={[0, 4, 4, 0]}
              />
              <Bar
                dataKey="wonDeals"
                name="Won Deals"
                fill={CHART_COLORS.green}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 3: Data Quality */}
      {showLeadCharts && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">Lead Data Quality</h3>
          <div className="space-y-4">
            {data.dataQuality.map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{metric.label}</span>
                  <span className="text-white">
                    {metric.percent}%{' '}
                    <span className="text-gray-500">
                      ({metric.value.toLocaleString()} / {metric.total.toLocaleString()})
                    </span>
                  </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${metric.percent}%`,
                      backgroundColor: metric.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart 4: Top States */}
      {(showLeadCharts || showTransCharts) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">
            Lead Distribution by State
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.stateBreakdown.slice(0, 8)} layout="vertical">
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickFormatter={formatNumber}
              />
              <YAxis
                dataKey="state"
                type="category"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="count"
                name="Leads"
                fill={CHART_COLORS.purple}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 5: Closed Won Revenue */}
      {(showOppCharts || showTransCharts) && data.transactionRevenue.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">
            Closed Revenue — Last 6 Months
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.transactionRevenue}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const entry = payload[0];
                  return (
                    <div
                      className="rounded-lg border px-3 py-2 text-sm"
                      style={{
                        backgroundColor: CHART_COLORS.tooltipBg,
                        borderColor: CHART_COLORS.tooltipBorder,
                      }}
                    >
                      <div className="text-gray-400 mb-1">{label}</div>
                      <div className="text-white">
                        {formatCurrency(entry.value as number)}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {data.transactionRevenue.find((r) => r.month === label)?.count ?? 0} deals
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="contractValue"
                name="Revenue"
                fill={CHART_COLORS.green}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 6: Call Attempts Distribution */}
      {showLeadCharts && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <h3 className="text-white font-medium mb-4">Call Attempts Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.callAttemptsDistribution}>
              <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.axis, fontSize: 11 }}
                tickLine={{ stroke: CHART_COLORS.grid }}
                axisLine={{ stroke: CHART_COLORS.grid }}
                tickFormatter={formatNumber}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="count"
                name="Leads"
                fill={CHART_COLORS.blue}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
