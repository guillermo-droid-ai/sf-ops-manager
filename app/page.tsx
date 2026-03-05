'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Users, Target, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  StatCard, 
  StatusPipeline, 
  StagePipeline, 
  PathPipeline,
  RepAccountabilityTable, 
  StaleLeadsTable,
  BlockedDealsPanel,
  ClosingSoonPanel,
  ActiveDealsTable,
  StuckDealsTable,
  OppRepTable,
  DrillDownPanel
} from '@/components/dashboard';
import { ToastProvider } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/analytics';
import type { LeadsDashboardData, OppsDashboardData, TransactionsDashboardData } from '@/lib/types';

type Tab = 'leads' | 'opportunities' | 'transactions';
type RecordType = 'lead' | 'opportunity' | 'transaction';

interface DrillDownState {
  open: boolean;
  title: string;
  subtitle: string;
  type: RecordType;
  filters: { status?: string; ownerId?: string; ownerName?: string };
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [leadsData, setLeadsData] = useState<LeadsDashboardData | null>(null);
  const [oppsData, setOppsData] = useState<OppsDashboardData | null>(null);
  const [txData, setTxData] = useState<TransactionsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [staleDaysFilter, setStaleDaysFilter] = useState(7);

  // Drill-down panel state
  const [drillDown, setDrillDown] = useState<DrillDownState>({
    open: false,
    title: '',
    subtitle: '',
    type: 'lead',
    filters: {},
  });

  const openDrillDown = (
    type: RecordType,
    title: string,
    subtitle: string,
    filters: DrillDownState['filters']
  ) => {
    setDrillDown({
      open: true,
      type,
      title,
      subtitle,
      filters,
    });
  };

