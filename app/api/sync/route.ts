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
  BlockedTransaction,
} from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BLOCKED_PATHS = [
  'On Hold',
  'Title Issues',
  'Waiting on Funds',
  'Cancellation Sent - Waiting to Sign',
];

function daysBetween(date1: Date, date2: Date): number {
  return Math.floor(Math.abs(date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

function calculateScore(
  stalePercent: number,
  daysSinceActivity: number
): 'A' | 'B' | 'C' | 'D' {
  if (stalePercent < 10 && daysSinceActivity < 3) return 'A';
  if (stalePercent < 25 && daysSinceActivity < 7) return 'B';
  if (stalePercent < 50 && daysSinceActivity < 14) return 'C';
  return 'D';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function batchUpsert(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  records: Record<string, unknown>[],
  conflictCol: string,
  batchSize = 500
) {
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictCol });
    if (error) throw new Error(`Upsert to ${table} failed: ${error.message}`);
  }
}

export async function POST() {
  const syncStart = Date.now();
  const supabase = getSupabaseAdmin();

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // ── 1. Fetch all data from Salesforce ──────────────────────────────────
    const [leads, opportunities, transactions, users] = await Promise.all([
      sfQuery<{
        Id: string;
        FirstName: string | null;
        LastName: string | null;
        Status: string;
        OwnerId: string;
        CreatedDate: string;
        LastModifiedDate: string;
        LastActivityDate: string | null;
        LeadSource: string | null;
        Phone: string | null;
        Email: string | null;
        State: string | null;
        City: string | null;
      }>(`
        SELECT Id, FirstName, LastName, Status, OwnerId, CreatedDate, LastModifiedDate,
               LastActivityDate, LeadSource, Phone, Email, State, City
        FROM Lead
        WHERE IsConverted = false
      `),

      sfQuery<{
        Id: string;
        Name: string;
        StageName: string;
        Amount: number | null;
        CloseDate: string;
        OwnerId: string;
        CreatedDate: string;
        LastModifiedDate: string;
        LastActivityDate: string | null;
        IsClosed: boolean;
        IsWon: boolean;
        Probability: number | null;
      }>(`
        SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, CreatedDate, LastModifiedDate,
               LastActivityDate, IsClosed, IsWon, Probability
        FROM Opportunity
      `),

      sfQuery<{
        Id: string;
        Name: string;
        Left_Main__Path__c: string | null;
        Left_Main__Acquisition_Rep__c: string | null;
        Left_Main__Dispositions_Rep__c: string | null;
        Left_Main__Disposition_Decision__c: string | null;
        Left_Main__Contract_Assignment_Price__c: number | null;
        Left_Main__Closing_Date__c: string | null;
        LastModifiedDate: string;
        CreatedDate: string;
      }>(`
        SELECT Id, Name, Left_Main__Path__c, Left_Main__Acquisition_Rep__c,
               Left_Main__Dispositions_Rep__c, Left_Main__Disposition_Decision__c,
               Left_Main__Contract_Assignment_Price__c, Left_Main__Closing_Date__c,
               LastModifiedDate, CreatedDate
        FROM Left_Main__Transactions__c
      `),

      sfQuery<{ Id: string; Name: string; IsActive: boolean }>(`
        SELECT Id, Name FROM User WHERE UserType = 'Standard' AND IsActive = true
      `),
    ]);

    // Build user lookup
    const userMap = new Map<string, string>();
    users.forEach((u) => userMap.set(u.Id, u.Name));

    const syncedAt = now.toISOString();

    // ── 2. Upsert leads ────────────────────────────────────────────────────
    const leadRecords = leads.map((lead) => ({
      id: lead.Id,
      first_name: lead.FirstName,
      last_name: lead.LastName,
      status: lead.Status,
      owner_id: lead.OwnerId,
      owner_name: userMap.get(lead.OwnerId) ?? null,
      created_date: lead.CreatedDate,
      last_modified: lead.LastModifiedDate,
      last_activity: lead.LastActivityDate,
      lead_source: lead.LeadSource,
      is_converted: false,
      converted_date: null,
      phone: lead.Phone,
      email: lead.Email,
      state: lead.State,
      city: lead.City,
      synced_at: syncedAt,
    }));
    await batchUpsert(supabase, 'leads', leadRecords, 'id');

    // ── 3. Upsert opportunities ────────────────────────────────────────────
    const oppRecords = opportunities.map((opp) => ({
      id: opp.Id,
      name: opp.Name,
      stage_name: opp.StageName,
      amount: opp.Amount,
      close_date: opp.CloseDate,
      owner_id: opp.OwnerId,
      owner_name: userMap.get(opp.OwnerId) ?? null,
      created_date: opp.CreatedDate,
      last_modified: opp.LastModifiedDate,
      last_activity: opp.LastActivityDate,
      is_closed: opp.IsClosed,
      is_won: opp.IsWon,
      probability: opp.Probability,
      synced_at: syncedAt,
    }));
    await batchUpsert(supabase, 'opportunities', oppRecords, 'id');

    // ── 4. Compute rep_stats ───────────────────────────────────────────────
    const repStatsMap = new Map<
      string,
      { ownerName: string; totalLeads: number; staleLeads: number; activeLeads: number }
    >();
    users.forEach((u) =>
      repStatsMap.set(u.Id, { ownerName: u.Name, totalLeads: 0, staleLeads: 0, activeLeads: 0 })
    );

    leads.forEach((lead) => {
      const rep = repStatsMap.get(lead.OwnerId);
      if (!rep) return;
      rep.totalLeads++;
      const activityDate = lead.LastActivityDate ? new Date(lead.LastActivityDate) : null;
      if (!activityDate || activityDate < fourteenDaysAgo) {
        rep.staleLeads++;
      } else {
        rep.activeLeads++;
      }
    });

    const repStatsRecords = Array.from(repStatsMap.entries())
      .filter(([, r]) => r.totalLeads > 0)
      .map(([ownerId, r]) => ({
        ownerId,
        ownerName: r.ownerName,
        totalLeads: r.totalLeads,
        convertedLeads: 0,
        conversionRate: 0,
        avgDaysToConvert: 0,
        staleLeads: r.staleLeads,
        activeLeads: r.activeLeads,
        tasksLogged: 0,
        synced_at: syncedAt,
      }));

    if (repStatsRecords.length > 0) {
      await batchUpsert(supabase, 'rep_stats', repStatsRecords, 'ownerId');
    }

    // ── 5. Compute full dashboard snapshot ────────────────────────────────
    // Leads by status
    const leadStatusCounts = new Map<string, number>();
    let stale14dCount = 0;
    leads.forEach((lead) => {
      const status = lead.Status || 'Unknown';
      leadStatusCounts.set(status, (leadStatusCounts.get(status) || 0) + 1);
      const activityDate = lead.LastActivityDate ? new Date(lead.LastActivityDate) : null;
      if (!activityDate || activityDate < fourteenDaysAgo) stale14dCount++;
    });
    const leadsByStatus: StatusCount[] = Array.from(leadStatusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Opps by stage
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
        if (closeDate <= sevenDaysFromNow && closeDate >= now) closingSoonCount++;
      }
    });
    const oppsByStage: StageCount[] = Array.from(oppStageCounts.entries())
      .map(([stage, data]) => ({ stage, count: data.count, totalAmount: data.totalAmount }))
      .sort((a, b) => b.count - a.count);

    // Transactions by path
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
            ? (userMap.get(trans.Left_Main__Acquisition_Rep__c) ?? null)
            : null,
          dispoRepName: trans.Left_Main__Dispositions_Rep__c
            ? (userMap.get(trans.Left_Main__Dispositions_Rep__c) ?? null)
            : null,
          daysBlocked,
          contractPrice: trans.Left_Main__Contract_Assignment_Price__c,
        });
      }
      if (trans.Left_Main__Closing_Date__c) {
        const closeDate = new Date(trans.Left_Main__Closing_Date__c);
        if (closeDate <= sevenDaysFromNow && closeDate >= now) closingThisWeekCount++;
      }
    });
    const transByPath: PathCount[] = Array.from(transPathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);

    // Rep scorecard
    const repScorecardMap = new Map<
      string,
      {
        leadsActive: number;
        leadsStale7d: number;
        oppPipeline: number;
        transActive: number;
        lastActivity: Date | null;
      }
    >();
    users.forEach((u) =>
      repScorecardMap.set(u.Id, {
        leadsActive: 0,
        leadsStale7d: 0,
        oppPipeline: 0,
        transActive: 0,
        lastActivity: null,
      })
    );

    leads.forEach((lead) => {
      const data = repScorecardMap.get(lead.OwnerId);
      if (!data) return;
      data.leadsActive++;
      const activityDate = lead.LastActivityDate ? new Date(lead.LastActivityDate) : null;
      if (!activityDate || activityDate < sevenDaysAgo) data.leadsStale7d++;
      if (activityDate && (!data.lastActivity || activityDate > data.lastActivity))
        data.lastActivity = activityDate;
    });

    opportunities.forEach((opp) => {
      if (!opp.IsClosed) {
        const data = repScorecardMap.get(opp.OwnerId);
        if (!data) return;
        data.oppPipeline++;
        const activityDate = opp.LastActivityDate ? new Date(opp.LastActivityDate) : null;
        if (activityDate && (!data.lastActivity || activityDate > data.lastActivity))
          data.lastActivity = activityDate;
      }
    });

    transactions.forEach((trans) => {
      if (trans.Left_Main__Acquisition_Rep__c) {
        const data = repScorecardMap.get(trans.Left_Main__Acquisition_Rep__c);
        if (data) data.transActive++;
      }
    });

    const scoreOrder = { D: 0, C: 1, B: 2, A: 3 };
    const repScorecard: RepScore[] = [];
    repScorecardMap.forEach((data, ownerId) => {
      if (data.leadsActive === 0 && data.oppPipeline === 0 && data.transActive === 0) return;
      const name = userMap.get(ownerId) || 'Unknown';
      const stalePercent =
        data.leadsActive > 0 ? (data.leadsStale7d / data.leadsActive) * 100 : 0;
      const daysSinceActivity = data.lastActivity
        ? daysBetween(data.lastActivity, now)
        : 999;
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
    });
    repScorecard.sort((a, b) => scoreOrder[a.score] - scoreOrder[b.score]);

    // Alerts
    const alerts: Alert[] = [];
    if (blockedCount > 0)
      alerts.push({
        type: 'blocked_transactions',
        severity: 'red',
        message: `${blockedCount} transactions BLOCKED (On Hold / Title Issues / Waiting on Funds)`,
        filterKey: 'blocked',
        filterValue: 'true',
      });
    if (stale14dCount > 0)
      alerts.push({
        type: 'stale_leads',
        severity: 'red',
        message: `${stale14dCount} leads with no activity in 14+ days`,
        filterKey: 'stale',
        filterValue: '14',
      });
    if (closingSoonCount > 0)
      alerts.push({
        type: 'closing_soon',
        severity: 'yellow',
        message: `${closingSoonCount} deals closing in 7 days or less`,
        filterKey: 'closingSoon',
        filterValue: 'true',
      });
    const lowActivityReps = repScorecard.filter((r) => r.score === 'D').length;
    if (lowActivityReps > 0)
      alerts.push({
        type: 'low_activity_reps',
        severity: 'yellow',
        message: `${lowActivityReps} reps with poor activity scores`,
        filterKey: 'score',
        filterValue: 'D',
      });
    if (alerts.length === 0)
      alerts.push({
        type: 'all_clear',
        severity: 'green',
        message: 'All clear - no urgent issues',
        filterKey: '',
        filterValue: '',
      });

    const dashboardSnapshot: DashboardData & {
      blockedTransactions: BlockedTransaction[];
      dataSource: 'cache';
    } = {
      leads: { byStatus: leadsByStatus, total: leads.length, stale14d: stale14dCount },
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
      lastSync: syncedAt,
      dataSource: 'cache',
    };

    // ── 6. Insert snapshot ─────────────────────────────────────────────────
    const { error: snapError } = await supabase.from('snapshots').insert({
      captured_at: syncedAt,
      summary: dashboardSnapshot,
      lead_count: leads.length,
      opportunity_count: opportunities.length,
      transaction_count: transactions.length,
      stale_leads_count: stale14dCount,
      rep_count: repStatsRecords.length,
    });
    if (snapError) console.error('Snapshot insert error:', snapError.message);

    const duration = Date.now() - syncStart;
    console.log(
      `Sync complete in ${duration}ms: ${leads.length} leads, ${opportunities.length} opps, ${transactions.length} transactions`
    );

    return NextResponse.json({
      success: true,
      duration,
      counts: {
        leads: leads.length,
        opportunities: opportunities.length,
        transactions: transactions.length,
        reps: repStatsRecords.length,
        staleLeads: stale14dCount,
      },
      snapshotSaved: !snapError,
      timestamp: syncedAt,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('snapshots')
      .select('id, captured_at, lead_count, opportunity_count, transaction_count, stale_leads_count, rep_count')
      .order('captured_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return NextResponse.json({ lastSync: null, message: 'No sync data available' });
    }

    return NextResponse.json({
      lastSync: data.captured_at,
      counts: {
        leads: data.lead_count,
        opportunities: data.opportunity_count,
        transactions: data.transaction_count,
        staleLeads: data.stale_leads_count,
        reps: data.rep_count,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
