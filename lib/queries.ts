// Salesforce SOQL Queries for Dashboard
import { sfQuery } from './salesforce';
import type { SFLead, SFOpportunity, SFTransaction, SFUser } from './types';

// ============ LEAD QUERIES ============

export async function fetchAllLeads(): Promise<SFLead[]> {
  const soql = `
    SELECT Id, Name, Status, OwnerId, Owner.Name, CreatedDate, LastActivityDate, 
           IsConverted, Phone, Email, Company
    FROM Lead
    WHERE IsConverted = false
    ORDER BY CreatedDate DESC
  `;
  return sfQuery<SFLead>(soql);
}

export async function fetchLeadStatusCounts(): Promise<{ Status: string; cnt: number }[]> {
  const soql = `
    SELECT Status, COUNT(Id) cnt
    FROM Lead
    WHERE IsConverted = false
    GROUP BY Status
  `;
  return sfQuery<{ Status: string; cnt: number }>(soql);
}

export async function fetchLeadsByStatus(status: string): Promise<SFLead[]> {
  const soql = `
    SELECT Id, Name, Status, OwnerId, Owner.Name, CreatedDate, LastActivityDate, Phone, Email
    FROM Lead
    WHERE IsConverted = false AND Status = '${status}'
  `;
  return sfQuery<SFLead>(soql);
}

export async function fetchLeadRepBreakdown(): Promise<{ OwnerId: string; OwnerName: string; Status: string; cnt: number }[]> {
  const soql = `
    SELECT OwnerId, Owner.Name OwnerName, Status, COUNT(Id) cnt
    FROM Lead
    WHERE IsConverted = false
    GROUP BY OwnerId, Owner.Name, Status
  `;
  return sfQuery<{ OwnerId: string; OwnerName: string; Status: string; cnt: number }>(soql);
}

export async function fetchStaleLeads(daysSinceActivity: number): Promise<SFLead[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysSinceActivity);
  const isoDate = cutoffDate.toISOString().split('T')[0];
  
  const soql = `
    SELECT Id, Name, Status, OwnerId, Owner.Name, LastActivityDate, Phone, Email
    FROM Lead
    WHERE IsConverted = false 
      AND Status NOT IN ('Unqualified')
      AND (LastActivityDate < ${isoDate} OR LastActivityDate = null)
    ORDER BY LastActivityDate ASC NULLS FIRST
    LIMIT 500
  `;
  return sfQuery<SFLead>(soql);
}

// ============ OPPORTUNITY QUERIES ============

export async function fetchAllOpportunities(): Promise<SFOpportunity[]> {
  const soql = `
    SELECT Id, Name, StageName, OwnerId, Owner.Name, Amount, CloseDate, 
           CreatedDate, LastActivityDate, LeadSource, IsClosed, IsWon
    FROM Opportunity
    ORDER BY CreatedDate DESC
  `;
  return sfQuery<SFOpportunity>(soql);
}

export async function fetchOpenOpportunities(): Promise<SFOpportunity[]> {
  const soql = `
    SELECT Id, Name, StageName, OwnerId, Owner.Name, Amount, CloseDate, 
           CreatedDate, LastActivityDate, LeadSource, IsClosed, IsWon
    FROM Opportunity
    WHERE IsClosed = false
    ORDER BY CloseDate ASC
  `;
  return sfQuery<SFOpportunity>(soql);
}

export async function fetchOppStageCounts(): Promise<{ StageName: string; cnt: number; totalAmount: number }[]> {
  const soql = `
    SELECT StageName, COUNT(Id) cnt, SUM(Amount) totalAmount
    FROM Opportunity
    GROUP BY StageName
  `;
  return sfQuery<{ StageName: string; cnt: number; totalAmount: number }>(soql);
}

export async function fetchClosedOppsThisMonth(): Promise<SFOpportunity[]> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isoDate = firstOfMonth.toISOString().split('T')[0];
  
  const soql = `
    SELECT Id, Name, StageName, OwnerId, Owner.Name, Amount, CloseDate, IsWon
    FROM Opportunity
    WHERE IsClosed = true AND CloseDate >= ${isoDate}
  `;
  return sfQuery<SFOpportunity>(soql);
}

export async function fetchStuckOpportunities(daysInStage: number): Promise<SFOpportunity[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInStage);
  const isoDate = cutoffDate.toISOString().split('T')[0];
  
  const soql = `
    SELECT Id, Name, StageName, OwnerId, Owner.Name, Amount, CloseDate, LastActivityDate, CreatedDate
    FROM Opportunity
    WHERE IsClosed = false 
      AND StageName NOT IN ('Podio Deals', 'Closed Lost')
      AND (LastActivityDate < ${isoDate} OR LastActivityDate = null)
    ORDER BY LastActivityDate ASC NULLS FIRST
    LIMIT 100
  `;
  return sfQuery<SFOpportunity>(soql);
}

export async function fetchPastDueOpportunities(): Promise<SFOpportunity[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const soql = `
    SELECT Id, Name, StageName, OwnerId, Owner.Name, Amount, CloseDate, LastActivityDate
    FROM Opportunity
    WHERE IsClosed = false AND CloseDate < ${today}
    ORDER BY CloseDate ASC
    LIMIT 100
  `;
  return sfQuery<SFOpportunity>(soql);
}

// ============ TRANSACTION QUERIES ============

