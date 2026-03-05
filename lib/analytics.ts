// Analytics and data processing for dashboard
import { differenceInDays } from 'date-fns';
import type {
  SFLead, SFOpportunity, SFTransaction,
  LeadStats, LeadStatusBreakdown, LeadRepStats, StaleLead,
  OppStats, OppStageBreakdown, OppRepStats, StuckDeal,
  TransactionStats, TransactionPathBreakdown, BlockedDeal, ActiveTransaction, ClosingSoonDeal
} from './types';

// ============ LEAD ANALYTICS ============

const LEAD_STATUS_ORDER = ['New', 'Working', 'Follow Up', 'Qualified', 'Offer', 'Appointment', 'Realtor Referral', 'Unqualified'];

const BLOCKED_TRANSACTION_PATHS = ['On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'];
const CLOSED_TRANSACTION_PATHS = ['Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'];

export function computeLeadStats(leads: SFLead[]): LeadStats {
  const activeLeads = leads.filter(l => !l.IsConverted);
  
  const statusCounts: Record<string, number> = {};
  for (const lead of activeLeads) {
    statusCounts[lead.Status] = (statusCounts[lead.Status] || 0) + 1;
  }
  
  const hotLeads = (statusCounts['New'] || 0) + (statusCounts['Working'] || 0);
  const pipelineLeads = (statusCounts['Qualified'] || 0) + (statusCounts['Offer'] || 0) + (statusCounts['Appointment'] || 0);
  const unqualified = statusCounts['Unqualified'] || 0;
  
  // Unassigned = no activity in 14+ days and not unqualified
  const unassigned = activeLeads.filter(l => {
    if (l.Status === 'Unqualified') return false;
    if (!l.LastActivityDate) return true;
    return differenceInDays(new Date(), new Date(l.LastActivityDate)) > 14;
  }).length;
  
  return {
    totalActive: activeLeads.length,
    hotLeads,
    pipelineLeads,
    unqualified,
    unassigned
  };
}

