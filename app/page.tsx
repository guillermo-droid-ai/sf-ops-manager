'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Users, TrendingUp, Clock, RefreshCw, Activity } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import StaleLeadsTable from '@/components/dashboard/StaleLeadsTable';
import RepLeaderboard from '@/components/dashboard/RepLeaderboard';
import PipelineTrend from '@/components/dashboard/PipelineTrend';
import AlertsFeed from '@/components/dashboard/AlertsFeed';
import TimeInStageChart from '@/components/dashboard/TimeInStageChart';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    try {
      const [dashRes, alertRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/alerts'),
      ]);
      const dash = await dashRes.json();
      const alertData = await alertRes.json();
      setData(dash);
      setAlerts(alertData.alerts || []);
      setLastSync(dash.lastSync || new Date().toISOString());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch(`/api/sync?secret=${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`);
      await fetchData();
    } catch (e) {
      console.error(e);
    }
    setSyncing(false);
  }

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const s = data?.summary || {};
  const highAlerts = alerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white">⚡ Trinity Ops Manager</h1>
            <p className="text-sm text-gray-400">
              Salesforce AI Operations Dashboard
              {lastSync && (
                <span className="ml-2 text-gray-500">
                  · Last sync: {new Date(lastSync).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Alert Banner */}
        {highAlerts > 0 && (
          <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-red-200 text-sm font-medium">
              {highAlerts} high-priority alert{highAlerts !== 1 ? 's' : ''} need your attention
            </span>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Active Leads"
            value={s.activeLeads ?? '—'}
            sub={`${s.conversionRate ?? 0}% conversion rate`}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            loading={loading}
          />
          <StatCard
            label="Stale 7d+"
            value={s.staleLeads7d ?? '—'}
            sub={`${s.staleLeads14d ?? 0} past 14 days`}
            icon={<Clock className="h-5 w-5" />}
            color={s.staleLeads7d > 10 ? 'red' : 'yellow'}
            loading={loading}
          />
          <StatCard
            label="Open Deals"
            value={s.openOpportunities ?? '—'}
            sub={`$${((s.totalPipelineValue || 0) / 1000).toFixed(0)}k pipeline`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
            loading={loading}
          />
          <StatCard
            label="Alerts"
            value={alerts.length}
            sub={`${highAlerts} high priority`}
            icon={<Activity className="h-5 w-5" />}
            color={highAlerts > 0 ? 'red' : 'gray'}
            loading={loading}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Trend + Stage Chart */}
          <div className="lg:col-span-2 space-y-6">
            <PipelineTrend data={data?.trends || []} loading={loading} />
            <TimeInStageChart loading={loading} />
          </div>

          {/* Right: Alerts + Rep leaderboard */}
          <div className="space-y-6">
            <AlertsFeed alerts={alerts} loading={loading} />
            <RepLeaderboard reps={data?.repStats || []} loading={loading} />
          </div>
        </div>

        {/* Stale Leads Table */}
        <StaleLeadsTable leads={data?.staleLeads || []} loading={loading} onRefresh={fetchData} />
      </div>
    </div>
  );
}
