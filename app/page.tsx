'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertsFeed } from '@/components/dashboard/AlertsFeed';
import { PipelineBar } from '@/components/dashboard/PipelineBar';
import { RepScorecard } from '@/components/dashboard/RepScorecard';
import { BlockedTransactions } from '@/components/dashboard/BlockedTransactions';
import VoiceWidget from '@/components/dashboard/VoiceWidget';
import { DrillDownPanel } from '@/components/dashboard/DrillDownPanel';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import type { DashboardData, Alert, BlockedTransaction } from '@/lib/types';

type DrillType = 'leads' | 'opportunities' | 'transactions';

interface DrillState {
  isOpen: boolean;
  type: DrillType;
  title: string;
  filterKey: string;
  filterValue: string;
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function Dashboard() {
  const [data, setData] = useState<(DashboardData & { blockedTransactions: BlockedTransaction[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toasts, show: showToast, remove: removeToast } = useToast();

  const [drill, setDrill] = useState<DrillState>({
    isOpen: false,
    type: 'leads',
    title: '',
    filterKey: '',
    filterValue: ''
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      const dashboardData = await res.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      showToast('Data refreshed successfully', 'success');
      await fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Sync failed', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const openDrill = (type: DrillType, title: string, filterKey: string, filterValue: string) => {
    setDrill({
      isOpen: true,
      type,
      title,
      filterKey,
      filterValue
    });
  };

  const closeDrill = () => {
    setDrill(prev => ({ ...prev, isOpen: false }));
  };

  const handleAlertClick = (alert: Alert) => {
    switch (alert.type) {
      case 'blocked_transactions':
        openDrill('transactions', 'Blocked Transactions', 'blocked', 'true');
        break;
      case 'stale_leads':
        openDrill('leads', 'Stale Leads (14+ days)', 'stale', '14');
        break;
      case 'closing_soon':
        openDrill('opportunities', 'Closing Soon (≤7 days)', 'closingSoon', 'true');
        break;
      case 'low_activity_reps':
        // Could filter by score but for now just show leads
        openDrill('leads', 'Low Activity Rep Leads', '', '');
        break;
    }
  };

  const handleLeadStatusClick = (status: string) => {
    openDrill('leads', `${status} Leads`, 'status', status);
  };

  const handleOppStageClick = (stage: string) => {
    openDrill('opportunities', `${stage} Opportunities`, 'stage', stage);
  };

  const handleTransPathClick = (path: string) => {
    openDrill('transactions', `${path} Transactions`, 'path', path);
  };

  const handleRepClick = (ownerId: string, name: string) => {
    openDrill('leads', `${name}'s Leads`, 'ownerId', ownerId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-300">{error}</p>
          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // Calculate warning text for leads
  const unqualifiedLeads = data.leads.byStatus.find(s => s.status === 'Unqualified');
  const unqualifiedPercent = unqualifiedLeads && data.leads.total > 0
    ? Math.round((unqualifiedLeads.count / data.leads.total) * 100)
    : 0;
  const leadWarning = unqualifiedPercent > 20
    ? `${unqualifiedLeads?.count.toLocaleString()} unqualified (${unqualifiedPercent}%)`
    : undefined;

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Trinity Ops Manager</h1>
          <p className="text-gray-400 text-sm">Salesforce Operations Dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last sync: {formatTime(data.lastSync)}
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            <span className={syncing ? 'animate-spin' : ''}>↻</span>
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </header>

      {/* Alerts */}
      <AlertsFeed alerts={data.alerts} onAlertClick={handleAlertClick} />

      {/* Pipeline Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <PipelineBar
          title="Leads"
          total={data.leads.total}
          segments={data.leads.byStatus.map(s => ({
            label: s.status,
            count: s.count,
            color: ''
          }))}
          warningText={leadWarning}
          onSegmentClick={handleLeadStatusClick}
        />
        <PipelineBar
          title="Opportunities"
          total={data.opportunities.total}
          segments={data.opportunities.byStage.map(s => ({
            label: s.stage,
            count: s.count,
            color: ''
          }))}
          onSegmentClick={handleOppStageClick}
        />
        <PipelineBar
          title="Transactions"
          total={data.transactions.total}
          segments={data.transactions.byPath.map(p => ({
            label: p.path,
            count: p.count,
            color: ''
          }))}
          onSegmentClick={handleTransPathClick}
        />
      </div>

      {/* Rep Scorecard */}
      <div className="mb-6">
        <RepScorecard reps={data.repScorecard} onRepClick={handleRepClick} />
      </div>

      {/* Blocked Transactions */}
      <BlockedTransactions transactions={data.blockedTransactions} />

      {/* Drill-down Panel */}
      <DrillDownPanel
        isOpen={drill.isOpen}
        onClose={closeDrill}
        type={drill.type}
        title={drill.title}
        filterKey={drill.filterKey}
        filterValue={drill.filterValue}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Voice Widget */}
      <VoiceWidget />
    </div>
  );
}