  const closeDrillDown = () => {
    setDrillDown((prev) => ({ ...prev, open: false }));
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const responses = await Promise.all([
        fetch(`/api/dashboard/leads?staleDays=${staleDaysFilter}`),
        fetch('/api/dashboard/opportunities'),
        fetch('/api/dashboard/transactions')
      ]);
      
      const [leadsRes, oppsRes, txRes] = responses;
      
      if (!leadsRes.ok || !oppsRes.ok || !txRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const [leads, opps, tx] = await Promise.all([
        leadsRes.json(),
        oppsRes.json(),
        txRes.json()
      ]);
      
      setLeadsData(leads);
      setOppsData(opps);
      setTxData(tx);
      
      // Use the most recent sync time
      const syncTimes = [leads.lastSynced, opps.lastSynced, tx.lastSynced].filter(Boolean);
      if (syncTimes.length > 0) {
        setLastSynced(syncTimes.sort().pop() || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [staleDaysFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        setLastSynced(new Date().toISOString());
        await fetchData();
      } else {
        setError(data.error || 'Sync failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'transactions', label: 'Transactions', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Trinity Ops Manager</h1>
            <p className="text-sm text-gray-400">
              {lastSynced 
                ? `Last synced: ${new Date(lastSynced).toLocaleString()}`
                : 'Not synced yet'
              }
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'text-blue-400 border-blue-400'
                      : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.id === 'leads' && leadsData && (
                    <span className="ml-1 text-xs bg-gray-700 px-2 py-0.5 rounded-full">
                      {leadsData.stats.totalActive.toLocaleString()}
                    </span>
                  )}
                  {tab.id === 'transactions' && txData && txData.stats.blockedCount > 0 && (
                    <span className="ml-1 text-xs bg-red-600 px-2 py-0.5 rounded-full">
                      {txData.stats.blockedCount} blocked
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading dashboard data...</p>
        </div>
      )}

      {/* Content */}
      {!loading && (
        <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
          {/* LEADS TAB */}
          {activeTab === 'leads' && leadsData && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                  title="Total Active"
                  value={leadsData.stats.totalActive}
                  icon={Users}
                  onClick={() => openDrillDown('lead', 'All Active Leads', 'All non-converted leads', {})}
                />
                <StatCard
                  title="Hot Leads"
                  value={leadsData.stats.hotLeads}
                  subtitle="New + Working"
                  variant="success"
                  icon={CheckCircle}
                  onClick={() => openDrillDown('lead', 'Hot Leads', 'New and Working statuses', { status: 'New' })}
                />
                <StatCard
                  title="Pipeline"
                  value={leadsData.stats.pipelineLeads}
                  subtitle="Qualified + Offer + Appt"
                  onClick={() => openDrillDown('lead', 'Pipeline Leads', 'Qualified, Offer, Appointment', { status: 'Qualified' })}
                />
                <StatCard
                  title="Unqualified"
                  value={leadsData.stats.unqualified}
                  variant={leadsData.stats.unqualified > 1000 ? 'danger' : 'default'}
                  icon={AlertTriangle}
                  onClick={() => openDrillDown('lead', 'Unqualified Leads', 'Leads marked as unqualified', { status: 'Unqualified' })}
                />
                <StatCard
                  title="Unassigned"
                  value={leadsData.stats.unassigned}
                  subtitle="14+ days no activity"
                  variant={leadsData.stats.unassigned > 500 ? 'warning' : 'default'}
                />
              </div>

              {/* Status Pipeline */}
              <StatusPipeline 
                data={leadsData.statusBreakdown} 
                onStatusClick={(status) => openDrillDown('lead', `${status} Leads`, `Leads with status: ${status}`, { status })}
              />

              {/* Rep Accountability */}
              <RepAccountabilityTable data={leadsData.repStats} />

              {/* Stale Leads */}
              <StaleLeadsTable 
                data={leadsData.staleLeads} 
                daysFilter={staleDaysFilter}
                onFilterChange={setStaleDaysFilter}
              />
            </>
          )}

          {/* OPPORTUNITIES TAB */}
          {activeTab === 'opportunities' && oppsData && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                  title="Total Open"
                  value={oppsData.stats.totalOpen}
                  icon={Target}
                  onClick={() => openDrillDown('opportunity', 'All Open Opportunities', 'All non-closed opportunities', {})}
                />
                <StatCard
                  title="Active Pipeline"
                  value={oppsData.stats.activePipeline}
                  subtitle="Excluding Podio Deals"
                  variant="success"
                />
                <StatCard
                  title="Closed Won (Month)"
                  value={oppsData.stats.closedWonMonth}
                  variant="success"
                  icon={CheckCircle}
                />
                <StatCard
                  title="Closed Lost (Month)"
                  value={oppsData.stats.closedLostMonth}
                  variant={oppsData.stats.closedLostMonth > 20 ? 'warning' : 'default'}
                  onClick={() => openDrillDown('opportunity', 'Closed Lost', 'Opportunities closed as lost this month', { status: 'Closed Lost' })}
                />
                <StatCard
                  title="Pipeline Value"
                  value={formatCurrency(oppsData.stats.pipelineValue)}
                />
              </div>

              {/* Stage Pipeline */}
              <StagePipeline 
                data={oppsData.stageBreakdown} 
                onStageClick={(stage) => openDrillDown('opportunity', `${stage} Opportunities`, `Opportunities in stage: ${stage}`, { status: stage })}
              />

              {/* Rep Performance */}
              <OppRepTable data={oppsData.repStats} />

              {/* Stuck Deals */}
              <StuckDealsTable data={oppsData.stuckDeals} />
            </>
          )}

          {/* TRANSACTIONS TAB */}
          {activeTab === 'transactions' && txData && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard
                  title="Active Transactions"
                  value={txData.stats.activeCount}
                  icon={FileText}
                  onClick={() => openDrillDown('transaction', 'All Active Transactions', 'All active transactions', {})}
                />
                <StatCard
                  title="🔴 Blocked"
                  value={txData.stats.blockedCount}
                  variant={txData.stats.blockedCount > 0 ? 'danger' : 'success'}
                  onClick={() => openDrillDown('transaction', 'Blocked Transactions', 'Transactions stuck in blocked paths', { status: 'On Hold' })}
                />
                <StatCard
                  title="Closing This Week"
                  value={txData.stats.closingThisWeek}
                  variant={txData.stats.closingThisWeek > 0 ? 'warning' : 'default'}
                  onClick={() => openDrillDown('transaction', 'Closing Soon', 'Transactions closing this week', { status: 'Clear to Close' })}
                />
                <StatCard
                  title="Pipeline Value"
                  value={formatCurrency(txData.stats.pipelineValue)}
                />
                <StatCard
                  title="Closed/Won (Month)"
                  value={`${txData.stats.closedWonMonth} | ${formatCurrency(txData.stats.closedWonMonthValue)}`}
                  variant="success"
                  onClick={() => openDrillDown('transaction', 'Closed Won', 'Transactions closed this month', { status: 'Closed/Won' })}
                />
              </div>

              {/* Path Pipeline */}
              <PathPipeline 
                data={txData.pathBreakdown} 
                onPathClick={(path) => openDrillDown('transaction', `${path}`, `Transactions in path: ${path}`, { status: path })}
              />

              {/* Blocked Deals - Most Important */}
              <BlockedDealsPanel data={txData.blockedDeals} />

              {/* Closing Soon */}
              <ClosingSoonPanel data={txData.closingSoon} />

              {/* Active Deals Table */}
              <ActiveDealsTable data={txData.activeDeals} />
            </>
          )}
        </main>
      )}

      {/* Drill-down Panel */}
      <DrillDownPanel
        open={drillDown.open}
        onClose={closeDrillDown}
        title={drillDown.title}
        subtitle={drillDown.subtitle}
        type={drillDown.type}
        filters={drillDown.filters}
      />
    </div>
  );
}

export default function Dashboard() {
  return (
    <ToastProvider>
      <DashboardContent />
    </ToastProvider>
  );
}