export async function fetchAllTransactions(): Promise<SFTransaction[]> {
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Dispo_Status__c, 
           Left_Main__Disposition_Decision__c, Left_Main__Acquisition_Rep__c,
           Left_Main__Dispositions_Rep__c, Left_Main__Contract_Assignment_Price__c,
           Assignment_Fee__c, Left_Main__NetProfit__c, Left_Main__Closing_Date__c,
           CreatedDate, LastActivityDate, Pending_Stage__c, Marketing_Stage__c,
           Showing_Status__c, Assigned_Stage__c
    FROM Left_Main__Transactions__c
    ORDER BY CreatedDate DESC
  `;
  return sfQuery<SFTransaction>(soql);
}

export async function fetchActiveTransactions(): Promise<SFTransaction[]> {
  const closedStatuses = "'Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'";
  
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Dispo_Status__c, 
           Left_Main__Disposition_Decision__c, Left_Main__Acquisition_Rep__c,
           Left_Main__Dispositions_Rep__c, Left_Main__Contract_Assignment_Price__c,
           Assignment_Fee__c, Left_Main__NetProfit__c, Left_Main__Closing_Date__c,
           CreatedDate, LastActivityDate
    FROM Left_Main__Transactions__c
    WHERE Left_Main__Path__c NOT IN (${closedStatuses})
    ORDER BY Left_Main__Closing_Date__c ASC NULLS LAST
  `;
  return sfQuery<SFTransaction>(soql);
}

export async function fetchBlockedTransactions(): Promise<SFTransaction[]> {
  const blockedStatuses = "'On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'";
  
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Dispo_Status__c, 
           Left_Main__Disposition_Decision__c, Left_Main__Acquisition_Rep__c,
           Left_Main__Dispositions_Rep__c, Left_Main__Contract_Assignment_Price__c,
           CreatedDate, LastActivityDate
    FROM Left_Main__Transactions__c
    WHERE Left_Main__Path__c IN (${blockedStatuses})
    ORDER BY CreatedDate ASC
  `;
  return sfQuery<SFTransaction>(soql);
}

export async function fetchTransactionPathCounts(): Promise<{ Path: string; cnt: number; totalValue: number }[]> {
  const soql = `
    SELECT Left_Main__Path__c Path, COUNT(Id) cnt, SUM(Left_Main__Contract_Assignment_Price__c) totalValue
    FROM Left_Main__Transactions__c
    GROUP BY Left_Main__Path__c
  `;
  return sfQuery<{ Path: string; cnt: number; totalValue: number }>(soql);
}

export async function fetchClosingThisWeek(): Promise<SFTransaction[]> {
  const today = new Date();
  const weekFromNow = new Date();
  weekFromNow.setDate(today.getDate() + 7);
  
  const todayIso = today.toISOString().split('T')[0];
  const weekIso = weekFromNow.toISOString().split('T')[0];
  const closedStatuses = "'Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'";
  
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Disposition_Decision__c,
           Left_Main__Acquisition_Rep__c, Left_Main__Dispositions_Rep__c,
           Left_Main__Contract_Assignment_Price__c, Left_Main__Closing_Date__c
    FROM Left_Main__Transactions__c
    WHERE Left_Main__Closing_Date__c >= ${todayIso}
      AND Left_Main__Closing_Date__c <= ${weekIso}
      AND Left_Main__Path__c NOT IN (${closedStatuses})
    ORDER BY Left_Main__Closing_Date__c ASC
  `;
  return sfQuery<SFTransaction>(soql);
}

export async function fetchClosingSoon(days: number = 14): Promise<SFTransaction[]> {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  const todayIso = today.toISOString().split('T')[0];
  const futureIso = futureDate.toISOString().split('T')[0];
  const closedStatuses = "'Cancelled Contract/Lost', 'Closed/Memo', 'Closed/Won', 'Closed - Realtor Referral'";
  
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Disposition_Decision__c,
           Left_Main__Acquisition_Rep__c, Left_Main__Dispositions_Rep__c,
           Left_Main__Contract_Assignment_Price__c, Left_Main__Closing_Date__c
    FROM Left_Main__Transactions__c
    WHERE Left_Main__Closing_Date__c >= ${todayIso}
      AND Left_Main__Closing_Date__c <= ${futureIso}
      AND Left_Main__Path__c NOT IN (${closedStatuses})
    ORDER BY Left_Main__Closing_Date__c ASC
  `;
  return sfQuery<SFTransaction>(soql);
}

export async function fetchClosedTransactionsThisMonth(): Promise<SFTransaction[]> {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isoDate = firstOfMonth.toISOString().split('T')[0];
  
  const soql = `
    SELECT Id, Name, Left_Main__Path__c, Left_Main__Contract_Assignment_Price__c,
           Left_Main__NetProfit__c, Left_Main__Closing_Date__c
    FROM Left_Main__Transactions__c
    WHERE Left_Main__Path__c = 'Closed/Won'
      AND Left_Main__Closing_Date__c >= ${isoDate}
  `;
  return sfQuery<SFTransaction>(soql);
}

// ============ USER QUERIES ============

export async function fetchUsers(): Promise<SFUser[]> {
  const soql = `
    SELECT Id, Name, Email, IsActive
    FROM User
    WHERE IsActive = true
    ORDER BY Name
  `;
  return sfQuery<SFUser>(soql);
}

export async function fetchUserMap(): Promise<Map<string, string>> {
  const users = await fetchUsers();
  const map = new Map<string, string>();
  for (const user of users) {
    map.set(user.Id, user.Name);
  }
  return map;
}
