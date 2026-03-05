import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';
import type { SFOpportunity, DrillOpportunityRecord, DrillResponse } from '@/lib/types';

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stage = searchParams.get('stage');
    const ownerId = searchParams.get('ownerId');
    const closingSoon = searchParams.get('closingSoon');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = [];
    
    if (stage) {
      conditions.push(`StageName = '${stage.replace(/'/g, "\\'")}'`);
    }
    
    if (ownerId) {
      conditions.push(`OwnerId = '${ownerId}'`);
    }
    
    if (closingSoon === 'true') {
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const today = new Date();
      conditions.push(`IsClosed = false`);
      conditions.push(`CloseDate >= ${today.toISOString().split('T')[0]}`);
      conditions.push(`CloseDate <= ${sevenDaysFromNow.toISOString().split('T')[0]}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT() FROM Opportunity ${whereClause}`;
    const total = await sfQueryCount(countQuery);

    // Get records
    const dataQuery = `
      SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, CreatedDate, LastActivityDate, IsClosed, IsWon, LeadSource
      FROM Opportunity
      ${whereClause}
      ORDER BY CloseDate ASC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const opportunities = await sfQuery<SFOpportunity>(dataQuery);
    const now = new Date();

    const records: DrillOpportunityRecord[] = opportunities.map(opp => {
      const closeDate = new Date(opp.CloseDate);
      const daysUntilClose = daysBetween(now, closeDate);

      return {
        id: opp.Id,
        name: opp.Name,
        stage: opp.StageName,
        amount: opp.Amount,
        daysUntilClose,
        closeDate: opp.CloseDate,
        leadSource: opp.LeadSource,
        lastActivityDate: opp.LastActivityDate
      };
    });

    const response: DrillResponse<DrillOpportunityRecord> = {
      records,
      total,
      page
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Drill opportunities API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