export function computeLeadStatusBreakdown(leads: SFLead[]): LeadStatusBreakdown[] {
  const activeLeads = leads.filter(l => !l.IsConverted);
  const byStatus: Record<string, SFLead[]> = {};
  
  for (const lead of activeLeads) {
    if (!byStatus[lead.Status]) byStatus[lead.Status] = [];
    byStatus[lead.Status].push(lead);
  }
  
  const breakdown: LeadStatusBreakdown[] = [];
  
  for (const status of LEAD_STATUS_ORDER) {
    const statusLeads = byStatus[status] || [];
    if (statusLeads.length === 0) continue;
    
    // Calculate avg days in status (using CreatedDate as proxy)
    const avgDays = statusLeads.reduce((sum, l) => {
      return sum + differenceInDays(new Date(), new Date(l.CreatedDate));
    }, 0) / statusLeads.length;
    
    // Get top 3 reps
    const repCounts: Record<string, number> = {};
    for (const lead of statusLeads) {
      const repName = lead.Owner?.Name || 'Unknown';
      repCounts[repName] = (repCounts[repName] || 0) + 1;
    }
    
    const topReps = Object.entries(repCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
    
    // Determine color
    let color: 'green' | 'yellow' | 'red' = 'green';
    if (status === 'Unqualified') {
      color = 'red';
    } else if (status === 'Follow Up' && statusLeads.length > 5000) {
      color = 'yellow';
    }
    
    breakdown.push({
      status,
      count: statusLeads.length,
      avgDaysInStatus: Math.round(avgDays),
      topReps,
      color
    });
  }
  
  return breakdown;
}

export function computeLeadRepStats(leads: SFLead[]): LeadRepStats[] {
  const activeLeads = leads.filter(l => !l.IsConverted);
  const byRep: Record<string, SFLead[]> = {};
  
  for (const lead of activeLeads) {
    const repName = lead.Owner?.Name || 'Unknown';
    if (!byRep[repName]) byRep[repName] = [];
    byRep[repName].push(lead);
  }
  
  const stats: LeadRepStats[] = [];
  
  for (const [repName, repLeads] of Object.entries(byRep)) {
    const statusCounts: Record<string, number> = {};
    for (const lead of repLeads) {
      statusCounts[lead.Status] = (statusCounts[lead.Status] || 0) + 1;
    }
    
    // Calculate avg days without activity
    let totalDaysNoActivity = 0;
    let countWithActivity = 0;
    let lastActivity: Date | null = null;
    
    for (const lead of repLeads) {
      if (lead.LastActivityDate) {
        const activityDate = new Date(lead.LastActivityDate);
        totalDaysNoActivity += differenceInDays(new Date(), activityDate);
        countWithActivity++;
        if (!lastActivity || activityDate > lastActivity) {
          lastActivity = activityDate;
        }
      }
    }
    
    const avgDaysNoActivity = countWithActivity > 0 ? Math.round(totalDaysNoActivity / countWithActivity) : 999;
    const unqualifiedCount = statusCounts['Unqualified'] || 0;
    
    stats.push({
      repName,
      totalAssigned: repLeads.length,
      newCount: statusCounts['New'] || 0,
      workingCount: statusCounts['Working'] || 0,
      qualifiedCount: statusCounts['Qualified'] || 0,
      offerCount: statusCounts['Offer'] || 0,
      unqualifiedCount,
      avgDaysNoActivity,
      lastActivity: lastActivity?.toISOString() || null,
      isWarning: unqualifiedCount > 50 || avgDaysNoActivity > 7
    });
  }
  
  return stats.sort((a, b) => b.totalAssigned - a.totalAssigned);
}

export function computeStaleLeads(leads: SFLead[], daysSinceActivity: number): StaleLead[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSinceActivity);
  
  return leads
    .filter(l => !l.IsConverted && l.Status !== 'Unqualified')
    .filter(l => {
      if (!l.LastActivityDate) return true;
      return new Date(l.LastActivityDate) < cutoff;
    })
    .map(l => ({
      id: l.Id,
      name: l.Name,
      status: l.Status,
      repName: l.Owner?.Name || 'Unknown',
      daysSinceActivity: l.LastActivityDate 
        ? differenceInDays(new Date(), new Date(l.LastActivityDate))
        : 999,
      phone: l.Phone || null,
      email: l.Email || null
    }))
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
    .slice(0, 100);
}

// ============ OPPORTUNITY ANALYTICS ============

const OPP_STAGE_ORDER = [
  'Appointment', 'Appointment Set', 'Pending Appointment', 'Convert Lead',
  'Negotiation', 'Offer', 'Contract Signed', 'Follow-up', 'Long Term Followup',
  'Podio Deals', 'Closed Lost'
];

export function computeOppStats(opps: SFOpportunity[]): OppStats {
  const openOpps = opps.filter(o => !o.IsClosed);
  const activeOpps = openOpps.filter(o => o.StageName !== 'Podio Deals');
  
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const closedThisMonth = opps.filter(o => 
    o.IsClosed && new Date(o.CloseDate) >= firstOfMonth
  );
  
  const closedWonMonth = closedThisMonth.filter(o => o.IsWon).length;
  const closedLostMonth = closedThisMonth.filter(o => !o.IsWon).length;
  
  const pipelineValue = activeOpps.reduce((sum, o) => sum + (o.Amount || 0), 0);
  
  return {
    totalOpen: openOpps.length,
    activePipeline: activeOpps.length,
    closedWonMonth,
    closedLostMonth,
    pipelineValue
  };
}

