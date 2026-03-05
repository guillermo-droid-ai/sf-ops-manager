import { NextResponse } from 'next/server';
import { fetchAllLeads, fetchAllOpportunities, fetchAllTransactions, fetchUserMap } from '@/lib/queries';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { SFLead, SFOpportunity, SFTransaction } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for sync

interface SyncResult {
  leads: number;
  opportunities: number;
  transactions: number;
  errors: string[];
}

export async function POST() {
  const supabase = getSupabaseAdmin();
  const result: SyncResult = {
    leads: 0,
    opportunities: 0,
    transactions: 0,
    errors: []
  };
  
  try {
    // Log sync start
    const { data: syncLogEntry } = await supabase
      .from('sync_log')
      .insert({ sync_type: 'full', status: 'in_progress' })
      .select('id')
      .single();
    
    const syncLogId = syncLogEntry?.id;
    
    // Fetch all data in parallel
    const [leads, opps, transactions, userMap] = await Promise.all([
      fetchAllLeads().catch(e => { result.errors.push(`Leads: ${e.message}`); return [] as SFLead[]; }),
      fetchAllOpportunities().catch(e => { result.errors.push(`Opps: ${e.message}`); return [] as SFOpportunity[]; }),
      fetchAllTransactions().catch(e => { result.errors.push(`Transactions: ${e.message}`); return [] as SFTransaction[]; }),
      fetchUserMap().catch(() => new Map<string, string>())
    ]);
    
    // Sync leads
    if (leads.length > 0) {
      const leadRows = leads.map(l => ({
        id: l.Id,
        name: l.Name,
        status: l.Status,
        owner_id: l.OwnerId,
        owner_name: l.Owner?.Name || null,
        created_date: l.CreatedDate,
        last_activity_date: l.LastActivityDate,
        is_converted: l.IsConverted,
        phone: l.Phone || null,
        email: l.Email || null,
        company: l.Company || null,
        synced_at: new Date().toISOString()
      }));
      
      // Upsert in batches of 500
      for (let i = 0; i < leadRows.length; i += 500) {
        const batch = leadRows.slice(i, i + 500);
        const { error } = await supabase
          .from('leads')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          result.errors.push(`Leads batch ${i}: ${error.message}`);
        } else {
          result.leads += batch.length;
        }
      }
    }
    
    // Sync opportunities
    if (opps.length > 0) {
      const oppRows = opps.map(o => ({
        id: o.Id,
        name: o.Name,
        stage_name: o.StageName,
        owner_id: o.OwnerId,
        owner_name: o.Owner?.Name || null,
        amount: o.Amount,
        close_date: o.CloseDate,
        created_date: o.CreatedDate,
        last_activity_date: o.LastActivityDate,
        lead_source: o.LeadSource || null,
        is_closed: o.IsClosed,
        is_won: o.IsWon,
        synced_at: new Date().toISOString()
      }));
      
      for (let i = 0; i < oppRows.length; i += 500) {
        const batch = oppRows.slice(i, i + 500);
        const { error } = await supabase
          .from('opportunities')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          result.errors.push(`Opps batch ${i}: ${error.message}`);
        } else {
          result.opportunities += batch.length;
        }
      }
    }
    
    // Sync transactions
    if (transactions.length > 0) {
      const txRows = transactions.map(t => ({
        id: t.Id,
        name: t.Name,
        path_stage: t.Left_Main__Path__c,
        dispo_status: t.Left_Main__Dispo_Status__c,
        disposition_decision: t.Left_Main__Disposition_Decision__c,
        acquisition_rep_id: t.Left_Main__Acquisition_Rep__c,
        acquisition_rep_name: t.Left_Main__Acquisition_Rep__c 
          ? (userMap.get(t.Left_Main__Acquisition_Rep__c) || null) 
          : null,
        dispositions_rep_id: t.Left_Main__Dispositions_Rep__c,
        dispositions_rep_name: t.Left_Main__Dispositions_Rep__c
          ? (userMap.get(t.Left_Main__Dispositions_Rep__c) || null)
          : null,
        contract_assignment_price: t.Left_Main__Contract_Assignment_Price__c,
        assignment_fee: t.Assignment_Fee__c,
        net_profit: t.Left_Main__NetProfit__c,
        closing_date: t.Left_Main__Closing_Date__c,
        created_date: t.CreatedDate,
        last_activity_date: t.LastActivityDate,
        pending_stage: t.Pending_Stage__c || null,
        marketing_stage: t.Marketing_Stage__c || null,
        showing_status: t.Showing_Status__c || null,
        assigned_stage: t.Assigned_Stage__c || null,
        synced_at: new Date().toISOString()
      }));
      
      for (let i = 0; i < txRows.length; i += 500) {
        const batch = txRows.slice(i, i + 500);
        const { error } = await supabase
          .from('transactions')
          .upsert(batch, { onConflict: 'id' });
        
        if (error) {
          result.errors.push(`Transactions batch ${i}: ${error.message}`);
        } else {
          result.transactions += batch.length;
        }
      }
    }
    
    // Update sync log
    if (syncLogId) {
      await supabase
        .from('sync_log')
        .update({
          status: result.errors.length > 0 ? 'partial' : 'success',
          records_synced: result.leads + result.opportunities + result.transactions,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLogId);
    }
    
    return NextResponse.json({
      success: result.errors.length === 0,
      synced: {
        leads: result.leads,
        opportunities: result.opportunities,
        transactions: result.transactions,
        total: result.leads + result.opportunities + result.transactions
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed',
        synced: result
      },
      { status: 500 }
    );
  }
}
