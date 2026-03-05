import { NextResponse } from 'next/server';
import { fetchAllLeads } from '@/lib/queries';
import { 
  computeLeadStats, 
  computeLeadStatusBreakdown, 
  computeLeadRepStats,
  computeStaleLeads 
} from '@/lib/analytics';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { LeadsDashboardData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const staleDays = parseInt(searchParams.get('staleDays') || '7', 10);
    
    // Fetch all leads from Salesforce
    const leads = await fetchAllLeads();
    
    // Compute analytics
    const stats = computeLeadStats(leads);
    const statusBreakdown = computeLeadStatusBreakdown(leads);
    const repStats = computeLeadRepStats(leads);
    const staleLeads = computeStaleLeads(leads, staleDays);
    
    // Get last sync time
    const supabase = getSupabaseAdmin();
    const { data: syncLog } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('sync_type', 'leads')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const response: LeadsDashboardData = {
      stats,
      statusBreakdown,
      repStats,
      staleLeads,
      lastSynced: syncLog?.completed_at || null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching leads dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads data' },
      { status: 500 }
    );
  }
}
