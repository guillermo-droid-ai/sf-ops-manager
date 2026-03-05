// GET /api/dashboard — returns full dashboard data from Supabase (cached)
// Fresh data comes from /api/sync (cron job), this just reads the cache

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getActiveLeads, getLeadStatusHistory, getOpportunities, getTransactions, getRecentTasks } from '@/lib/queries';
import { buildPipelineSummary, findStaleLeads, calcRepPerformance, calcLeadTimeInStatus } from '@/lib/analytics';

export async function GET() {
  try {
    const db = getSupabaseAdmin();

    // Get latest snapshot for trend line
    const { data: snapshots } = await db
      .from('snapshots')
      .select('*')
      .order('captured_at', { ascending: false })
      .limit(48); // last 24 hours at 30min intervals

    // Get cached leads
    const { data: cachedLeads } = await db
      .from('leads')
      .select('*')
      .eq('is_converted', false)
      .order('last_modified', { ascending: false })
      .limit(500);

    // Get rep stats
    const { data: repStats } = await db
      .from('rep_stats')
      .select('*')
      .order('totalLeads', { ascending: false });

    // If no cache yet, do a live fetch
    if (!cachedLeads || cachedLeads.length === 0) {
      const [leads, leadHistory, opportunities, tasks] = await Promise.all([
        getActiveLeads(),
        getLeadStatusHistory(),
        getOpportunities(),
        getRecentTasks(30),
      ]);

      const summary = buildPipelineSummary(leads, opportunities);
      const staleLeads = findStaleLeads(leads, 7);
      const reps = calcRepPerformance(leads, tasks);
      const timeInStatus = calcLeadTimeInStatus(leads, leadHistory);

      return NextResponse.json({
        source: 'live',
        summary,
        staleLeads: staleLeads.slice(0, 50),
        repStats: reps,
        timeInStatus,
        trends: [],
      });
    }

    // Use cached data + trend snapshots
    const latestSnap = snapshots?.[0];
    const trends = (snapshots || []).reverse().map((s) => ({
      date: s.captured_at,
      activeLeads: s.lead_count,
      openOpportunities: s.opportunity_count,
      pipelineValue: s.summary?.totalPipelineValue || 0,
      staleLeads: s.stale_leads_count,
    }));

    return NextResponse.json({
      source: 'cache',
      summary: latestSnap?.summary || {},
      staleLeads: cachedLeads
        .filter((l) => {
          const last = l.last_activity || l.created_date;
          const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
          return days >= 7;
        })
        .map((l) => ({
          id: l.id,
          name: `${l.first_name} ${l.last_name}`,
          status: l.status,
          owner: l.owner_name,
          ownerId: l.owner_id,
          daysStale: Math.floor(
            (Date.now() - new Date(l.last_activity || l.created_date).getTime()) / 86400000
          ),
          lastActivity: l.last_activity,
          phone: l.phone,
          email: l.email,
        }))
        .sort((a, b) => b.daysStale - a.daysStale)
        .slice(0, 50),
      repStats: repStats || [],
      trends,
      lastSync: latestSnap?.captured_at || null,
    });
  } catch (err: unknown) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
