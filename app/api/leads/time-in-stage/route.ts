import { NextResponse } from 'next/server';
import { getActiveLeads, getLeadStatusHistory } from '@/lib/queries';
import { calcLeadTimeInStatus } from '@/lib/analytics';

export async function GET() {
  try {
    const [leads, history] = await Promise.all([
      getActiveLeads(),
      getLeadStatusHistory(),
    ]);
    const stages = calcLeadTimeInStatus(leads, history);
    return NextResponse.json({ stages });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
