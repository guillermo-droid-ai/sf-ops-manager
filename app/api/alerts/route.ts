// GET /api/alerts — AI-generated alerts based on current data
// Returns actionable issues for the ops manager to review

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export interface Alert {
  id: string;
  type: 'stale_lead' | 'stale_opp' | 'no_activity' | 'rep_issue' | 'pipeline_risk';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action?: string;
  recordId?: string;
  repId?: string;
}

export async function GET() {
  try {
    const db = getSupabaseAdmin();
    const alerts: Alert[] = [];

    // Get leads
    const { data: leads } = await db
      .from('leads')
      .select('*')
      .eq('is_converted', false);

    const { data: repStats } = await db
      .from('rep_stats')
      .select('*');

    const now = Date.now();

    // Alert: leads with no activity for 14+ days
    const deadLeads = (leads || []).filter((l) => {
      const last = l.last_activity || l.created_date;
      return Math.floor((now - new Date(last).getTime()) / 86400000) >= 14;
    });

    if (deadLeads.length > 0) {
      alerts.push({
        id: 'dead-leads',
        type: 'stale_lead',
        severity: 'high',
        title: `${deadLeads.length} leads with no activity in 14+ days`,
        message: `These leads are at risk of going cold. Oldest: ${deadLeads[0]?.first_name} ${deadLeads[0]?.last_name} (${Math.floor((now - new Date(deadLeads[0]?.last_activity || deadLeads[0]?.created_date).getTime()) / 86400000)} days)`,
        action: 'Review stale leads and reassign or follow up',
      });
    }

    // Alert: reps with high stale lead counts
    const badReps = (repStats || []).filter((r) => r.staleLeads >= 5);
    for (const rep of badReps) {
      alerts.push({
        id: `rep-stale-${rep.ownerId}`,
        type: 'rep_issue',
        severity: rep.staleLeads >= 10 ? 'high' : 'medium',
        title: `${rep.ownerName} has ${rep.staleLeads} stale leads`,
        message: `${rep.ownerName} has ${rep.staleLeads} leads with no recent activity out of ${rep.totalLeads} total assigned.`,
        action: `Review ${rep.ownerName}'s pipeline`,
        repId: rep.ownerId,
      });
    }

    // Alert: reps with 0 tasks in last 7 days (inactivity)
    const inactiveReps = (repStats || []).filter((r) => r.tasksLogged === 0 && r.activeLeads > 0);
    for (const rep of inactiveReps) {
      alerts.push({
        id: `rep-inactive-${rep.ownerId}`,
        type: 'no_activity',
        severity: 'medium',
        title: `${rep.ownerName} logged 0 activities recently`,
        message: `${rep.ownerName} has ${rep.activeLeads} active leads but no logged calls or tasks in the tracked period.`,
        repId: rep.ownerId,
      });
    }

    // Sort by severity
    const order = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => order[a.severity] - order[b.severity]);

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
