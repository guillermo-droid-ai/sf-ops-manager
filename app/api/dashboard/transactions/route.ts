import { NextResponse } from 'next/server';
import { fetchAllTransactions, fetchUserMap } from '@/lib/queries';
import { 
  computeTransactionStats, 
  computeTransactionPathBreakdown, 
  computeBlockedDeals,
  computeActiveTransactions,
  computeClosingSoon 
} from '@/lib/analytics';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { TransactionsDashboardData } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Fetch all transactions and user map from Salesforce
    const [transactions, userMap] = await Promise.all([
      fetchAllTransactions(),
      fetchUserMap()
    ]);
    
    // Compute analytics
    const stats = computeTransactionStats(transactions, userMap);
    const pathBreakdown = computeTransactionPathBreakdown(transactions);
    const blockedDeals = computeBlockedDeals(transactions, userMap);
    const activeDeals = computeActiveTransactions(transactions, userMap);
    const closingSoon = computeClosingSoon(transactions, userMap, 14);
    
    // Get last sync time
    const supabase = getSupabaseAdmin();
    const { data: syncLog } = await supabase
      .from('sync_log')
      .select('completed_at')
      .eq('sync_type', 'transactions')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const response: TransactionsDashboardData = {
      stats,
      pathBreakdown,
      blockedDeals,
      activeDeals,
      closingSoon,
      lastSynced: syncLog?.completed_at || null
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching transactions dashboard:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions data' },
      { status: 500 }
    );
  }
}
