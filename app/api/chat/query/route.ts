// POST /api/chat/query
// Called by Retell mid-conversation as a custom tool
// Accepts a query_type and optional filters, returns live SF data

import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';

interface QueryBody {
  query_type: string;
  rep_name?: string;
  status?: string;
  stage?: string;
  path?: string;
  limit?: number;
}

interface LeadRecord {
  Id: string;
  Name: string;
  Status: string;
  'Owner.Name': string;
  Phone: string;
  Email: string;
  City: string;
  State: string;
  LastActivityDate: string;
  of_Call_Attempts__c: number;
  Last_Offer_Made__c: number;
  CreatedDate: string;
}

interface TxRecord {
  Id: string;
  Name: string;
  Left_Main__Path__c: string;
  Left_Main__Closing_Date__c: string;
  Left_Main__Contract_Assignment_Price__c: number;
  'Left_Main__Acquisition_Rep__r.Name': string;
  'Left_Main__Dispositions_Rep__r.Name': string;
}

interface RepStat {
  'Owner.Name': string;
  cnt: number;
}

export async function POST(req: Request) {
  try {
    const body: QueryBody = await req.json();
    const { query_type, rep_name, status, stage, path, limit = 5 } = body;

    let result = '';

    switch (query_type) {

      case 'stale_leads_by_rep': {
        const where = rep_name
          ? `AND Owner.Name LIKE '%${rep_name.replace(/'/g, "\\'")}%'`
          : '';
        const rows = await sfQuery<LeadRecord>(
          `SELECT Id, Name, Status, Owner.Name, Phone, City, State, LastActivityDate, of_Call_Attempts__c
           FROM Lead
           WHERE IsConverted=false AND LastActivityDate < LAST_N_DAYS:14 ${where}
           ORDER BY LastActivityDate ASC NULLS FIRST
           LIMIT ${limit}`
        );
        if (!rows.length) {
          result = rep_name ? `No stale leads found for ${rep_name}.` : 'No stale leads found.';
        } else {
          result = `Top ${rows.length} stale leads${rep_name ? ` for ${rep_name}` : ''}:\n` +
            rows.map((r, i) => {
              const daysAgo = r.LastActivityDate
                ? Math.floor((Date.now() - new Date(r.LastActivityDate).getTime()) / 86400000)
                : 'unknown';
              return `${i+1}. ${r.Name} — ${r.Status} — ${r.City || '?'}, ${r.State || '?'} — last activity ${daysAgo} days ago — ${r.of_Call_Attempts__c || 0} calls (Rep: ${r['Owner.Name']})`;
            }).join('\n');
        }
        break;
      }

      case 'leads_by_rep': {
        const where = rep_name
          ? `AND Owner.Name LIKE '%${rep_name.replace(/'/g, "\\'")}%'`
          : '';
        const rows = await sfQuery<LeadRecord>(
          `SELECT Id, Name, Status, Phone, Email, City, State, LastActivityDate, of_Call_Attempts__c, Last_Offer_Made__c
           FROM Lead
           WHERE IsConverted=false ${where}
           ORDER BY LastActivityDate ASC NULLS FIRST
           LIMIT ${limit}`
        );
        if (!rows.length) {
          result = `No leads found${rep_name ? ` for ${rep_name}` : ''}.`;
        } else {
          result = `${rows.length} leads${rep_name ? ` for ${rep_name}` : ''}:\n` +
            rows.map((r, i) =>
              `${i+1}. ${r.Name} — ${r.Status} — ${r.City || '?'}, ${r.State || '?'} — ${r.of_Call_Attempts__c || 0} calls${r.Last_Offer_Made__c ? ` — offer $${r.Last_Offer_Made__c.toLocaleString()}` : ''}`
            ).join('\n');
        }
        break;
      }

      case 'leads_by_status': {
        const statusFilter = status ? `AND Status = '${status.replace(/'/g, "\\'")}'` : '';
        const rows = await sfQuery<LeadRecord>(
          `SELECT Id, Name, Status, Owner.Name, Phone, City, State, LastActivityDate, of_Call_Attempts__c
           FROM Lead
           WHERE IsConverted=false ${statusFilter}
           ORDER BY LastActivityDate ASC NULLS FIRST
           LIMIT ${limit}`
        );
        result = rows.length
          ? `${rows.length} leads with status "${status}":\n` +
            rows.map((r, i) =>
              `${i+1}. ${r.Name} — ${r.City || '?'}, ${r.State || '?'} — ${r.of_Call_Attempts__c || 0} calls — Rep: ${r['Owner.Name']}`
            ).join('\n')
          : `No leads found with status "${status}".`;
        break;
      }

      case 'blocked_transactions': {
        const BLOCKED = ['On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'];
        const pathFilter = path ? `'${path}'` : BLOCKED.map(b => `'${b}'`).join(',');
        const rows = await sfQuery<TxRecord>(
          `SELECT Id, Name, Left_Main__Path__c, Left_Main__Closing_Date__c,
                  Left_Main__Contract_Assignment_Price__c,
                  Left_Main__Acquisition_Rep__r.Name, Left_Main__Dispositions_Rep__r.Name
           FROM Left_Main__Transactions__c
           WHERE Left_Main__Path__c IN (${pathFilter})
           ORDER BY Left_Main__Closing_Date__c ASC NULLS LAST
           LIMIT ${limit}`
        );
        result = rows.length
          ? `${rows.length} blocked transactions:\n` +
            rows.map((r, i) => {
              const price = r.Left_Main__Contract_Assignment_Price__c
                ? `$${r.Left_Main__Contract_Assignment_Price__c.toLocaleString()}`
                : 'no price';
              const closing = r.Left_Main__Closing_Date__c || 'no date';
              const acq = r['Left_Main__Acquisition_Rep__r.Name'] || 'unknown';
              return `${i+1}. ${r.Name} — ${r.Left_Main__Path__c} — ${price} — closes ${closing} — Acq: ${acq}`;
            }).join('\n')
          : 'No blocked transactions found.';
        break;
      }

      case 'closing_soon': {
        const rows = await sfQuery<TxRecord>(
          `SELECT Id, Name, Left_Main__Path__c, Left_Main__Closing_Date__c,
                  Left_Main__Contract_Assignment_Price__c,
                  Left_Main__Acquisition_Rep__r.Name, Left_Main__Dispositions_Rep__r.Name
           FROM Left_Main__Transactions__c
           WHERE Left_Main__Closing_Date__c <= NEXT_N_DAYS:7
             AND Left_Main__Path__c NOT IN ('Closed/Won','Closed/Memo','Cancelled Contract/Lost','Closed - Realtor Referral')
           ORDER BY Left_Main__Closing_Date__c ASC
           LIMIT ${limit}`
        );
        result = rows.length
          ? `${rows.length} deals closing in the next 7 days:\n` +
            rows.map((r, i) => {
              const price = r.Left_Main__Contract_Assignment_Price__c
                ? `$${r.Left_Main__Contract_Assignment_Price__c.toLocaleString()}`
                : 'no price';
              return `${i+1}. ${r.Name} — closes ${r.Left_Main__Closing_Date__c} — ${price} — ${r.Left_Main__Path__c}`;
            }).join('\n')
          : 'No deals closing in the next 7 days.';
        break;
      }

      case 'top_reps_by_stale': {
        const rows = await sfQuery<RepStat>(
          `SELECT Owner.Name, COUNT(Id) cnt FROM Lead
           WHERE IsConverted=false AND LastActivityDate < LAST_N_DAYS:14
           GROUP BY Owner.Name ORDER BY COUNT(Id) DESC LIMIT 10`
        );
        result = rows.length
          ? `Reps with most stale leads:\n` +
            rows.map((r, i) => `${i+1}. ${r['Owner.Name']} — ${r.cnt} stale leads`).join('\n')
          : 'No stale lead data found.';
        break;
      }

      case 'opportunities_by_stage': {
        const stageFilter = stage ? `AND StageName = '${stage.replace(/'/g, "\\'")}'` : '';
        const rows = await sfQuery<{ Id: string; Name: string; StageName: string; Amount: number; CloseDate: string; 'Owner.Name': string }>(
          `SELECT Id, Name, StageName, Amount, CloseDate, Owner.Name
           FROM Opportunity
           WHERE IsClosed=false ${stageFilter}
           ORDER BY CloseDate ASC NULLS LAST
           LIMIT ${limit}`
        );
        result = rows.length
          ? `${rows.length} opportunities${stage ? ` in "${stage}"` : ''}:\n` +
            rows.map((r, i) =>
              `${i+1}. ${r.Name} — ${r.StageName} — closes ${r.CloseDate || 'unknown'} — Rep: ${r['Owner.Name']}`
            ).join('\n')
          : `No opportunities found${stage ? ` in "${stage}"` : ''}.`;
        break;
      }

      case 'never_called_leads': {
        const rows = await sfQuery<LeadRecord>(
          `SELECT Id, Name, Status, Owner.Name, Phone, City, State, CreatedDate
           FROM Lead
           WHERE IsConverted=false AND of_Call_Attempts__c = 0 AND Phone != null
           ORDER BY CreatedDate ASC
           LIMIT ${limit}`
        );
        result = rows.length
          ? `Top ${rows.length} leads never called (oldest first, have phone):\n` +
            rows.map((r, i) => {
              const age = Math.floor((Date.now() - new Date(r.CreatedDate).getTime()) / 86400000);
              return `${i+1}. ${r.Name} — ${r.Status} — ${r.City || '?'}, ${r.State || '?'} — ${age} days old — Rep: ${r['Owner.Name']} — ${r.Phone}`;
            }).join('\n')
          : 'No uncalled leads with phones found.';
        break;
      }

      default:
        result = `Unknown query type: ${query_type}. Available types: stale_leads_by_rep, leads_by_rep, leads_by_status, blocked_transactions, closing_soon, top_reps_by_stale, opportunities_by_stage, never_called_leads`;
    }

    return NextResponse.json({ result });
  } catch (err: unknown) {
    console.error('Query error:', err);
    return NextResponse.json({ result: `Error querying Salesforce: ${String(err)}` });
  }
}
