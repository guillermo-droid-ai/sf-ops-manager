import { NextRequest, NextResponse } from 'next/server';
import { sfQuery, sfQueryCount } from '@/lib/salesforce';

interface DrillLead {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Status: string;
  OwnerId: string;
  Owner?: { Name: string };
  CreatedDate: string;
  LastActivityDate: string | null;
  LeadSource: string | null;
  Phone: string | null;
  Email: string | null;
  State: string | null;
  City: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['IsConverted = false'];
    if (status) {
      conditions.push(`Status = '${status.replace(/'/g, "\\'")}'`);
    }
    if (ownerId) {
      conditions.push(`OwnerId = '${ownerId.replace(/'/g, "\\'")}'`);
    }
    const whereClause = conditions.join(' AND ');

    // Get total count
    const countSoql = `SELECT COUNT() FROM Lead WHERE ${whereClause}`;
    const totalCount = await sfQueryCount(countSoql);

    // Get paginated records
    const soql = `
      SELECT Id, FirstName, LastName, Status, OwnerId, Owner.Name, 
             CreatedDate, LastActivityDate, LeadSource, Phone, Email, State, City
      FROM Lead
      WHERE ${whereClause}
      ORDER BY LastActivityDate ASC NULLS FIRST
      LIMIT ${limit} OFFSET ${offset}
    `.trim();

    const leads = await sfQuery<DrillLead>(soql);

    // Transform for response
    const records = leads.map((lead) => ({
      id: lead.Id,
      firstName: lead.FirstName || '',
      lastName: lead.LastName || '',
      name: `${lead.FirstName || ''} ${lead.LastName || ''}`.trim() || '(No Name)',
      status: lead.Status,
      ownerId: lead.OwnerId,
      ownerName: lead.Owner?.Name || 'Unknown',
      createdDate: lead.CreatedDate,
      lastActivityDate: lead.LastActivityDate,
      leadSource: lead.LeadSource || '',
      phone: lead.Phone || '',
      email: lead.Email || '',
      state: lead.State || '',
      city: lead.City || '',
      daysSinceActivity: lead.LastActivityDate
        ? Math.floor((Date.now() - new Date(lead.LastActivityDate).getTime()) / (1000 * 60 * 60 * 24))
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
    console.error('Drill leads error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
