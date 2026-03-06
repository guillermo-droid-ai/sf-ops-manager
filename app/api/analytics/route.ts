import { NextResponse } from 'next/server';
import { sfQuery } from '@/lib/salesforce';
import type { AnalyticsData } from '@/lib/types';

interface DayCount {
  day: string;
  cnt: number;
}

interface LeadSourceCount {
  LeadSource: string | null;
  cnt: number;
}

interface StateCount {
  State: string | null;
  cnt: number;
}

interface CountResult {
  cnt: number;
}

interface RevenueByMonth {
  month: number;
  year: number;
  cnt: number;
  total: number | null;
}

export async function GET() {
  try {
    // Run all queries in parallel
    const [
      leadTrend,
      leadSourceCounts,
      wonBySource,
      stateCounts,
      zeroCalls,
      calls1to2,
      calls3to5,
      callsOver5,
      revenueByMonth,
      noPhone,
      noEmail,
      noAddress,
      totalActive,
    ] = await Promise.all([
      // Lead creation trend (last 30 days)
      sfQuery<DayCount>(
        'SELECT DAY_ONLY(CreatedDate) day, COUNT(Id) cnt FROM Lead WHERE CreatedDate = LAST_N_DAYS:30 GROUP BY DAY_ONLY(CreatedDate) ORDER BY DAY_ONLY(CreatedDate) ASC'
      ),

      // Lead source breakdown
      sfQuery<LeadSourceCount>(
        'SELECT LeadSource, COUNT(Id) cnt FROM Lead WHERE IsConverted=false GROUP BY LeadSource ORDER BY COUNT(Id) DESC LIMIT 12'
      ),

      // Won deals by source
      sfQuery<LeadSourceCount>(
        'SELECT LeadSource, COUNT(Id) cnt FROM Opportunity WHERE IsWon=true GROUP BY LeadSource ORDER BY COUNT(Id) DESC LIMIT 12'
      ),

      // State breakdown (top 10)
      sfQuery<StateCount>(
        'SELECT State, COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND State != null GROUP BY State ORDER BY COUNT(Id) DESC LIMIT 10'
      ),

      // Call attempts distribution
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND of_Call_Attempts__c = 0'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND of_Call_Attempts__c >= 1 AND of_Call_Attempts__c <= 2'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND of_Call_Attempts__c >= 3 AND of_Call_Attempts__c <= 5'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND of_Call_Attempts__c > 5'
      ),

      // Transaction revenue by month (last 6 months)
      sfQuery<RevenueByMonth>(
        "SELECT CALENDAR_MONTH(CreatedDate) month, CALENDAR_YEAR(CreatedDate) year, COUNT(Id) cnt, SUM(Left_Main__Contract_Assignment_Price__c) total FROM Left_Main__Transactions__c WHERE Left_Main__Path__c = 'Closed/Won' AND CreatedDate = LAST_N_MONTHS:6 GROUP BY CALENDAR_MONTH(CreatedDate), CALENDAR_YEAR(CreatedDate) ORDER BY CALENDAR_YEAR(CreatedDate), CALENDAR_MONTH(CreatedDate)"
      ),

      // Data quality counts
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND Phone=null AND MobilePhone=null AND Phone_2__c=null AND Phone_3__c=null'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND Email=null AND Secondary_Email__c=null AND Email_Other__c=null'
      ),
      sfQuery<CountResult>(
        'SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false AND Street=null AND City=null'
      ),
      sfQuery<CountResult>('SELECT COUNT(Id) cnt FROM Lead WHERE IsConverted=false'),
    ]);

    const total = totalActive[0]?.cnt ?? 1;

    // Build lead creation trend
    const leadCreationTrend = leadTrend.map((d) => ({
      date: d.day,
      count: d.cnt,
    }));

    // Build lead source breakdown with won deals joined
    const wonMap = new Map<string, number>();
    wonBySource.forEach((w) => {
      if (w.LeadSource) wonMap.set(w.LeadSource, w.cnt);
    });

    const leadSourceBreakdown = leadSourceCounts
      .filter((s) => s.LeadSource)
      .map((s) => ({
        source: shortenSource(s.LeadSource!),
        count: s.cnt,
        wonDeals: wonMap.get(s.LeadSource!) ?? 0,
      }));

    // State breakdown
    const stateBreakdown = stateCounts
      .filter((s) => s.State)
      .map((s) => ({
        state: s.State!,
        count: s.cnt,
      }));

    // Call attempts distribution
    const callAttemptsDistribution = [
      { bucket: '0 calls', count: zeroCalls[0]?.cnt ?? 0 },
      { bucket: '1-2 calls', count: calls1to2[0]?.cnt ?? 0 },
      { bucket: '3-5 calls', count: calls3to5[0]?.cnt ?? 0 },
      { bucket: '6+ calls', count: callsOver5[0]?.cnt ?? 0 },
    ];

    // Transaction revenue by month
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const transactionRevenue = revenueByMonth.map((r) => ({
      month: `${monthNames[r.month - 1]} ${r.year}`,
      contractValue: r.total ?? 0,
      count: r.cnt,
    }));

    // Data quality metrics
    const noPhoneCount = noPhone[0]?.cnt ?? 0;
    const noEmailCount = noEmail[0]?.cnt ?? 0;
    const noAddressCount = noAddress[0]?.cnt ?? 0;
    const zeroCallsCount = zeroCalls[0]?.cnt ?? 0;

    const hasPhone = total - noPhoneCount;
    const hasEmail = total - noEmailCount;
    const hasAddress = total - noAddressCount;
    const beenCalled = total - zeroCallsCount;

    const dataQuality = [
      {
        label: 'Has Phone',
        value: hasPhone,
        total,
        percent: Math.round((hasPhone / total) * 100),
        color: getQualityColor(hasPhone / total),
      },
      {
        label: 'Has Email',
        value: hasEmail,
        total,
        percent: Math.round((hasEmail / total) * 100),
        color: getQualityColor(hasEmail / total),
      },
      {
        label: 'Has Address',
        value: hasAddress,
        total,
        percent: Math.round((hasAddress / total) * 100),
        color: getQualityColor(hasAddress / total),
      },
      {
        label: 'Been Called',
        value: beenCalled,
        total,
        percent: Math.round((beenCalled / total) * 100),
        color: getQualityColor(beenCalled / total),
      },
    ];

    const response: AnalyticsData = {
      leadCreationTrend,
      leadSourceBreakdown,
      dataQuality,
      stateBreakdown,
      callAttemptsDistribution,
      transactionRevenue,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function shortenSource(source: string): string {
  const map: Record<string, string> = {
    'Cold Calling': 'Cold Call',
    'PPC-REIDeal': 'PPC REI',
    'PPC REIDeal': 'PPC REI 2',
    'PPL-PropertyLeads': 'PPL Prop',
    'PPC-YT': 'PPC YT',
    'SMS-Launch Control': 'SMS LC',
    'PPC-TikTok': 'PPC TT',
    'PPL-Leadzolo': 'PPL LZ',
    'Direct Mail': 'DM',
    Organic: 'Organic',
  };
  return map[source] ?? source.substring(0, 10);
}

function getQualityColor(ratio: number): string {
  if (ratio >= 0.8) return '#22c55e'; // green
  if (ratio >= 0.5) return '#eab308'; // yellow
  return '#ef4444'; // red
}
