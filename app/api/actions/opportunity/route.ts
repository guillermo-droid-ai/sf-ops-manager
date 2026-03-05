import { NextRequest, NextResponse } from 'next/server';
import { sfUpdate, sfDelete } from '@/lib/salesforce';

interface UpdateOppBody {
  id: string;
  stageName?: string;
  ownerId?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateOppBody;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing opportunity id' }, { status: 400 });
    }

    const fields: Record<string, string> = {};
    if (body.stageName) fields.StageName = body.stageName;
    if (body.ownerId) fields.OwnerId = body.ownerId;

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await sfUpdate('Opportunity', body.id, fields);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update opportunity error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update opportunity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string };

    if (!body.id) {
      return NextResponse.json({ error: 'Missing opportunity id' }, { status: 400 });
    }

    await sfDelete('Opportunity', body.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete opportunity error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete opportunity' },
      { status: 500 }
    );
  }
}
