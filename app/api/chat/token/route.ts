// POST /api/chat/token
// Creates a Retell web call and returns an access token for the client SDK
// Fetches live SF context and injects as dynamic variables

import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';

const RETELL_API_KEY = process.env.RETELL_API_KEY!;
const AGENT_ID = 'agent_f39c518c9eda0425c9097c34db';

interface StatusCount { Status: string; cnt: number }
interface StageCount { StageName: string; cnt: number; totalAmount: number }
interface PathCount { Left_Main__Path__c: string; cnt: number }
interface StaleCount { cnt: number }

export async function POST() {
  try {
    // Fetch live SF context directly (no internal HTTP call)
    let sfContext = 'Live data temporarily unavailable.';
    try {
      const BLOCKED = ['On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'];
      const CLOSED_TX = ['Closed/Won', 'Closed/Memo', 'Cancelled Contract/Lost', 'Closed - Realtor Referral'];

      const [leadsByStatus, oppsByStage, txByPath, staleLeads, closingSoon] = await Promise.all([
        sfQuery<StatusCount>(`SELECT Status, COUNT(Id) cnt FROM Lead WHERE IsConverted=false GROUP BY Status ORDER BY COUNT(Id) DESC`),
        sfQuery<StageCount>(`SELECT StageName, COUNT(Id) cnt, SUM(Amount) totalAmount FROM Opportunity WHERE IsClosed=false GROUP BY StageName ORDER BY COUNT(Id) DESC`),
        sfQuery<PathCount>(`SELECT Left_Main__Path__c, COUNT(Id) cnt FROM Left_Main__Transactions__c GROUP BY Left_Main__Path__c ORDER BY COUNT(Id) DESC`),
        sfQuery<StaleCount>(`SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND LastActivityDate < LAST_N_DAYS:14`),
        sfQuery<StaleCount>(`SELECT COUNT(Id) cnt FROM Left_Main__Transactions__c WHERE Left_Main__Closing_Date__c <= NEXT_N_DAYS:7 AND Left_Main__Path__c NOT IN ('Closed/Won','Closed/Memo','Cancelled Contract/Lost','Closed - Realtor Referral')`),
      ]);

      const totalLeads = leadsByStatus.reduce((s, r) => s + r.cnt, 0);
      const unqualified = leadsByStatus.find(r => r.Status === 'Unqualified')?.cnt || 0;
      const blockedTx = txByPath.filter(r => BLOCKED.includes(r.Left_Main__Path__c)).reduce((s, r) => s + r.cnt, 0);
      const totalTx = txByPath.reduce((s, r) => s + r.cnt, 0);
      const activeTx = txByPath.filter(r => !CLOSED_TX.includes(r.Left_Main__Path__c)).reduce((s, r) => s + r.cnt, 0);
      const totalOpps = oppsByStage.reduce((s, r) => s + r.cnt, 0);
      const pipelineValue = oppsByStage.reduce((s, r) => s + (r.totalAmount || 0), 0);

      sfContext = `
TRINITY OFFERS — LIVE SALESFORCE DATA (${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET)

LEADS (${totalLeads.toLocaleString()} total active):
${leadsByStatus.map(r => `- ${r.Status}: ${r.cnt.toLocaleString()}`).join('\n')}
- Stale 14+ days (no activity): ${staleLeads[0]?.cnt || 0}
- Unqualified is ${Math.round(unqualified / totalLeads * 100)}% of all leads

OPPORTUNITIES (${totalOpps.toLocaleString()} open):
${oppsByStage.map(r => `- ${r.StageName}: ${r.cnt}`).join('\n')}
- Total pipeline value: $${Math.round(pipelineValue).toLocaleString()}

TRANSACTIONS (${totalTx.toLocaleString()} total, ${activeTx} active):
${txByPath.map(r => `- ${r.Left_Main__Path__c || 'Unknown'}: ${r.cnt}`).join('\n')}
- BLOCKED deals (On Hold/Title Issues/Waiting on Funds): ${blockedTx}
- Closing this week: ${closingSoon[0]?.cnt || 0}
`.trim();
    } catch (e) {
      console.error('SF context error:', e);
    }

    // Create Retell web call
    const res = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: AGENT_ID,
        retell_llm_dynamic_variables: { sf_context: sfContext },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Retell error: ${err}`);
    }

    const data = await res.json();
    return NextResponse.json({ access_token: data.access_token });
  } catch (err: unknown) {
    console.error('Token error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
