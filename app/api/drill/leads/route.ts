import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';
import type { SFLead, DrillLeadRecord, DrillResponse } from '@/lib/types';

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');
    const stale = searchParams.get('stale');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 50;
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = ['IsConverted = false'];
    
    if (status) {
      conditions.push(`Status = '${status.replace(/'/g, "\\'")}'`);
    }
    
    if (ownerId) {
      conditions.push(`OwnerId = '${ownerId}'`);
    }
    
    if (stale === '14') {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      conditions.push(`(LastActivityDate < ${fourteenDaysAgo.toISOString().split('T')[0]} OR LastActivityDate = null)`);
    } else if (stale === '7') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      conditions.push(`(LastActivityDate < ${sevenDaysAgo.toISOString().split('T')[0]} OR LastActivityDate = null)`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT() FROM Lead ${whereClause}`;
    const total = await sfQueryCount(countQuery);

    // Get records
    const dataQuery = `
      SELECT Id, FirstName, LastName, Status, OwnerId, CreatedDate, LastActivityDate, LeadSource, Phone, Email, State
      FROM Lead
      ${whereClause}
      ORDER BY LastActivityDate ASC NULLS FIRST
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    
    const leads = await sfQuery<SFLead>(dataQuery);
    const now = new Date();

    const records: DrillLeadRecord[] = leads.map(lead => {
      const daysSinceActivity = lead.LastActivityDate 
        ? daysBetween(new Date(lead.LastActivityDate), now)
        : null;

      return {
        id: lead.Id,
        name: [lead.FirstName, lead.LastName].filter(Boolean).join(' ') || 'No Name',
        status: lead.Status,
        leadSource: lead.LeadSource,
        state: lead.State,
        daysSinceActivity,
        phone: lead.Phone,
        lastActivityDate: lead.LastActivityDate
      };
    });

    const response: DrillResponse<DrillLeadRecord> = {
      records,
      total,
      page
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Drill leads API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
