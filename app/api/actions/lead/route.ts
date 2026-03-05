import { NextRequest, NextResponse } from 'next/server';
import { sfUpdate, sfDelete } from '@/lib/salesforce';

interface UpdateLeadBody {
  id: string;
  status?: string;
  ownerId?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateLeadBody;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    const fields: Record<string, string> = {};
    if (body.status) fields.Status = body.status;
    if (body.ownerId) fields.OwnerId = body.ownerId;

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await sfUpdate('Lead', body.id, fields);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update lead error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string };

    if (!body.id) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    await sfDelete('Lead', body.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete lead error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
