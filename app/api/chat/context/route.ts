// GET /api/chat/context
// Called by Retell at the start of each conversation to inject live SF data
// Returns a clean summary the AI uses as context to answer PM questions

import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';

interface StatusCount { Status: string; cnt: number }
interface StageCount { StageName: string; cnt: number; totalAmount: number }
interface PathCount { Left_Main__Path__c: string; cnt: number }
interface OwnerLeadCount { 'Owner.Name': string; total: number; unqualified: number; stale: number }
interface SFUser { Id: string; Name: string }

export async function GET() {
  try {
    const [
      leadsByStatus,
      oppsByStage,
      txByPath,
      staleLeads,
      closingSoon,
    ] = await Promise.all([
      sfQuery<StatusCount>(`SELECT Status, COUNT(Id) cnt FROM Lead WHERE IsConverted=false GROUP BY Status ORDER BY COUNT(Id) DESC`),
      sfQuery<StageCount>(`SELECT StageName, COUNT(Id) cnt, SUM(Amount) totalAmount FROM Opportunity WHERE IsClosed=false GROUP BY StageName ORDER BY COUNT(Id) DESC`),
      sfQuery<PathCount>(`SELECT Left_Main__Path__c, COUNT(Id) cnt FROM Left_Main__Transactions__c GROUP BY Left_Main__Path__c ORDER BY COUNT(Id) DESC`),
      sfQuery<{cnt: number}>(`SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND LastActivityDate < LAST_N_DAYS:14`),
      sfQuery<{cnt: number}>(`SELECT COUNT(Id) cnt FROM Left_Main__Transactions__c WHERE Left_Main__Closing_Date__c <= NEXT_N_DAYS:7 AND Left_Main__Path__c NOT IN ('Closed/Won','Closed/Memo','Cancelled Contract/Lost','Closed - Realtor Referral')`),
    ]);

    const BLOCKED = ['On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'];
    const totalLeads = leadsByStatus.reduce((s, r) => s + r.cnt, 0);
    const unqualified = leadsByStatus.find(r => r.Status === 'Unqualified')?.cnt || 0;
    const blockedTx = txByPath.filter(r => BLOCKED.includes(r.Left_Main__Path__c)).reduce((s, r) => s + r.cnt, 0);
    const totalTx = txByPath.reduce((s, r) => s + r.cnt, 0);
    const activeTx = txByPath.filter(r => !['Closed/Won','Closed/Memo','Cancelled Contract/Lost','Closed - Realtor Referral'].includes(r.Left_Main__Path__c)).reduce((s,r) => s+r.cnt, 0);
    const totalOpps = oppsByStage.reduce((s, r) => s + r.cnt, 0);
    const pipelineValue = oppsByStage.reduce((s, r) => s + (r.totalAmount || 0), 0);

    const summary = `
TRINITY OFFERS — LIVE SALESFORCE DATA (as of ${new Date().toLocaleString('en-US', {timeZone: 'America/New_York'})})

LEADS (${totalLeads.toLocaleString()} total active):
${leadsByStatus.map(r => `- ${r.Status}: ${r.cnt.toLocaleString()}`).join('\n')}
- Stale 14d+ (no activity): ${staleLeads[0]?.cnt || 0}
- Unqualified % of total: ${Math.round(unqualified/totalLeads*100)}%

OPPORTUNITIES (${totalOpps.toLocaleString()} open):
${oppsByStage.map(r => `- ${r.StageName}: ${r.cnt}`).join('\n')}
- Total pipeline value: $${Math.round(pipelineValue).toLocaleString()}

TRANSACTIONS (${totalTx.toLocaleString()} total, ${activeTx} active):
${txByPath.map(r => `- ${r.Left_Main__Path__c || 'Unknown'}: ${r.cnt}`).join('\n')}
- BLOCKED deals: ${blockedTx}
- Closing this week: ${closingSoon[0]?.cnt || 0}
`.trim();

    // Retell expects the context in a specific format
    return NextResponse.json({
      llm_websocket_url: null,
      dynamic_variables: {
        sf_context: summary,
      }
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