export function computeOppStageBreakdown(opps: SFOpportunity[]): OppStageBreakdown[] {
  const byStage: Record<string, SFOpportunity[]> = {};
  
  for (const opp of opps) {
    if (!byStage[opp.StageName]) byStage[opp.StageName] = [];
    byStage[opp.StageName].push(opp);
  }
  
  const breakdown: OppStageBreakdown[] = [];
  
  // First add stages in order
  for (const stage of OPP_STAGE_ORDER) {
    const stageOpps = byStage[stage];
    if (!stageOpps) continue;
    
    const value = stageOpps.reduce((sum, o) => sum + (o.Amount || 0), 0);
    
    breakdown.push({
      stage,
      count: stageOpps.length,
      value,
      isGraveyard: stage === 'Podio Deals',
      isWarning: stage === 'Closed Lost'
    });
    
    delete byStage[stage];
  }
  
  // Add any remaining stages not in the order list
  for (const [stage, stageOpps] of Object.entries(byStage)) {
    const value = stageOpps.reduce((sum, o) => sum + (o.Amount || 0), 0);
    breakdown.push({
      stage,
      count: stageOpps.length,
      value,
      isGraveyard: false,
      isWarning: false
    });
  }
  
  return breakdown;
}

export function computeOppRepStats(opps: SFOpportunity[]): OppRepStats[] {
  const byRep: Record<string, SFOpportunity[]> = {};
  
  for (const opp of opps) {
    const repName = opp.Owner?.Name || 'Unknown';
    if (!byRep[repName]) byRep[repName] = [];
    byRep[repName].push(opp);
  }
  
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const stats: OppRepStats[] = [];
  
  for (const [repName, repOpps] of Object.entries(byRep)) {
    const closedOpps = repOpps.filter(o => o.IsClosed);
    const wonOpps = closedOpps.filter(o => o.IsWon);
    const openOpps = repOpps.filter(o => !o.IsClosed && o.StageName !== 'Podio Deals');
    
    const closingRate = closedOpps.length > 0 
      ? Math.round((wonOpps.length / closedOpps.length) * 100) 
      : 0;
    
    // Avg days to close
    let totalDaysToClose = 0;
    for (const opp of wonOpps) {
      totalDaysToClose += differenceInDays(new Date(opp.CloseDate), new Date(opp.CreatedDate));
    }
    const avgDaysToClose = wonOpps.length > 0 ? Math.round(totalDaysToClose / wonOpps.length) : 0;
    
    const pipelineValue = openOpps.reduce((sum, o) => sum + (o.Amount || 0), 0);
    
    const closedWonMonth = wonOpps.filter(o => new Date(o.CloseDate) >= firstOfMonth).length;
    
    stats.push({
      repName,
      totalOpps: repOpps.length,
      closingRate,
      avgDaysToClose,
      pipelineValue,
      closedWonMonth
    });
  }
  
  return stats.sort((a, b) => b.totalOpps - a.totalOpps);
}

export function computeStuckDeals(opps: SFOpportunity[], daysThreshold: number = 30): StuckDeal[] {
  const today = new Date();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);
  
  const stuck: StuckDeal[] = [];
  
  for (const opp of opps) {
    if (opp.IsClosed || opp.StageName === 'Podio Deals') continue;
    
    const activityDate = opp.LastActivityDate ? new Date(opp.LastActivityDate) : new Date(opp.CreatedDate);
    const daysInStage = differenceInDays(today, activityDate);
    
    const isPastDue = opp.CloseDate && new Date(opp.CloseDate) < today;
    
    if (daysInStage >= daysThreshold || isPastDue) {
      stuck.push({
        id: opp.Id,
        name: opp.Name,
        stage: opp.StageName,
        repName: opp.Owner?.Name || 'Unknown',
        daysInStage,
        closeDate: opp.CloseDate,
        isPastDue: !!isPastDue,
        amount: opp.Amount
      });
    }
  }
  
  return stuck.sort((a, b) => {
    if (a.isPastDue !== b.isPastDue) return a.isPastDue ? -1 : 1;
    return b.daysInStage - a.daysInStage;
  }).slice(0, 50);
}

// ============ TRANSACTION ANALYTICS ============

