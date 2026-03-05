// Pure analytics functions — compute metrics from raw SF data
// No API calls here, just number crunching

import { differenceInDays, differenceInHours, parseISO } from 'date-fns';
import type { SFLead, SFLeadHistory, SFOpportunity, SFOpportunityHistory, SFTask } from './queries';

// ─── TIME IN STAGE ─────────────────────────────────────────────────────────────

export interface StageTime {
  stage: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}

export function calcLeadTimeInStatus(
  leads: SFLead[],
  history: SFLeadHistory[]
): StageTime[] {
  // Group history by lead
  const byLead: Record<string, SFLeadHistory[]> = {};
  for (const h of history) {
    if (!byLead[h.LeadId]) byLead[h.LeadId] = [];
    byLead[h.LeadId].push(h);
  }

  // Accumulate time per status
  const statusTimes: Record<string, number[]> = {};

  for (const lead of leads) {
    const events = (byLead[lead.Id] || []).sort(
      (a, b) => new Date(a.CreatedDate).getTime() - new Date(b.CreatedDate).getTime()
    );

    // Reconstruct status timeline
    const timeline: { status: string; start: Date; end: Date }[] = [];
    let currentStatus = 'New'; // default first status
    let currentStart = parseISO(lead.CreatedDate);

    for (const event of events) {
      if (event.Field === 'Status') {
        timeline.push({
          status: (event.OldValue as string) || currentStatus,
          start: currentStart,
          end: parseISO(event.CreatedDate),
        });
        currentStatus = event.NewValue as string;
        currentStart = parseISO(event.CreatedDate);
      }
    }

    // Add current status (still open)
    if (!lead.IsConverted) {
      timeline.push({ status: currentStatus, start: currentStart, end: new Date() });
    }

    for (const t of timeline) {
      const days = differenceInDays(t.end, t.start);
      if (!statusTimes[t.status]) statusTimes[t.status] = [];
      statusTimes[t.status].push(days);
    }
  }

  return Object.entries(statusTimes).map(([stage, times]) => ({
    stage,
    avgDays: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    minDays: Math.min(...times),
    maxDays: Math.max(...times),
    count: times.length,
  }));
}

// ─── STALE LEADS ──────────────────────────────────────────────────────────────

export interface StaleLead {
  id: string;
  name: string;
  status: string;
  owner: string;
  ownerId: string;
  daysStale: number;
  lastActivity: string | null;
  createdDate: string;
  phone: string | null;
  email: string | null;
}

export function findStaleLeads(leads: SFLead[], thresholdDays = 7): StaleLead[] {
  const now = new Date();
  return leads
    .filter((l) => !l.IsConverted)
    .map((l) => {
      const lastTouch = l.LastActivityDate
        ? parseISO(l.LastActivityDate)
        : parseISO(l.CreatedDate);
      const daysStale = differenceInDays(now, lastTouch);
      return { ...l, daysStale };
    })
    .filter((l) => l.daysStale >= thresholdDays)
    .map((l) => ({
      id: l.Id,
      name: `${l.FirstName} ${l.LastName}`,
      status: l.Status,
      owner: l.Owner?.Name || 'Unassigned',
      ownerId: l.OwnerId,
      daysStale: l.daysStale,
      lastActivity: l.LastActivityDate,
      createdDate: l.CreatedDate,
      phone: l.Phone,
      email: l.Email,
    }))
    .sort((a, b) => b.daysStale - a.daysStale);
}

// ─── REP PERFORMANCE ──────────────────────────────────────────────────────────

export interface RepStats {
  ownerId: string;
  ownerName: string;
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  avgDaysToConvert: number;
  staleLeads: number;
  activeLeads: number;
  tasksLogged: number;
}

export function calcRepPerformance(
  leads: SFLead[],
  tasks: SFTask[],
  staleDays = 7
): RepStats[] {
  const now = new Date();
  const repMap: Record<string, RepStats> = {};

  for (const lead of leads) {
    const id = lead.OwnerId;
    if (!repMap[id]) {
      repMap[id] = {
        ownerId: id,
        ownerName: lead.Owner?.Name || 'Unknown',
        totalLeads: 0,
        convertedLeads: 0,
        conversionRate: 0,
        avgDaysToConvert: 0,
        staleLeads: 0,
        activeLeads: 0,
        tasksLogged: 0,
      };
    }
    const rep = repMap[id];
    rep.totalLeads++;

    if (lead.IsConverted && lead.ConvertedDate) {
      rep.convertedLeads++;
      rep.avgDaysToConvert =
        (rep.avgDaysToConvert * (rep.convertedLeads - 1) +
          differenceInDays(parseISO(lead.ConvertedDate), parseISO(lead.CreatedDate))) /
        rep.convertedLeads;
    } else {
      rep.activeLeads++;
      const lastTouch = lead.LastActivityDate
        ? parseISO(lead.LastActivityDate)
        : parseISO(lead.CreatedDate);
      if (differenceInDays(now, lastTouch) >= staleDays) rep.staleLeads++;
    }
  }

  // Count tasks per owner
  for (const task of tasks) {
    if (repMap[task.OwnerId]) repMap[task.OwnerId].tasksLogged++;
  }

  // Final conversion rates
  for (const rep of Object.values(repMap)) {
    rep.conversionRate =
      rep.totalLeads > 0 ? Math.round((rep.convertedLeads / rep.totalLeads) * 100) : 0;
    rep.avgDaysToConvert = Math.round(rep.avgDaysToConvert);
  }

  return Object.values(repMap).sort((a, b) => b.totalLeads - a.totalLeads);
}

// ─── PIPELINE SUMMARY ─────────────────────────────────────────────────────────

export interface PipelineSummary {
  totalLeads: number;
  activeLeads: number;
  convertedLeads: number;
  conversionRate: number;
  totalOpportunities: number;
  openOpportunities: number;
  wonOpportunities: number;
  totalPipelineValue: number;
  avgDaysInPipeline: number;
  staleLeads7d: number;
  staleLeads14d: number;
  staleLeads30d: number;
}

export function buildPipelineSummary(
  leads: SFLead[],
  opportunities: SFOpportunity[]
): PipelineSummary {
  const now = new Date();
  const active = leads.filter((l) => !l.IsConverted);
  const converted = leads.filter((l) => l.IsConverted);
  const openOpps = opportunities.filter((o) => !o.IsClosed);
  const wonOpps = opportunities.filter((o) => o.IsWon);

  const stale = (days: number) =>
    active.filter((l) => {
      const last = l.LastActivityDate ? parseISO(l.LastActivityDate) : parseISO(l.CreatedDate);
      return differenceInDays(now, last) >= days;
    }).length;

  const avgDays =
    active.length > 0
      ? Math.round(
          active.reduce((sum, l) => sum + differenceInDays(now, parseISO(l.CreatedDate)), 0) /
            active.length
        )
      : 0;

  return {
    totalLeads: leads.length,
    activeLeads: active.length,
    convertedLeads: converted.length,
    conversionRate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
    totalOpportunities: opportunities.length,
    openOpportunities: openOpps.length,
    wonOpportunities: wonOpps.length,
    totalPipelineValue: openOpps.reduce((sum, o) => sum + (o.Amount || 0), 0),
    avgDaysInPipeline: avgDays,
    staleLeads7d: stale(7),
    staleLeads14d: stale(14),
    staleLeads30d: stale(30),
  };
}

// ─── TREND DATA (from Supabase snapshots) ─────────────────────────────────────

export interface TrendPoint {
  date: string;
  activeLeads: number;
  convertedLeads: number;
  openOpportunities: number;
  pipelineValue: number;
}
