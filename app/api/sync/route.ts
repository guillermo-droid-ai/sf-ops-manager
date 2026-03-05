// POST /api/sync — pulls fresh data from Salesforce and stores snapshot in Supabase
// Called by Vercel Cron every 30 minutes
// Protected by CRON_SECRET header

import { NextRequest, NextResponse } from 'next/server';
import { getActiveLeads, getLeadStatusHistory, getOpportunities, getTransactions, getRecentTasks, getActiveUsers } from '@/lib/queries';
import { buildPipelineSummary, findStaleLeads, calcRepPerformance, calcLeadTimeInStatus } from '@/lib/analytics';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  // Auth check
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getSupabaseAdmin();

    // 1. Pull from Salesforce
    const [leads, leadHistory, opportunities, transactions, tasks, users] = await Promise.all([
      getActiveLeads(),
      getLeadStatusHistory(),
      getOpportunities(),
      getTransactions().catch(() => []), // graceful fail if object name wrong
      getRecentTasks(30),
      getActiveUsers(),
    ]);

    // 2. Compute analytics
    const summary = buildPipelineSummary(leads, opportunities);
    const staleLeads = findStaleLeads(leads, 7);
    const repStats = calcRepPerformance(leads, tasks);
    const timeInStatus = calcLeadTimeInStatus(leads, leadHistory);

    const snapshot = {
      captured_at: new Date().toISOString(),
      summary,
      stale_leads_count: staleLeads.length,
      rep_count: repStats.length,
      lead_count: leads.length,
      opportunity_count: opportunities.length,
      transaction_count: transactions.length,
    };

    // 3. Store snapshot in Supabase for trend tracking
    await db.from('snapshots').insert(snapshot);

    // 4. Upsert current state tables
    if (leads.length > 0) {
      const rows = leads.map((l) => ({
        id: l.Id,
        first_name: l.FirstName,
        last_name: l.LastName,
        status: l.Status,
        owner_id: l.OwnerId,
        owner_name: l.Owner?.Name,
        created_date: l.CreatedDate,
        last_modified: l.LastModifiedDate,
        last_activity: l.LastActivityDate,
        lead_source: l.LeadSource,
        is_converted: l.IsConverted,
        converted_date: l.ConvertedDate,
        phone: l.Phone,
        email: l.Email,
        state: l.State,
        city: l.City,
        synced_at: new Date().toISOString(),
      }));
      // Upsert in batches of 500
      for (let i = 0; i < rows.length; i += 500) {
        await db.from('leads').upsert(rows.slice(i, i + 500), { onConflict: 'id' });
      }
    }

    if (repStats.length > 0) {
      const rows = repStats.map((r) => ({ ...r, synced_at: new Date().toISOString() }));
      await db.from('rep_stats').upsert(rows, { onConflict: 'ownerId' });
    }

    return NextResponse.json({
      ok: true,
      synced: { leads: leads.length, opportunities: opportunities.length, transactions: transactions.length },
      staleLeads: staleLeads.length,
      reps: repStats.length,
    });
  } catch (err: unknown) {
    console.error('Sync error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Also allow GET for manual trigger from dashboard
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return POST(req);
}
