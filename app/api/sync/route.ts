import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Simple sync endpoint - just validates connection and returns counts
// Dashboard queries Salesforce directly so no caching needed
export async function POST() {
  try {
    // Test connection by querying counts
    const [leadCount, oppCount, transCount] = await Promise.all([
      sfQuery<{ expr0: number }>('SELECT COUNT() FROM Lead WHERE IsConverted = false')
        .then(r => r[0]?.expr0 ?? 0)
        .catch(() => -1),
      sfQuery<{ expr0: number }>('SELECT COUNT() FROM Opportunity')
        .then(r => r[0]?.expr0 ?? 0)
        .catch(() => -1),
      sfQuery<{ expr0: number }>('SELECT COUNT() FROM Left_Main__Transactions__c')
        .then(r => r[0]?.expr0 ?? 0)
        .catch(() => -1)
    ]);

    const success = leadCount >= 0 && oppCount >= 0 && transCount >= 0;

    return NextResponse.json({
      success,
      message: success ? 'Salesforce connection verified' : 'Some queries failed',
      counts: {
        leads: leadCount,
        opportunities: oppCount,
        transactions: transCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed'
      },
      { status: 500 }
    );
  }
}
