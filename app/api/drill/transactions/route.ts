import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';

interface DrillTransaction {
  Id: string;
  Name: string;
  Left_Main__Path__c: string | null;
  Left_Main__Dispo_Status__c: string | null;
  Left_Main__Disposition_Decision__c: string | null;
  Left_Main__Acquisition_Rep__c: string | null;
  Left_Main__Dispositions_Rep__c: string | null;
  OwnerId: string;
  Owner?: { Name: string };
  CreatedDate: string;
  LastActivityDate: string | null;
  Left_Main__Contract_Assignment_Price__c: number | null;
  Left_Main__Closing_Date__c: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = [];
    if (path) {
      conditions.push(`Left_Main__Path__c = '${path.replace(/'/g, "\\'")}'`);
    }
    if (ownerId) {
      conditions.push(`OwnerId = '${ownerId.replace(/'/g, "\\'")}'`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countSoql = `SELECT COUNT() FROM Left_Main__Transactions__c ${whereClause}`;
    const totalCount = await sfQueryCount(countSoql);

    // Get paginated records
    const soql = `
      SELECT Id, Name, Left_Main__Path__c, Left_Main__Dispo_Status__c, 
             Left_Main__Disposition_Decision__c, Left_Main__Acquisition_Rep__c,
             Left_Main__Dispositions_Rep__c, OwnerId, Owner.Name, CreatedDate,
             LastActivityDate, Left_Main__Contract_Assignment_Price__c, Left_Main__Closing_Date__c
      FROM Left_Main__Transactions__c
      ${whereClause}
      ORDER BY LastActivityDate ASC NULLS FIRST
      LIMIT ${limit} OFFSET ${offset}
    `.trim();

    const txs = await sfQuery<DrillTransaction>(soql);

    // Transform for response
    const records = txs.map((tx) => ({
      id: tx.Id,
      name: tx.Name,
      path: tx.Left_Main__Path__c || '',
      dispoStatus: tx.Left_Main__Dispo_Status__c || '',
      dispoDecision: tx.Left_Main__Disposition_Decision__c || '',
      acqRep: tx.Left_Main__Acquisition_Rep__c || '',
      dispoRep: tx.Left_Main__Dispositions_Rep__c || '',
      ownerId: tx.OwnerId,
      ownerName: tx.Owner?.Name || 'Unknown',
      createdDate: tx.CreatedDate,
      lastActivityDate: tx.LastActivityDate,
      contractPrice: tx.Left_Main__Contract_Assignment_Price__c,
      closingDate: tx.Left_Main__Closing_Date__c,
      daysSinceActivity: tx.LastActivityDate
        ? Math.floor((Date.now() - new Date(tx.LastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
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
    console.error('Drill transactions error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
