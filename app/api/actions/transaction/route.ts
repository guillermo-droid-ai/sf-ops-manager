import { NextRequest, NextResponse } from 'next/server';
import { sfUpdate, sfDelete } from '@/lib/salesforce';

interface UpdateTxBody {
  id: string;
  path?: string;
  ownerId?: string;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateTxBody;

    if (!body.id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    const fields: Record<string, string> = {};
    if (body.path) fields.Left_Main__Path__c = body.path;
    if (body.ownerId) fields.OwnerId = body.ownerId;

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await sfUpdate('Left_Main__Transactions__c', body.id, fields);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update transaction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update transaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { id: string };

    if (!body.id) {
      return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });
    }

    await sfDelete('Left_Main__Transactions__c', body.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Delete transaction error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete transaction' },
      { status: 500 }
    );
  }
}