const TRANSACTION_PATH_ORDER = [
  'New Contract', 'On Hold', 'Memoed', 'Need Dispo Decision', 'Marketing',
  'Showings/Inspections', 'Buyers Found', 'Accepted Offer/Assigned',
  'Documents sent to Title', 'Title search completed', 'Title Issues',
  'Clear to Close', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign',
  'Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'
];

export function computeTransactionStats(transactions: SFTransaction[], userMap: Map<string, string>): TransactionStats {
  const activeTransactions = transactions.filter(t => !CLOSED_TRANSACTION_PATHS.includes(t.Left_Main__Path__c));
  const blockedTransactions = transactions.filter(t => BLOCKED_TRANSACTION_PATHS.includes(t.Left_Main__Path__c));
  
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  
  const closingThisWeek = activeTransactions.filter(t => {
    if (!t.Left_Main__Closing_Date__c) return false;
    const closeDate = new Date(t.Left_Main__Closing_Date__c);
    return closeDate >= today && closeDate <= weekFromNow;
  }).length;
  
  const pipelineValue = activeTransactions.reduce((sum, t) => 
    sum + (t.Left_Main__Contract_Assignment_Price__c || 0), 0
  );
  
  // Closed/Won this month
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const closedWonThisMonth = transactions.filter(t => {
    if (t.Left_Main__Path__c !== 'Closed/Won') return false;
    if (!t.Left_Main__Closing_Date__c) return false;
    return new Date(t.Left_Main__Closing_Date__c) >= firstOfMonth;
  });
  
  const closedWonMonthValue = closedWonThisMonth.reduce((sum, t) => 
    sum + (t.Left_Main__Contract_Assignment_Price__c || 0), 0
  );
  
  return {
    activeCount: activeTransactions.length,
    blockedCount: blockedTransactions.length,
    closingThisWeek,
    pipelineValue,
    closedWonMonth: closedWonThisMonth.length,
    closedWonMonthValue
  };
}

export function computeTransactionPathBreakdown(transactions: SFTransaction[]): TransactionPathBreakdown[] {
  const byPath: Record<string, SFTransaction[]> = {};
  
  for (const t of transactions) {
    const path = t.Left_Main__Path__c || 'Unknown';
    if (!byPath[path]) byPath[path] = [];
    byPath[path].push(t);
  }
  
  const breakdown: TransactionPathBreakdown[] = [];
  
  for (const path of TRANSACTION_PATH_ORDER) {
    const pathTransactions = byPath[path];
    if (!pathTransactions) continue;
    
    const value = pathTransactions.reduce((sum, t) => 
      sum + (t.Left_Main__Contract_Assignment_Price__c || 0), 0
    );
    
    breakdown.push({
      path,
      count: pathTransactions.length,
      value,
      isBlocked: BLOCKED_TRANSACTION_PATHS.includes(path)
    });
    
    delete byPath[path];
  }
  
  // Add any remaining paths
  for (const [path, pathTransactions] of Object.entries(byPath)) {
    const value = pathTransactions.reduce((sum, t) => 
      sum + (t.Left_Main__Contract_Assignment_Price__c || 0), 0
    );
    breakdown.push({
      path,
      count: pathTransactions.length,
      value,
      isBlocked: BLOCKED_TRANSACTION_PATHS.includes(path)
    });
  }
  
  return breakdown;
}

export function computeBlockedDeals(transactions: SFTransaction[], userMap: Map<string, string>): BlockedDeal[] {
  const blocked = transactions.filter(t => BLOCKED_TRANSACTION_PATHS.includes(t.Left_Main__Path__c));
  
  return blocked.map(t => {
    const createdDate = new Date(t.CreatedDate);
    const daysBlocked = differenceInDays(new Date(), createdDate);
    
    return {
      id: t.Id,
      propertyAddress: t.Name,
      acqRepName: t.Left_Main__Acquisition_Rep__c 
        ? (userMap.get(t.Left_Main__Acquisition_Rep__c) || 'Unknown')
        : 'Unassigned',
      dispoRepName: t.Left_Main__Dispositions_Rep__c
        ? (userMap.get(t.Left_Main__Dispositions_Rep__c) || 'Unknown')
        : 'Unassigned',
      daysBlocked,
      dispoDecision: t.Left_Main__Disposition_Decision__c,
      contractPrice: t.Left_Main__Contract_Assignment_Price__c,
      pathStage: t.Left_Main__Path__c
    };
  }).sort((a, b) => b.daysBlocked - a.daysBlocked);
}

