import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';

interface DrillOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string | null;
  OwnerId: string;
  Owner?: { Name: string };
  CreatedDate: string;
  LastActivityDate: string | null;
  IsClosed: boolean;
  IsWon: boolean;
  LeadSource: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stageName = searchParams.get('stageName');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    if (stageName) {
      conditions.push(`StageName = '${stageName.replace(/'/g, "\\'")}'`);
    }
    if (ownerId) {
      conditions.push(`OwnerId = '${ownerId.replace(/'/g, "\\'")}'`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSoql = `SELECT COUNT() FROM Opportunity ${whereClause}`;
    const totalCount = await sfQueryCount(countSoql);

    // Get paginated records
    const soql = `
      SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, Owner.Name,
             CreatedDate, LastActivityDate, IsClosed, IsWon, LeadSource
      FROM Opportunity
      ${whereClause}
      ORDER BY LastActivityDate ASC NULLS FIRST
      LIMIT ${limit} OFFSET ${offset}
    `.trim();

    const opps = await sfQuery<DrillOpportunity>(soql);

    // Transform for response
    const records = opps.map((opp) => ({
      id: opp.Id,
      name: opp.Name,
      stageName: opp.StageName,
      amount: opp.Amount,
      closeDate: opp.CloseDate,
      ownerId: opp.OwnerId,
      ownerName: opp.Owner?.Name || 'Unknown',
      createdDate: opp.CreatedDate,
      lastActivityDate: opp.LastActivityDate,
      isClosed: opp.IsClosed,
      isWon: opp.IsWon,
      leadSource: opp.LeadSource || '',
      daysInStage: opp.LastActivityDate
        ? Math.floor((Date.now() - new Date(opp.LastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
        : null,
    }));

    return NextResponse.json({
      records,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (err) {
    console.error('Drill opportunities error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}
