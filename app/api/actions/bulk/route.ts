import { NextRequest, NextResponse } from 'next/server';
import { sfUpdate, sfDelete } from '@/lib/salesforce';

interface BulkActionBody {
  type: 'lead' | 'opportunity' | 'transaction';
  ids: string[];
  action: 'status' | 'owner' | 'delete';
  value?: string;
}

const OBJECT_MAP = {
  lead: 'Lead',
  opportunity: 'Opportunity',
  transaction: 'Left_Main__Transactions__c',
} as const;

const STATUS_FIELD_MAP = {
  lead: 'Status',
  opportunity: 'StageName',
  transaction: 'Left_Main__Path__c',
} as const;

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as BulkActionBody;

    if (!body.type || !body.ids || !body.action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (body.ids.length === 0) {
      return NextResponse.json({ error: 'No records selected' }, { status: 400 });
    }

    if (body.ids.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 records at a time' }, { status: 400 });
    }

    if (body.action !== 'delete' && !body.value) {
      return NextResponse.json({ error: 'Missing value for update action' }, { status: 400 });
    }

    const objectType = OBJECT_MAP[body.type];
    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const id of body.ids) {
      try {
        if (body.action === 'delete') {
          await sfDelete(objectType, id);
        } else {
          const fields: Record<string, string> = {};
          if (body.action === 'status') {
            fields[STATUS_FIELD_MAP[body.type]] = body.value!;
          } else if (body.action === 'owner') {
            fields.OwnerId = body.value!;
          }
          await sfUpdate(objectType, id, fields);
        }
        results.push({ id, success: true });
      } catch (err) {
        results.push({
          id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} succeeded, ${failCount} failed`,
      results,
    });
  } catch (err) {
    console.error('Bulk action error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Bulk action failed' },
      { status: 500 }
    );
  }
}
