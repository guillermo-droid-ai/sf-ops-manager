import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';
import { getSupabaseAdmin } from '@/lib/supabase';
import type {
  DashboardData,
  StatusCount,
  StageCount,
  PathCount,
  RepScore,
  Alert,
  SFLead,
  SFOpportunity,
  SFTransaction,
  SFUser,
  BlockedTransaction,
} from '@/lib/types';

const BLOCKED_PATHS = [
  'On Hold',
  'Title Issues',
  'Waiting on Funds',
  'Cancellation Sent - Waiting to Sign',
];

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function calculateScore(stalePercent: number, daysSinceActivity: number): 'A' | 'B' | 'C' | 'D' {
  if (stalePercent < 10 && daysSinceActivity < 3) return 'A';
  if (stalePercent < 25 && daysSinceActivity < 7) return 'B';
  if (stalePercent < 50 && daysSinceActivity < 14) return 'C';
  return 'D';
}

async function tryGetCachedDashboard(): Promise<(DashboardData & {
  blockedTransactions: BlockedTransaction[];
  dataSource: 'cache';
}) | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('snapshots')
      .select('captured_at, summary')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const capturedAt = new Date(data.captured_at);
    const age = Date.now() - capturedAt.getTime();

    if (age > CACHE_TTL_MS) {
      console.log(`Cache stale: ${Math.round(age / 60000)}min old (TTL: ${CACHE_TTL_MS / 60000}min)`);
      return null;
    }

    // Return cached dashboard with dataSource marker
    return data.summary as DashboardData & {
      blockedTransactions: BlockedTransaction[];
      dataSource: 'cache';
    };
  } catch (err) {
    console.warn('Cache check failed, falling back to live:', err);
    return null;
  }
}

function triggerBackgroundSync() {
  // Fire-and-forget background sync - don't await
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  fetch(`${baseUrl}/api/sync`, { method: 'POST' }).catch((err) =>
    console.warn('Background sync trigger failed:', err)
  );
}

async function fetchLiveDashboard(): Promise<
  DashboardData & { blockedTransactions: BlockedTransaction[]; dataSource: 'live' }
> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Query all data in parallel
  const [leads, opportunities, transactions, users] = await Promise.all([
    sfQuery<SFLead>(`
      SELECT Id, FirstName, LastName, Status, OwnerId, CreatedDate, LastActivityDate, LeadSource, Phone, Email, State
      FROM Lead
      WHERE IsConverted = false
    `),
    sfQuery<SFOpportunity>(`
      SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, CreatedDate, LastActivityDate, IsClosed, IsWon, LeadSource
      FROM Opportunity
    `),
    sfQuery<SFTransaction>(`
      SELECT Id, Name, Left_Main__Path__c, Left_Main__Acquisition_Rep__c, Left_Main__Dispositions_Rep__c,
             Left_Main__Disposition_Decision__c, Left_Main__Contract_Assignment_Price__c,
             Left_Main__Closing_Date__c, LastModifiedDate, CreatedDate
      FROM Left_Main__Transactions__c
    `),
    sfQuery<SFUser>(`SELECT Id, Name, IsActive FROM User WHERE UserType = 'Standard' AND IsActive = true`),
  ]);

  // Build user lookup map
  const userMap = new Map<string, string>();
  users.forEach((u) => userMap.set(u.Id, u.Name));

  // Calculate leads by status
  const leadStatusCounts = new Map<string, number>();
  let stale14dCount = 0;

  leads.forEach((lead) => {
    const status = lead.Status || 'Unknown';
    leadStatusCounts.set(status, (leadStatusCounts.get(status) || 0) + 1);

    if (lead.LastActivityDate) {
      const activityDate = new Date(lead.LastActivityDate);
      if (activityDate < fourteenDaysAgo) {
        stale14dCount++;
      }
    } else {
      stale14dCount++;
    }
  });

  const leadsByStatus: StatusCount[] = Array.from(leadStatusCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Calculate opportunities by stage
  const oppStageCounts = new Map<string, { count: number; totalAmount: number }>();
  let closingSoonCount = 0;

  opportunities.forEach((opp) => {
    const stage = opp.StageName || 'Unknown';
    const existing = oppStageCounts.get(stage) || { count: 0, totalAmount: 0 };
    existing.count++;
    existing.totalAmount += opp.Amount || 0;
    oppStageCounts.set(stage, existing);

    if (!opp.IsClosed && opp.CloseDate) {
      const closeDate = new Date(opp.CloseDate);
      if (closeDate <= sevenDaysFromNow && closeDate >= now) {
        closingSoonCount++;
      }
    }
  });

  const oppsByStage: StageCount[] = Array.from(oppStageCounts.entries())
    .map(([stage, data]) => ({ stage, count: data.count, totalAmount: data.totalAmount }))
    .sort((a, b) => b.count - a.count);

  // Calculate transactions by path
  const transPathCounts = new Map<string, number>();
  let blockedCount = 0;
  let closingThisWeekCount = 0;
  const blockedTransactions: BlockedTransaction[] = [];

  transactions.forEach((trans) => {
    const path = trans.Left_Main__Path__c || 'Unknown';
    transPathCounts.set(path, (transPathCounts.get(path) || 0) + 1);

    if (BLOCKED_PATHS.includes(path)) {
      blockedCount++;
      const daysBlocked = daysBetween(new Date(trans.LastModifiedDate), now);
      blockedTransactions.push({
        id: trans.Id,
        propertyAddress: trans.Name,
        pathStage: path,
        dispoDecision: trans.Left_Main__Disposition_Decision__c,
        acqRepName: trans.Left_Main__Acquisition_Rep__c
          ? (userMap.get(trans.Left_Main__Acquisition_Rep__c) || null)
          : null,
        dispoRepName: trans.Left_Main__Dispositions_Rep__c
          ? (userMap.get(trans.Left_Main__Dispositions_Rep__c) || null)
          : null,
        daysBlocked,
        contractPrice: trans.Left_Main__Contract_Assignment_Price__c,
      });
    }

    if (trans.Left_Main__Closing_Date__c) {
      const closeDate = new Date(trans.Left_Main__Closing_Date__c);
      if (closeDate <= sevenDaysFromNow && closeDate >= now) {
        closingThisWeekCount++;
      }
    }
  });

  const transByPath: PathCount[] = Array.from(transPathCounts.entries())
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count);

  // Build rep scorecard
  const repData = new Map<
    string,
    {
      leadsActive: number;
      leadsStale7d: number;
      oppPipeline: number;
      transActive: number;
      lastActivity: Date | null;
    }
  >();

  users.forEach((user) => {
    repData.set(user.Id, {
      leadsActive: 0,
      leadsStale7d: 0,
      oppPipeline: 0,
      transActive: 0,
      lastActivity: null,
    });
  });

  leads.forEach((lead) => {
    const data = repData.get(lead.OwnerId);
    if (data) {
      data.leadsActive++;
      const activityDate = lead.LastActivityDate ? new Date(lead.LastActivityDate) : null;
      if (!activityDate || activityDate < sevenDaysAgo) {
        data.leadsStale7d++;
      }
      if (activityDate && (!data.lastActivity || activityDate > data.lastActivity)) {
        data.lastActivity = activityDate;
      }
    }
  });

  opportunities.forEach((opp) => {
    if (!opp.IsClosed) {
      const data = repData.get(opp.OwnerId);
      if (data) {
        data.oppPipeline++;
        const activityDate = opp.LastActivityDate ? new Date(opp.LastActivityDate) : null;
        if (activityDate && (!data.lastActivity || activityDate > data.lastActivity)) {
          data.lastActivity = activityDate;
        }
      }
    }
  });

  transactions.forEach((trans) => {
    if (trans.Left_Main__Acquisition_Rep__c) {
      const data = repData.get(trans.Left_Main__Acquisition_Rep__c);
      if (data) {
        data.transActive++;
      }
    }
  });

  const repScorecard: RepScore[] = [];
  repData.forEach((data, ownerId) => {
    const name = userMap.get(ownerId) || 'Unknown';
    const stalePercent =
      data.leadsActive > 0 ? (data.leadsStale7d / data.leadsActive) * 100 : 0;
    const daysSinceActivity = data.lastActivity ? daysBetween(data.lastActivity, now) : 999;

    if (data.leadsActive > 0 || data.oppPipeline > 0 || data.transActive > 0) {
      repScorecard.push({
        name,
        ownerId,
        leadsActive: data.leadsActive,
        leadsStale7d: data.leadsStale7d,
        oppPipeline: data.oppPipeline,
        transActive: data.transActive,
        lastActivity: data.lastActivity ? data.lastActivity.toISOString() : null,
        score: calculateScore(stalePercent, daysSinceActivity),
      });
    }
  });

  const scoreOrder = { D: 0, C: 1, B: 2, A: 3 };
  repScorecard.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score]);

  // Build alerts
  const alerts: Alert[] = [];

  if (blockedCount > 0) {
    alerts.push({
      type: 'blocked_transactions',
      severity: 'red',
      message: `${blockedCount} transactions BLOCKED (On Hold / Title Issues / Waiting on Funds)`,
      filterKey: 'blocked',
      filterValue: 'true',
    });
  }

  if (stale14dCount > 0) {
    alerts.push({
      type: 'stale_leads',
      severity: 'red',
      message: `${stale14dCount} leads with no activity in 14+ days`,
      filterKey: 'stale',
      filterValue: '14',
    });
  }

  if (closingSoonCount > 0) {
    alerts.push({
      type: 'closing_soon',
      severity: 'yellow',
      message: `${closingSoonCount} deals closing in 7 days or less`,
      filterKey: 'closingSoon',
      filterValue: 'true',
    });
  }

  const lowActivityReps = repScorecard.filter((r) => r.score === 'D').length;
  if (lowActivityReps > 0) {
    alerts.push({
      type: 'low_activity_reps',
      severity: 'yellow',
      message: `${lowActivityReps} reps with poor activity scores`,
      filterKey: 'score',
      filterValue: 'D',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: 'all_clear',
      severity: 'green',
      message: 'All clear - no urgent issues',
      filterKey: '',
      filterValue: '',
    });
  }

  return {
    leads: {
      byStatus: leadsByStatus,
      total: leads.length,
      stale14d: stale14dCount,
    },
    opportunities: {
      byStage: oppsByStage,
      total: opportunities.length,
      closingSoon: closingSoonCount,
    },
    transactions: {
      byPath: transByPath,
      total: transactions.length,
      blocked: blockedCount,
      closingThisWeek: closingThisWeekCount,
    },
    repScorecard,
    alerts,
    blockedTransactions: blockedTransactions.sort((a, b) => b.daysBlocked - a.daysBlocked),
    lastSync: now.toISOString(),
    dataSource: 'live',
  };
}

export async function GET() {
  try {
    // ── Try cache first ────────────────────────────────────────────────────
    const cached = await tryGetCachedDashboard();
    if (cached) {
      return NextResponse.json(cached);
    }

    // ── Cache miss/stale: query SF live ───────────────────────────────────
    const dashboard = await fetchLiveDashboard();

    // Trigger background sync to refresh cache (fire-and-forget)
    triggerBackgroundSync();

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
