// Salesforce Object Types

export interface SFLead {
  Id: string;
  Name: string;
  Status: string;
  OwnerId: string;
  Owner?: { Name: string };
  CreatedDate: string;
  LastActivityDate: string | null;
  IsConverted: boolean;
  Phone?: string;
  Email?: string;
  Company?: string;
}

export interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  OwnerId: string;
  Owner?: { Name: string };
  Amount: number | null;
  CloseDate: string;
  CreatedDate: string;
  LastActivityDate: string | null;
  LeadSource?: string;
  IsClosed: boolean;
  IsWon: boolean;
}

export interface SFTransaction {
  Id: string;
  Name: string;
  Left_Main__Path__c: string;
  Left_Main__Dispo_Status__c: string | null;
  Left_Main__Disposition_Decision__c: string | null;
  Left_Main__Acquisition_Rep__c: string | null;
  Left_Main__Dispositions_Rep__c: string | null;
  Left_Main__Contract_Assignment_Price__c: number | null;
  Assignment_Fee__c: number | null;
  Left_Main__NetProfit__c: number | null;
  Left_Main__Closing_Date__c: string | null;
  CreatedDate: string;
  LastActivityDate: string | null;
  Pending_Stage__c?: string;
  Marketing_Stage__c?: string;
  Showing_Status__c?: string;
  Assigned_Stage__c?: string;
}

export interface SFUser {
  Id: string;
  Name: string;
  Email: string;
  IsActive: boolean;
}

// Dashboard Data Types

export interface LeadStats {
  totalActive: number;
  hotLeads: number; // New + Working
  pipelineLeads: number; // Qualified + Offer + Appointment
  unqualified: number;
  unassigned: number;
}

export interface LeadStatusBreakdown {
  status: string;
  count: number;
  avgDaysInStatus: number;
  topReps: { name: string; count: number }[];
  color: 'green' | 'yellow' | 'red';
}

export interface LeadRepStats {
  repName: string;
  totalAssigned: number;
  newCount: number;
  workingCount: number;
  qualifiedCount: number;
  offerCount: number;
  unqualifiedCount: number;
  avgDaysNoActivity: number;
  lastActivity: string | null;
  isWarning: boolean;
}

export interface StaleLead {
  id: string;
  name: string;
  status: string;
  repName: string;
  daysSinceActivity: number;
  phone: string | null;
  email: string | null;
}

export interface OppStats {
  totalOpen: number;
  activePipeline: number;
  closedWonMonth: number;
  closedLostMonth: number;
  pipelineValue: number;
}

export interface OppStageBreakdown {
  stage: string;
  count: number;
  value: number;
  isGraveyard: boolean;
  isWarning: boolean;
}

export interface OppRepStats {
  repName: string;
  totalOpps: number;
  closingRate: number;
  avgDaysToClose: number;
  pipelineValue: number;
  closedWonMonth: number;
}

export interface StuckDeal {
  id: string;
  name: string;
  stage: string;
  repName: string;
  daysInStage: number;
  closeDate: string | null;
  isPastDue: boolean;
  amount: number | null;
}

export interface TransactionStats {
  activeCount: number;
  blockedCount: number;
  closingThisWeek: number;
  pipelineValue: number;
  closedWonMonth: number;
  closedWonMonthValue: number;
}

export interface TransactionPathBreakdown {
  path: string;
  count: number;
  value: number;
  isBlocked: boolean;
}

export interface BlockedDeal {
  id: string;
  propertyAddress: string;
  acqRepName: string;
  dispoRepName: string;
  daysBlocked: number;
  dispoDecision: string | null;
  contractPrice: number | null;
  pathStage: string;
}

export interface ActiveTransaction {
  id: string;
  propertyAddress: string;
  pathStage: string;
  dispoDecision: string | null;
  acqRepName: string;
  dispoRepName: string;
  daysInStage: number;
  closingDate: string | null;
  contractPrice: number | null;
  status: 'overdue' | 'urgent' | 'ok';
}

export interface ClosingSoonDeal {
  id: string;
  propertyAddress: string;
  closingDate: string;
  daysUntilClose: number;
  dispoDecision: string | null;
  contractPrice: number | null;
  acqRepName: string;
  dispoRepName: string;
}

// API Response Types

export interface LeadsDashboardData {
  stats: LeadStats;
  statusBreakdown: LeadStatusBreakdown[];
  repStats: LeadRepStats[];
  staleLeads: StaleLead[];
  lastSynced: string | null;
}

export interface OppsDashboardData {
  stats: OppStats;
  stageBreakdown: OppStageBreakdown[];
  repStats: OppRepStats[];
  stuckDeals: StuckDeal[];
  lastSynced: string | null;
}

export interface TransactionsDashboardData {
  stats: TransactionStats;
  pathBreakdown: TransactionPathBreakdown[];
  blockedDeals: BlockedDeal[];
  activeDeals: ActiveTransaction[];
  closingSoon: ClosingSoonDeal[];
  lastSynced: string | null;
}
