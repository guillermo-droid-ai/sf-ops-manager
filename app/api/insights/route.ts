import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';
import type { Insight, InsightsData } from '@/lib/types';

interface CountResult {
  cnt: number;
}

interface LeadSourceCount {
  LeadSource: string | null;
  cnt: number;
}

interface PathCount {
  Left_Main__Path__c: string | null;
  cnt: number;
}

interface OwnerCount {
  Owner: { Name: string };
  cnt: number;
}

export async function GET() {
  try {
    // Run all queries in parallel for speed
    const [
      thisMonthLeads,
      lastMonthLeads,
      noPhoneLeads,
      noEmailLeads,
      zeroCallLeads,
      totalActiveLeads,
      leadSourceCounts,
      wonBySource,
      blockedTrans,
      closingSoon,
      staleByOwner,
    ] = await Promise.all([
      // Lead volume this month vs last
      sfQuery<CountResult>('SELECT COUNT(Id) cnt FROM Lead WHERE CreatedDate = THIS_MONTH'),
      sfQuery<CountResult>('SELECT COUNT(Id) cnt FROM Lead WHERE CreatedDate = LAST_MONTH'),

      // Data quality
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND Phone=null AND MobilePhone=null AND Phone_2__c=null AND Phone_3__c=null'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND Email=null AND Secondary_Email__c=null AND Email_Other__c=null'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND of_Call_Attempts__c = 0'
      ),
      sfQuery<CountResult>('SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false'),

      // Lead source performance
      sfQuery<LeadSourceCount>(
        'SELECT LeadSource, COUNT(Id) cnt FROM Lead WHERE IsConverted=false GROUP BY LeadSource ORDER BY COUNT(Id) DESC'
      ),
      sfQuery<LeadSourceCount>(
        'SELECT LeadSource, COUNT(Id) cnt FROM Opportunity WHERE IsWon=true GROUP BY LeadSource ORDER BY COUNT(Id) DESC'
      ),

      // Blocked transactions
      sfQuery<PathCount>(
        "SELECT Left_Main__Path__c, COUNT(Id) cnt FROM Left_Main__Transactions__c WHERE Left_Main__Path__c IN ('On Hold','Title Issues','Waiting on Funds','Cancellation Sent - Waiting to Sign') GROUP BY Left_Main__Path__c"
      ),

      // Closing soon
      sfQuery<CountResult>(
        "SELECT COUNT(Id) cnt FROM Left_Main__Transactions__c WHERE Left_Main__Closing_Date__c <= NEXT_N_DAYS:7 AND Left_Main__Path__c NOT IN ('Closed/Won','Closed/Memo','Cancelled Contract/Lost','Closed - Realtor Referral')"
      ),

      // Rep stale analysis
      sfQuery<OwnerCount>(
        'SELECT Owner.Name, COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND LastActivityDate < LAST_N_DAYS:14 GROUP BY Owner.Name ORDER BY COUNT(Id) DESC LIMIT 3'
      ),
    ]);

    const insights: Insight[] = [];

    // Extract counts
    const thisMonth = thisMonthLeads[0]?.cnt ?? 0;
    const lastMonth = lastMonthLeads[0]?.cnt ?? 0;
    const noPhone = noPhoneLeads[0]?.cnt ?? 0;
    const noEmail = noEmailLeads[0]?.cnt ?? 0;
    const zeroCalls = zeroCallLeads[0]?.cnt ?? 0;
    const totalActive = totalActiveLeads[0]?.cnt ?? 1;
    const closingSoonCount = closingSoon[0]?.cnt ?? 0;

    // Calculate percentages
    const noEmailPercent = Math.round((noEmail / totalActive) * 100);
    const noPhonePercent = Math.round((noPhone / totalActive) * 100);
    const zeroCallsPercent = Math.round((zeroCalls / totalActive) * 100);

    // 1. Email quality insight
    if (noEmailPercent > 50) {
      insights.push({
        type: noEmailPercent > 70 ? 'critical' : 'warning',
        icon: '📧',
        title: `${noEmailPercent}% of leads have no email`,
        detail: `${noEmail.toLocaleString()} of ${totalActive.toLocaleString()} active leads have no email address. Cold calling is your only reach channel for most leads.`,
        action: {
          label: 'View leads without email',
          filterKey: 'noEmail',
          filterValue: 'true',
          drillType: 'leads',
        },
      });
    }

    // 2. Zero call attempts insight
    if (zeroCallsPercent > 30) {
      insights.push({
        type: zeroCallsPercent > 40 ? 'warning' : 'info',
        icon: '📞',
        title: `${zeroCalls.toLocaleString()} leads never called (${zeroCallsPercent}%)`,
        detail: `These leads have zero call attempts. That's a major untapped pool for your dialers.`,
        action: {
          label: 'View uncalled leads',
          filterKey: 'noCalls',
          filterValue: 'true',
          drillType: 'leads',
        },
      });
    }

    // 3. Month-over-month lead volume
    if (lastMonth > 0) {
      const changePercent = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
      if (changePercent < -20) {
        insights.push({
          type: changePercent < -50 ? 'critical' : 'warning',
          icon: '📉',
          title: `Lead volume dropped ${Math.abs(changePercent)}% vs last month`,
          detail: `Only ${thisMonth} leads this month vs ${lastMonth} last month. Review your marketing channels.`,
        });
      } else if (changePercent > 20) {
        insights.push({
          type: 'success',
          icon: '📈',
          title: `Lead volume up ${changePercent}% vs last month`,
          detail: `${thisMonth} leads this month vs ${lastMonth} last month. Nice momentum!`,
        });
      }
    }

    // 4. Lead source ROI analysis
    const coldCallingLeads = leadSourceCounts.find(
      (s) => s.LeadSource === 'Cold Calling'
    );
    const coldCallingWon = wonBySource.find((s) => s.LeadSource === 'Cold Calling');
    const pplLeads = leadSourceCounts.find(
      (s) => s.LeadSource === 'PPL-PropertyLeads'
    );
    const pplWon = wonBySource.find((s) => s.LeadSource === 'PPL-PropertyLeads');

    if (coldCallingLeads && pplLeads && pplWon) {
      const totalLeads = leadSourceCounts.reduce((sum, s) => sum + s.cnt, 0);
      const coldCallingPercent = Math.round(
        (coldCallingLeads.cnt / totalLeads) * 100
      );
      const totalWon = wonBySource.reduce((sum, s) => sum + s.cnt, 0);
      const coldCallingWonPercent =
        coldCallingWon && totalWon > 0
          ? Math.round((coldCallingWon.cnt / totalWon) * 100)
          : 0;

      if (coldCallingPercent > 50 && coldCallingWonPercent < 25) {
        insights.push({
          type: 'warning',
          icon: '⚠️',
          title: `Cold Calling: ${coldCallingPercent}% of leads, ${coldCallingWonPercent}% of wins`,
          detail: `Cold Calling dominates lead volume but has low conversion. PPL-PropertyLeads has ${pplWon.cnt} wins from only ${pplLeads.cnt} leads — consider reallocating budget.`,
        });
      }
    }

    // 5. PPL-PropertyLeads success story
    if (pplLeads && pplWon && pplWon.cnt > 10) {
      const pplConversionRate = Math.round((pplWon.cnt / pplLeads.cnt) * 100);
      if (pplConversionRate > 5) {
        insights.push({
          type: 'success',
          icon: '🏆',
          title: `PPL-PropertyLeads converts at ${pplConversionRate}%`,
          detail: `${pplWon.cnt} won deals from ${pplLeads.cnt} leads. This is your highest-ROI channel.`,
        });
      }
    }

    // 6. Blocked transactions
    const totalBlocked = blockedTrans.reduce((sum, t) => sum + t.cnt, 0);
    if (totalBlocked > 0) {
      const stages = blockedTrans
        .map((t) => `${t.Left_Main__Path__c} (${t.cnt})`)
        .join(', ');
      insights.push({
        type: totalBlocked > 5 ? 'warning' : 'info',
        icon: '🚧',
        title: `${totalBlocked} transactions currently blocked`,
        detail: stages,
        action: {
          label: 'View blocked deals',
          filterKey: 'blocked',
          filterValue: 'true',
          drillType: 'transactions',
        },
      });
    }

    // 7. Closing soon
    if (closingSoonCount > 0) {
      insights.push({
        type: closingSoonCount > 5 ? 'warning' : 'info',
        icon: '⏰',
        title: `${closingSoonCount} deals closing this week`,
        detail: `These transactions have closing dates within the next 7 days. Make sure everything is lined up.`,
        action: {
          label: 'View closing deals',
          filterKey: 'closingSoon',
          filterValue: 'true',
          drillType: 'transactions',
        },
      });
    }

    // 8. Stale leads by rep
    const topStaleRep = staleByOwner[0];
    if (topStaleRep && topStaleRep.cnt > 100) {
      insights.push({
        type: 'warning',
        icon: '👤',
        title: `${topStaleRep.Owner.Name} has ${topStaleRep.cnt.toLocaleString()} stale leads`,
        detail: `Leads with no activity in 14+ days. Consider reassigning or reviewing workload.`,
      });
    }

    // 9. Phone data quality
    if (noPhonePercent > 10) {
      insights.push({
        type: noPhonePercent > 20 ? 'warning' : 'info',
        icon: '📱',
        title: `${noPhonePercent}% of leads have no phone number`,
        detail: `${noPhone.toLocaleString()} leads can't be reached by phone. Check your data sources.`,
      });
    }

    const response: InsightsData = {
      insights,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