export function computeActiveTransactions(transactions: SFTransaction[], userMap: Map<string, string>): ActiveTransaction[] {
  const active = transactions.filter(t => !CLOSED_TRANSACTION_PATHS.includes(t.Left_Main__Path__c));
  const today = new Date();
  
  return active.map(t => {
    const activityDate = t.LastActivityDate 
      ? new Date(t.LastActivityDate) 
      : new Date(t.CreatedDate);
    const daysInStage = differenceInDays(today, activityDate);
    
    let status: 'overdue' | 'urgent' | 'ok' = 'ok';
    if (t.Left_Main__Closing_Date__c) {
      const closeDate = new Date(t.Left_Main__Closing_Date__c);
      const daysUntilClose = differenceInDays(closeDate, today);
      if (daysUntilClose < 0) {
        status = 'overdue';
      } else if (daysUntilClose < 7) {
        status = 'urgent';
      }
    }
    
    return {
      id: t.Id,
      propertyAddress: t.Name,
      pathStage: t.Left_Main__Path__c,
      dispoDecision: t.Left_Main__Disposition_Decision__c,
      acqRepName: t.Left_Main__Acquisition_Rep__c 
        ? (userMap.get(t.Left_Main__Acquisition_Rep__c) || 'Unknown')
        : 'Unassigned',
      dispoRepName: t.Left_Main__Dispositions_Rep__c
        ? (userMap.get(t.Left_Main__Dispositions_Rep__c) || 'Unknown')
        : 'Unassigned',
      daysInStage,
      closingDate: t.Left_Main__Closing_Date__c,
      contractPrice: t.Left_Main__Contract_Assignment_Price__c,
      status
    };
  }).sort((a, b) => {
    // Sort: overdue first, then urgent, then by days in stage
    const statusOrder = { overdue: 0, urgent: 1, ok: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return b.daysInStage - a.daysInStage;
  });
}

export function computeClosingSoon(transactions: SFTransaction[], userMap: Map<string, string>, days: number = 14): ClosingSoonDeal[] {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  const closing = transactions
    .filter(t => !CLOSED_TRANSACTION_PATHS.includes(t.Left_Main__Path__c))
    .filter(t => {
      if (!t.Left_Main__Closing_Date__c) return false;
      const closeDate = new Date(t.Left_Main__Closing_Date__c);
      return closeDate >= today && closeDate <= futureDate;
    });
  
  return closing.map(t => {
    const closeDate = new Date(t.Left_Main__Closing_Date__c!);
    const daysUntilClose = differenceInDays(closeDate, today);
    
    return {
      id: t.Id,
      propertyAddress: t.Name,
      closingDate: t.Left_Main__Closing_Date__c!,
      daysUntilClose,
      dispoDecision: t.Left_Main__Disposition_Decision__c,
      contractPrice: t.Left_Main__Contract_Assignment_Price__c,
      acqRepName: t.Left_Main__Acquisition_Rep__c 
        ? (userMap.get(t.Left_Main__Acquisition_Rep__c) || 'Unknown')
        : 'Unassigned',
      dispoRepName: t.Left_Main__Dispositions_Rep__c
        ? (userMap.get(t.Left_Main__Dispositions_Rep__c) || 'Unknown')
        : 'Unassigned'
    };
  }).sort((a, b) => a.daysUntilClose - b.daysUntilClose);
}

// ============ UTILITY ============

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
