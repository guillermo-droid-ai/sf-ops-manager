// Dashboard types

export interface StatusCount {
  status: string;
  count: number;
}

export interface StageCount {
  stage: string;
  count: number;
  totalAmount: number;
}

export interface PathCount {
  path: string;
  count: number;
}

export interface RepScore {
  name: string;
  ownerId: string;
  leadsActive: number;
  leadsStale7d: number;
  oppPipeline: number;
  transActive: number;
  lastActivity: string | null;
  score: 'A' | 'B' | 'C' | 'D';
}

export interface Alert {
  type: string;
  severity: 'red' | 'yellow' | 'green';
  message: string;
  filterKey: string;
  filterValue: string;
}

export interface DashboardData {
  leads: {
    byStatus: StatusCount[];
    total: number;
    stale14d: number;
  };
  opportunities: {
    byStage: StageCount[];
    total: number;
    closingSoon: number;
  };
  transactions: {
    byPath: PathCount[];
    total: number;
    blocked: number;
    closingThisWeek: number;
  };
  repScorecard: RepScore[];
  alerts: Alert[];
  lastSync: string;
}

// Salesforce record types
export interface SFLead {
  Id: string;
  FirstName: string | null;
  LastName: string | null;
  Status: string;
  OwnerId: string;
  CreatedDate: string;
  LastActivityDate: string | null;
  LeadSource: string | null;
  Phone: string | null;
  Email: string | null;
  State: string | null;
}

export interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  OwnerId: string;
  CreatedDate: string;
  LastActivityDate: string | null;
  IsClosed: boolean;
  IsWon: boolean;
  LeadSource: string | null;
}

export interface SFTransaction {
  Id: string;
  Name: string;
  Left_Main__Path__c: string | null;
  Left_Main__Acquisition_Rep__c: string | null;
  Left_Main__Dispositions_Rep__c: string | null;
  Left_Main__Disposition_Decision__c: string | null;
  Left_Main__Contract_Assignment_Price__c: number | null;
  Left_Main__Closing_Date__c: string | null;
  LastModifiedDate: string;
  CreatedDate: string;
}

export interface SFUser {
  Id: string;
  Name: string;
  IsActive: boolean;
}

// Drill-down response types
export interface DrillLeadRecord {
  id: string;
  name: string;
  status: string;
  leadSource: string | null;
  state: string | null;
  daysSinceActivity: number | null;
  phone: string | null;
  lastActivityDate: string | null;
}

export interface DrillOpportunityRecord {
  id: string;
  name: string;
  stage: string;
  amount: number | null;
  daysUntilClose: number;
  closeDate: string;
  leadSource: string | null;
  lastActivityDate: string | null;
}

export interface DrillTransactionRecord {
  id: string;
  propertyAddress: string;
  pathStage: string | null;
  dispoDecision: string | null;
  acqRepName: string | null;
  dispoRepName: string | null;
  daysInStage: number;
  closingDate: string | null;
  contractPrice: number | null;
}

export interface DrillResponse<T> {
  records: T[];
  total: number;
  page: number;
}

// Blocked transaction for display
export interface BlockedTransaction {
  id: string;
  propertyAddress: string;
  pathStage: string;
  dispoDecision: string | null;
  acqRepName: string | null;
  dispoRepName: string | null;
  daysBlocked: number;
  contractPrice: number | null;
}

// AI Insights types
export interface Insight {
  type: 'warning' | 'info' | 'success' | 'critical';
  icon: string;
  title: string;
  detail: string;
  action?: {
    label: string;
    filterKey: string;
    filterValue: string;
    drillType: 'leads' | 'opportunities' | 'transactions';
  };
}

export interface InsightsData {
  insights: Insight[];
  generatedAt: string;
}

// Analytics/Charts types
export interface LeadCreationTrend {
  date: string;
  count: number;
}

export interface LeadSourceBreakdown {
  source: string;
  count: number;
  wonDeals: number;
}

export interface DataQualityMetric {
  label: string;
  value: number;
  total: number;
  percent: number;
  color: string;
}

export interface StateBreakdown {
  state: string;
  count: number;
}

export interface CallAttemptsBucket {
  bucket: string;
  count: number;
}

export interface TransactionRevenue {
  month: string;
  contractValue: number;
  count: number;
}

export interface AnalyticsData {
  leadCreationTrend: LeadCreationTrend[];
  leadSourceBreakdown: LeadSourceBreakdown[];
  dataQuality: DataQualityMetric[];
  stateBreakdown: StateBreakdown[];
  callAttemptsDistribution: CallAttemptsBucket[];
  transactionRevenue: TransactionRevenue[];
  generatedAt: string;
}
