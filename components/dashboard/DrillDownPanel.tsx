'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DrillLeadRecord, DrillOpportunityRecord, DrillTransactionRecord } from '@/lib/types';

const SF_BASE_URL = 'https://trinityoffers.my.salesforce.com';

type DrillType = 'leads' | 'opportunities' | 'transactions';
type DrillRecord = DrillLeadRecord | DrillOpportunityRecord | DrillTransactionRecord;

interface DrillDownPanelProps {
  isOpen: boolean;
  onClose: () => void;
  type: DrillType;
  title: string;
  filterKey: string;
  filterValue: string;
}

function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

function getDaysColor(days: number | null, redThreshold: number, yellowThreshold: number): string {
  if (days === null) return 'text-gray-400';
  if (days > redThreshold) return 'text-red-400';
  if (days > yellowThreshold) return 'text-yellow-400';
  return 'text-green-400';
}

export function DrillDownPanel({ isOpen, onClose, type, title, filterKey, filterValue }: DrillDownPanelProps) {
  const [records, setRecords] = useState<DrillRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      if (filterKey && filterValue) {
        params.set(filterKey, filterValue);
      }

      const res = await fetch(`/api/drill/${type}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const data = await res.json();
      setRecords(data.records);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [type, filterKey, filterValue, page]);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSearchTerm('');
      fetchData();
    }
  }, [isOpen, type, filterKey, filterValue]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [page, fetchData, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter records by search term (client-side)
  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    
    if ('name' in record) {
      return record.name.toLowerCase().includes(search);
    }
    if ('propertyAddress' in record) {
      return record.propertyAddress.toLowerCase().includes(search);
    }
    return true;
  });

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);
  const startRecord = (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <>
      {/* Overlay - click to close */}
      <div 
        className="fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[580px] max-w-full bg-gray-900 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {total.toLocaleString()} records · Click a row to open in Salesforce
            </p>
          </div>
          
          {/* Close button - ALWAYS visible, top right */}
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-300">
              {error}
            </div>
          )}

          {!loading && !error && filteredRecords.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              {searchTerm ? 'No matching records' : 'No records found'}
            </div>
          )}

          {!loading && !error && filteredRecords.length > 0 && (
            <div className="overflow-x-auto">
              {type === 'leads' && (
                <LeadsTable records={filteredRecords as DrillLeadRecord[]} />
              )}
              {type === 'opportunities' && (
                <OpportunitiesTable records={filteredRecords as DrillOpportunityRecord[]} />
              )}
              {type === 'transactions' && (
                <TransactionsTable records={filteredRecords as DrillTransactionRecord[]} />
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-700">
          <span className="text-sm text-gray-400">
            Showing {startRecord}-{endRecord} of {total.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-3 py-1 text-gray-400">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function LeadsTable({ records }: { records: DrillLeadRecord[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="pb-2 pr-3">Name</th>
          <th className="pb-2 px-3">Status</th>
          <th className="pb-2 px-3">Source</th>
          <th className="pb-2 px-3">State</th>
          <th className="pb-2 px-3 text-right">Days Stale</th>
          <th className="pb-2 px-3">Phone</th>
          <th className="pb-2 pl-3">Last Activity</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
            <td className="py-2 pr-3">
              <a
                href={`${SF_BASE_URL}/${record.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {record.name}
              </a>
            </td>
            <td className="py-2 px-3">
              <StatusBadge status={record.status} />
            </td>
            <td className="py-2 px-3 text-gray-400">{record.leadSource || '—'}</td>
            <td className="py-2 px-3 text-gray-400">{record.state || '—'}</td>
            <td className={`py-2 px-3 text-right ${getDaysColor(record.daysSinceActivity, 14, 7)}`}>
              {record.daysSinceActivity !== null ? `${record.daysSinceActivity}d` : '—'}
            </td>
            <td className="py-2 px-3">
              {record.phone ? (
                <a href={`tel:${record.phone}`} className="text-blue-400 hover:text-blue-300">
                  {record.phone}
                </a>
              ) : '—'}
            </td>
            <td className="py-2 pl-3 text-gray-400">{formatDate(record.lastActivityDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function OpportunitiesTable({ records }: { records: DrillOpportunityRecord[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="pb-2 pr-3">Deal Name</th>
          <th className="pb-2 px-3">Stage</th>
          <th className="pb-2 px-3 text-right">Amount</th>
          <th className="pb-2 px-3 text-right">Days to Close</th>
          <th className="pb-2 px-3">Close Date</th>
          <th className="pb-2 px-3">Source</th>
          <th className="pb-2 pl-3">Last Activity</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
            <td className="py-2 pr-3">
              <a
                href={`${SF_BASE_URL}/${record.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {record.name}
              </a>
            </td>
            <td className="py-2 px-3">
              <StageBadge stage={record.stage} />
            </td>
            <td className="py-2 px-3 text-right text-gray-200">
              {formatCurrency(record.amount)}
            </td>
            <td className={`py-2 px-3 text-right ${getDaysColor(-record.daysUntilClose, 0, -7)}`}>
              {record.daysUntilClose < 0 ? `${Math.abs(record.daysUntilClose)}d past` : `${record.daysUntilClose}d`}
            </td>
            <td className="py-2 px-3 text-gray-400">{formatDate(record.closeDate)}</td>
            <td className="py-2 px-3 text-gray-400">{record.leadSource || '—'}</td>
            <td className="py-2 pl-3 text-gray-400">{formatDate(record.lastActivityDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionsTable({ records }: { records: DrillTransactionRecord[] }) {
  const blockedPaths = ['On Hold', 'Title Issues', 'Waiting on Funds', 'Cancellation Sent - Waiting to Sign'];
  
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-400 border-b border-gray-700">
          <th className="pb-2 pr-3">Property Address</th>
          <th className="pb-2 px-3">Path Stage</th>
          <th className="pb-2 px-3">Dispo Decision</th>
          <th className="pb-2 px-3">Acq Rep</th>
          <th className="pb-2 px-3">Dispo Rep</th>
          <th className="pb-2 px-3 text-right">Days in Stage</th>
          <th className="pb-2 px-3">Closing</th>
          <th className="pb-2 pl-3 text-right">Price</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => {
          const isBlocked = blockedPaths.includes(record.pathStage || '');
          return (
            <tr key={record.id} className="border-b border-gray-800 hover:bg-gray-800/50">
              <td className="py-2 pr-3">
                <a
                  href={`${SF_BASE_URL}/${record.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {record.propertyAddress}
                </a>
              </td>
              <td className="py-2 px-3">
                <span className={`inline-block px-2 py-0.5 text-xs rounded ${
                  isBlocked 
                    ? 'bg-red-900/50 text-red-300 border border-red-700/50'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {record.pathStage || '—'}
                </span>
              </td>
              <td className="py-2 px-3 text-gray-400">{record.dispoDecision || '—'}</td>
              <td className="py-2 px-3 text-gray-400">{record.acqRepName || '—'}</td>
              <td className="py-2 px-3 text-gray-400">{record.dispoRepName || '—'}</td>
              <td className={`py-2 px-3 text-right ${getDaysColor(record.daysInStage, 14, 7)}`}>
                {record.daysInStage}d
              </td>
              <td className="py-2 px-3 text-gray-400">{formatDate(record.closingDate)}</td>
              <td className="py-2 pl-3 text-right text-gray-200">
                {formatCurrency(record.contractPrice)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    'New': 'bg-blue-900/50 text-blue-300 border-blue-700/50',
    'Working': 'bg-purple-900/50 text-purple-300 border-purple-700/50',
    'Follow Up': 'bg-indigo-900/50 text-indigo-300 border-indigo-700/50',
    'Qualified': 'bg-green-900/50 text-green-300 border-green-700/50',
    'Offer': 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
    'Appointment': 'bg-teal-900/50 text-teal-300 border-teal-700/50',
    'Unqualified': 'bg-red-900/50 text-red-300 border-red-700/50',
    'Realtor Referral': 'bg-gray-700 text-gray-300 border-gray-600',
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${colors[status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {status}
    </span>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const colors: Record<string, string> = {
    'Podio Deals': 'bg-orange-900/50 text-orange-300 border-orange-700/50',
    'Closed Lost': 'bg-red-900/50 text-red-300 border-red-700/50',
    'Contract Signed': 'bg-green-900/50 text-green-300 border-green-700/50',
    'Negotiation': 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs rounded border ${colors[stage] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {stage}
    </span>
  );
}
