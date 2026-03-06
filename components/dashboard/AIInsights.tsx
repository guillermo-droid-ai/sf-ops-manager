'use client';

import { useEffect, useState } from 'react';
import type { InsightsData, Insight } from '@/lib/types';

interface AIInsightsProps {
  onDrillDown?: (type: 'leads' | 'opportunities' | 'transactions', title: string, filterKey: string, filterValue: string) => void;
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getTypeBorder(type: Insight['type']): string {
  switch (type) {
    case 'critical':
      return 'border-l-red-500';
    case 'warning':
      return 'border-l-amber-500';
    case 'success':
      return 'border-l-green-500';
    case 'info':
    default:
      return 'border-l-blue-500';
  }
}

function getTypeBg(type: Insight['type']): string {
  switch (type) {
    case 'critical':
      return 'bg-red-950/30';
    case 'warning':
      return 'bg-amber-950/30';
    case 'success':
      return 'bg-green-950/30';
    case 'info':
    default:
      return 'bg-blue-950/30';
  }
}

export function AIInsights({ onDrillDown }: AIInsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        const res = await fetch('/api/insights');
        if (!res.ok) throw new Error('Failed to fetch insights');
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchInsights();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/insights');
      if (!res.ok) throw new Error('Failed to fetch insights');
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="text-red-400">Failed to load insights: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🧠</span>
            <span>AI Insights</span>
          </h2>
          <p className="text-sm text-gray-500">
            Generated from live Salesforce data
            {data && <span className="ml-2">· Updated {formatTimeAgo(data.generatedAt)}</span>}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh insights"
        >
          <span className={loading ? 'animate-spin inline-block' : ''}>↻</span>
        </button>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-800/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : data?.insights && data.insights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((insight, idx) => (
            <div
              key={idx}
              className={`rounded-lg border-l-4 ${getTypeBorder(insight.type)} ${getTypeBg(insight.type)} p-4 border border-gray-700/50`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl flex-shrink-0">{insight.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white text-sm leading-tight">
                    {insight.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1 leading-relaxed">
                    {insight.detail}
                  </p>
                  {insight.action && onDrillDown && (
                    <button
                      onClick={() =>
                        onDrillDown(
                          insight.action!.drillType,
                          insight.title,
                          insight.action!.filterKey,
                          insight.action!.filterValue
                        )
                      }
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {insight.action.label} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500 text-center py-8">
          No insights generated yet
        </div>
      )}
    </div>
  );
}
