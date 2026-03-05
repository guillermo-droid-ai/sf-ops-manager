import { NextResponse } from 'next/server';
import { fetchAllOpportunities } from '@/lib/queries';
import { 
  computeOppStats, 
  computeOppStageBreakdown, 
  computeOppRepStats,
  computeStuckDeals 
} from '@/lib/analytics';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { OppsDashboardData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const stuckDays = parseInt(searchParams.get('stuckDays') || '30', 10);
    
    // Fetch all opportunities from Salesforce
    const opps = await fetchAllOpportunities();
    
    // Compute analytics
    const stats = computeOppStats(opps);
    const stageBreakdown = computeOppStageBreakdown(opps);
    const repStats = computeOppRepStats(opps);
    const stuckDeals = computeStuckDeals(opps, stuckDays);
    
    // Get last sync time
    const supabase = getSupabaseAdmin();
    const { data: syncLog } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('sync_type', 'opportunities')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const response: OppsDashboardData = {
      stats,
      stageBreakdown,
      repStats,
      stuckDeals,
      lastSynced: syncLog?.completed_at || null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching opportunities dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch opportunities data' },
      { status: 500 }
    );
  }
}
