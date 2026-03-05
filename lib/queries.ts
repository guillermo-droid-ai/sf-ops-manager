// All Salesforce SOQL queries used throughout the app
// Centralized here so Copilot/team can easily modify field names

import { sfQuery } from './salesforce';

// ─── LEADS ────────────────────────────────────────────────────────────────────

export interface SFLead {
  Id: string;
  FirstName: string;
  LastName: string;
  Status: string;
  OwnerId: string;
  Owner: { Name: string };
  CreatedDate: string;
  LastModifiedDate: string;
  LastActivityDate: string | null;
  LeadSource: string;
  Rating: string | null;
  IsConverted: boolean;
  ConvertedDate: string | null;
  Phone: string | null;
  Email: string | null;
  State: string | null;
  City: string | null;
}

export interface SFLeadHistory {
  Id: string;
  LeadId: string;
  Field: string;
  OldValue: string | null;
  NewValue: string | null;
  CreatedDate: string;
  CreatedById: string;
}

export async function getActiveLeads(): Promise<SFLead[]> {
  return sfQuery<SFLead>(`
    SELECT Id, FirstName, LastName, Status, OwnerId, Owner.Name,
           CreatedDate, LastModifiedDate, LastActivityDate,
           LeadSource, Rating, IsConverted, ConvertedDate,
           Phone, Email, State, City
    FROM Lead
    WHERE IsConverted = false
    ORDER BY CreatedDate DESC
    LIMIT 2000
  `);
}

export async function getLeadStatusHistory(): Promise<SFLeadHistory[]> {
  return sfQuery<SFLeadHistory>(`
    SELECT Id, LeadId, Field, OldValue, NewValue, CreatedDate, CreatedById
    FROM LeadHistory
    WHERE Field = 'Status'
    ORDER BY CreatedDate ASC
    LIMIT 5000
  `);
}

export async function getLeadOwnerHistory(): Promise<SFLeadHistory[]> {
  return sfQuery<SFLeadHistory>(`
    SELECT Id, LeadId, Field, OldValue, NewValue, CreatedDate, CreatedById
    FROM LeadHistory
    WHERE Field = 'Owner'
    ORDER BY CreatedDate ASC
    LIMIT 3000
  `);
}

// ─── OPPORTUNITIES ─────────────────────────────────────────────────────────────

export interface SFOpportunity {
  Id: string;
  Name: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  OwnerId: string;
  Owner: { Name: string };
  CreatedDate: string;
  LastModifiedDate: string;
  LastActivityDate: string | null;
  IsClosed: boolean;
  IsWon: boolean;
  Probability: number;
  LeadSource: string | null;
}

export interface SFOpportunityHistory {
  Id: string;
  OpportunityId: string;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  CreatedDate: string;
}

export async function getOpportunities(): Promise<SFOpportunity[]> {
  return sfQuery<SFOpportunity>(`
    SELECT Id, Name, StageName, Amount, CloseDate, OwnerId, Owner.Name,
           CreatedDate, LastModifiedDate, LastActivityDate,
           IsClosed, IsWon, Probability, LeadSource
    FROM Opportunity
    ORDER BY CreatedDate DESC
    LIMIT 2000
  `);
}

export async function getOpportunityStageHistory(): Promise<SFOpportunityHistory[]> {
  return sfQuery<SFOpportunityHistory>(`
    SELECT Id, OpportunityId, StageName, Amount, CloseDate, CreatedDate
    FROM OpportunityHistory
    ORDER BY CreatedDate ASC
    LIMIT 5000
  `);
}

// ─── TRANSACTIONS (CUSTOM OBJECT) ─────────────────────────────────────────────
// NOTE: Replace Transaction__c with your actual API name for the Transactions object

export interface SFTransaction {
  Id: string;
  Name: string;
  OwnerId: string;
  Owner: { Name: string };
  Status__c: string;
  CreatedDate: string;
  LastModifiedDate: string;
  Amount__c: number | null;
  Related_Opportunity__c: string | null;
}

export async function getTransactions(): Promise<SFTransaction[]> {
  return sfQuery<SFTransaction>(`
    SELECT Id, Name, OwnerId, Owner.Name,
           Status__c, CreatedDate, LastModifiedDate,
           Amount__c, Related_Opportunity__c
    FROM Transaction__c
    ORDER BY CreatedDate DESC
    LIMIT 2000
  `);
}

// ─── ACTIVITIES ────────────────────────────────────────────────────────────────

export interface SFTask {
  Id: string;
  Subject: string;
  Status: string;
  ActivityDate: string | null;
  WhoId: string | null;
  WhatId: string | null;
  OwnerId: string;
  Owner: { Name: string };
  CreatedDate: string;
  Type: string | null;
  Description: string | null;
}

export async function getRecentTasks(days = 30): Promise<SFTask[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return sfQuery<SFTask>(`
    SELECT Id, Subject, Status, ActivityDate, WhoId, WhatId,
           OwnerId, Owner.Name, CreatedDate, Type, Description
    FROM Task
    WHERE CreatedDate > ${since}
    ORDER BY CreatedDate DESC
    LIMIT 3000
  `);
}

// ─── USERS / REPS ──────────────────────────────────────────────────────────────

export interface SFUser {
  Id: string;
  Name: string;
  Email: string;
  IsActive: boolean;
  Title: string | null;
  Department: string | null;
}

export async function getActiveUsers(): Promise<SFUser[]> {
  return sfQuery<SFUser>(`
    SELECT Id, Name, Email, IsActive, Title, Department
    FROM User
    WHERE IsActive = true AND UserType = 'Standard'
    ORDER BY Name ASC
  `);
}
