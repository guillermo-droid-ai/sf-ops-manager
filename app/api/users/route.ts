import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';

interface SFUser {
  Id: string;
  Name: string;
}

export async function GET() {
  try {
    const soql = `
      SELECT Id, Name 
      FROM User 
      WHERE IsActive = true AND UserType = 'Standard' 
      ORDER BY Name ASC
    `.trim();

    const users = await sfQuery<SFUser>(soql);

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.Id,
        name: u.Name,
      })),
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
