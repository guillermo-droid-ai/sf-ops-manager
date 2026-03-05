import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';
import type { SFTransaction, SFUser, DrillTransactionRecord, DrillResponse } from '@/lib/types';

const BLOCKED_PATHS = [
  'On Hold',
  'Title Issues', 
  'Waiting on Funds',
  'Cancellation Sent - Waiting to Sign'
];

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    const blocked = searchParams.get('blocked');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = [];
    
    if (path) {
      conditions.push(`Left_Main__Path__c = '${path.replace(/'/g, "\\'")}'`);
    }
    
    if (blocked === 'true') {
      const blockedConditions = BLOCKED_PATHS.map(p => `Left_Main__Path__c = '${p}'`);
      conditions.push(`(${blockedConditions.join(' OR ')})`);
    }
    
    if (ownerId) {
      conditions.push(`Left_Main__Acquisition_Rep__c = '${ownerId}'`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT() FROM Left_Main__Transactions__c ${whereClause}`;
    const total = await sfQueryCount(countQuery);

    // Get records
    const dataQuery = `
      SELECT Id, Name, Left_Main__Path__c, Left_Main__Acquisition_Rep__c, Left_Main__Dispositions_Rep__c,
             Left_Main__Disposition_Decision__c, Left_Main__Contract_Assignment_Price__c, 
             Left_Main__Closing_Date__c, LastModifiedDate, CreatedDate
      FROM Left_Main__Transactions__c
      ${whereClause}
      ORDER BY LastModifiedDate DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const transactions = await sfQuery<SFTransaction>(dataQuery);
    const now = new Date();

    // Get unique user IDs for name resolution
    const userIds = new Set<string>();
    transactions.forEach(t => {
      if (t.Left_Main__Acquisition_Rep__c) userIds.add(t.Left_Main__Acquisition_Rep__c);
      if (t.Left_Main__Dispositions_Rep__c) userIds.add(t.Left_Main__Dispositions_Rep__c);
    });

    // Fetch user names
    const userMap = new Map<string, string>();
    if (userIds.size > 0) {
      const userIdList = Array.from(userIds).map(id => `'${id}'`).join(',');
      const users = await sfQuery<SFUser>(`SELECT Id, Name FROM User WHERE Id IN (${userIdList})`);
      users.forEach(u => userMap.set(u.Id, u.Name));
    }

    const records: DrillTransactionRecord[] = transactions.map(trans => {
      const daysInStage = daysBetween(new Date(trans.LastModifiedDate), now);

      return {
        id: trans.Id,
        propertyAddress: trans.Name,
        pathStage: trans.Left_Main__Path__c,
        dispoDecision: trans.Left_Main__Disposition_Decision__c,
        acqRepName: trans.Left_Main__Acquisition_Rep__c ? userMap.get(trans.Left_Main__Acquisition_Rep__c) || null : null,
        dispoRepName: trans.Left_Main__Dispositions_Rep__c ? userMap.get(trans.Left_Main__Dispositions_Rep__c) || null : null,
        daysInStage,
        closingDate: trans.Left_Main__Closing_Date__c,
        contractPrice: trans.Left_Main__Contract_Assignment_Price__c
      };
    });

    const response: DrillResponse<DrillTransactionRecord> = {
      records,
      total,
      page
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Drill transactions API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
