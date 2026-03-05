'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, ChevronLeft, ChevronRight, MoreHorizontal, Phone, Mail } from 'lucide-react';
import clsx from 'clsx';
import { StatusChangeModal } from './StatusChangeModal';
import { ReassignModal } from './ReassignModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useToast } from '@/components/ui/Toast';

type RecordType = 'lead' | 'opportunity' | 'transaction';

interface DrillDownPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  type: RecordType;
  filters: { status?: string; ownerId?: string; ownerName?: string };
}

interface LeadRecord {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  ownerName: string;
  leadSource: string;
  state: string;
  city: string;
  phone: string;
  email: string;
  daysSinceActivity: number | null;
}

interface OppRecord {
  id: string;
  name: string;
  stageName: string;
  ownerId: string;
  ownerName: string;
  amount: number | null;
  closeDate: string | null;
  daysInStage: number | null;
}

interface TxRecord {
  id: string;
  name: string;
  path: string;
  dispoDecision: string;
  acqRep: string;
  dispoRep: string;
  ownerId: string;
  ownerName: string;
  closingDate: string | null;
  contractPrice: number | null;
  daysSinceActivity: number | null;
}

type AnyRecord = LeadRecord | OppRecord | TxRecord;

interface PaginatedResponse<T> {
  records: T[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function DrillDownPanel({
  open,
  onClose,
  title,
  subtitle,
  type,
  filters,
}: DrillDownPanelProps) {
  const { showToast } = useToast();
  const [records, setRecords] = useState<AnyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Action modals
  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    recordId: string;
    recordName: string;
    currentStatus: string;
  } | null>(null);

  const [reassignModal, setReassignModal] = useState<{
    open: boolean;
    recordId: string;
    recordName: string;
    currentOwnerId: string;
    currentOwnerName: string;
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    recordId: string;
    recordName: string;
  } | null>(null);

  // Row action dropdown state
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');
      if (filters.status) {
        if (type === 'opportunity') {
          params.set('stageName', filters.status);
        } else if (type === 'transaction') {
          params.set('path', filters.status);
        } else {
          params.set('status', filters.status);
        }
      }
      if (filters.ownerId) params.set('ownerId', filters.ownerId);

      const res = await fetch(`/api/drill/${type}s?${params.toString()}`);
      const data = (await res.json()) as PaginatedResponse<AnyRecord>;

      setRecords(data.records);
      setTotalPages(data.totalPages);
      setTotalCount(data.totalCount);
    } catch (err) {
      showToast('Failed to load records', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [type, filters, page, showToast]);

  useEffect(() => {
    if (open) {
      setPage(1);
      setSelectedIds(new Set());
      fetchRecords();
    }
  }, [open, filters, type]);

  useEffect(() => {
    if (open) {
      fetchRecords();
    }
  }, [page, fetchRecords, open]);

  // Filter by search client-side
  const filteredRecords = records.filter((r) =>
    'name' in r ? r.name.toLowerCase().includes(search.toLowerCase()) : true
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (action: 'status' | 'owner' | 'delete', value?: string) => {
    if (selectedIds.size === 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/actions/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          ids: Array.from(selectedIds),
          action,
          value,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed');

      showToast(data.message, data.success ? 'success' : 'error');
      setSelectedIds(new Set());
      fetchRecords();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk action failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActionSuccess = () => {
    showToast('Updated successfully', 'success');
    fetchRecords();
  };

  const handleDeleteSuccess = () => {
    showToast('Record deleted', 'success');
    fetchRecords();
  };

  const getRecordStatus = (record: AnyRecord): string => {
    if ('status' in record) return record.status;
    if ('stageName' in record) return record.stageName;
    if ('path' in record) return record.path;
    return '';
  };

  const getRecordName = (record: AnyRecord): string => {
    return record.name;
  };

  const getRecordOwner = (record: AnyRecord): { id: string; name: string } => {
    return { id: record.ownerId, name: record.ownerName };
  };

  const formatCurrency = (val: number | null): string => {
    if (val === null) return '-';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (val: string | null): string => {
    if (!val) return '-';
    return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[700px] max-w-full bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
              <p className="text-sm text-gray-400">{subtitle} • {totalCount} records</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="mt-3 flex items-center gap-3 bg-gray-800 rounded-lg p-3">
              <span className="text-sm text-white font-medium">
                {selectedIds.size} selected
              </span>
              <div className="flex-1 flex items-center gap-2">
                <BulkStatusDropdown type={type} onSelect={(status) => handleBulkAction('status', status)} />
                <BulkOwnerDropdown onSelect={(ownerId) => handleBulkAction('owner', ownerId)} />
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 text-sm"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading && records.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-gray-900">
                <tr className="border-b border-gray-800">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredRecords.length && filteredRecords.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-gray-700 border-gray-600"
                    />
                  </th>
                  {type === 'lead' && (
                    <>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Location</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Days Stale</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Contact</th>
                    </>
                  )}
                  {type === 'opportunity' && (
                    <>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Stage</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Amount</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Close Date</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Days</th>
                    </>
                  )}
                  {type === 'transaction' && (
                    <>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Address</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Path</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Dispo</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Reps</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Closing</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                    </>
                  )}
                  <th className="p-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className={clsx(
                      'border-b border-gray-800 hover:bg-gray-800/50 transition-colors',
                      selectedIds.has(record.id) && 'bg-blue-900/20'
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                    </td>
                    {type === 'lead' && (
                      <>
                        <td className="p-3 text-white">{(record as LeadRecord).name}</td>
                        <td className="p-3">
                          <StatusBadge status={(record as LeadRecord).status} type="lead" />
                        </td>
                        <td className="p-3 text-gray-400 text-sm">{(record as LeadRecord).leadSource || '-'}</td>
                        <td className="p-3 text-gray-400 text-sm">
                          {[(record as LeadRecord).city, (record as LeadRecord).state].filter(Boolean).join(', ') || '-'}
                        </td>
                        <td className="p-3">
                          <DaysBadge days={(record as LeadRecord).daysSinceActivity} />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {(record as LeadRecord).phone && (
                              <a href={`tel:${(record as LeadRecord).phone}`} className="text-gray-400 hover:text-white">
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                            {(record as LeadRecord).email && (
                              <a href={`mailto:${(record as LeadRecord).email}`} className="text-gray-400 hover:text-white">
                                <Mail className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    {type === 'opportunity' && (
                      <>
                        <td className="p-3 text-white">{(record as OppRecord).name}</td>
                        <td className="p-3">
                          <StatusBadge status={(record as OppRecord).stageName} type="opportunity" />
                        </td>
                        <td className="p-3 text-gray-400">{formatCurrency((record as OppRecord).amount)}</td>
                        <td className="p-3 text-gray-400">{formatDate((record as OppRecord).closeDate)}</td>
                        <td className="p-3">
                          <DaysBadge days={(record as OppRecord).daysInStage} />
                        </td>
                      </>
                    )}
                    {type === 'transaction' && (
                      <>
                        <td className="p-3 text-white max-w-[150px] truncate" title={(record as TxRecord).name}>
                          {(record as TxRecord).name}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={(record as TxRecord).path} type="transaction" />
                        </td>
                        <td className="p-3 text-gray-400 text-sm">{(record as TxRecord).dispoDecision || '-'}</td>
                        <td className="p-3 text-gray-400 text-xs">
                          <div>A: {(record as TxRecord).acqRep || '-'}</div>
                          <div>D: {(record as TxRecord).dispoRep || '-'}</div>
                        </td>
                        <td className="p-3 text-gray-400">{formatDate((record as TxRecord).closingDate)}</td>
                        <td className="p-3 text-gray-400">{formatCurrency((record as TxRecord).contractPrice)}</td>
                      </>
                    )}
                    <td className="p-3">
                      <div className="relative">
                        <button
                          onClick={() => setOpenActionMenu(openActionMenu === record.id ? null : record.id)}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-400" />
                        </button>
                        {openActionMenu === record.id && (
                          <div className="absolute right-0 top-8 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 py-1 min-w-[150px]">
                            <button
                              onClick={() => {
                                setStatusModal({
                                  open: true,
                                  recordId: record.id,
                                  recordName: getRecordName(record),
                                  currentStatus: getRecordStatus(record),
                                });
                                setOpenActionMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                            >
                              Change Status
                            </button>
                            <button
                              onClick={() => {
                                const owner = getRecordOwner(record);
                                setReassignModal({
                                  open: true,
                                  recordId: record.id,
                                  recordName: getRecordName(record),
                                  currentOwnerId: owner.id,
                                  currentOwnerName: owner.name,
                                });
                                setOpenActionMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
                            >
                              Reassign
                            </button>
                            <button
                              onClick={() => {
                                setDeleteModal({
                                  open: true,
                                  recordId: record.id,
                                  recordName: getRecordName(record),
                                });
                                setOpenActionMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredRecords.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <p>No records found</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex-shrink-0 border-t border-gray-800 p-4 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="p-2 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5 text-gray-400" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="p-2 hover:bg-gray-800 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {statusModal && (
        <StatusChangeModal
          open={statusModal.open}
          onClose={() => setStatusModal(null)}
          type={type}
          recordId={statusModal.recordId}
          recordName={statusModal.recordName}
          currentStatus={statusModal.currentStatus}
          onSuccess={handleActionSuccess}
        />
      )}

      {reassignModal && (
        <ReassignModal
          open={reassignModal.open}
          onClose={() => setReassignModal(null)}
          type={type}
          recordId={reassignModal.recordId}
          recordName={reassignModal.recordName}
          currentOwnerId={reassignModal.currentOwnerId}
          currentOwnerName={reassignModal.currentOwnerName}
          onSuccess={handleActionSuccess}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          open={deleteModal.open}
          onClose={() => setDeleteModal(null)}
          type={type}
          recordId={deleteModal.recordId}
          recordName={deleteModal.recordName}
          onSuccess={handleDeleteSuccess}
        />
      )}

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );
}

// Helper components

function StatusBadge({ status, type }: { status: string; type: RecordType }) {
  const getColor = () => {
    if (type === 'lead') {
      if (['New', 'Working'].includes(status)) return 'bg-green-900/50 text-green-400';
      if (['Qualified', 'Offer', 'Appointment'].includes(status)) return 'bg-blue-900/50 text-blue-400';
      if (status === 'Unqualified') return 'bg-red-900/50 text-red-400';
      return 'bg-gray-700 text-gray-300';
    }
    if (type === 'opportunity') {
      if (['Appointment', 'Contract Signed', 'Offer'].includes(status)) return 'bg-green-900/50 text-green-400';
      if (['Closed Lost', 'Podio Deals'].includes(status)) return 'bg-red-900/50 text-red-400';
      return 'bg-yellow-900/50 text-yellow-400';
    }
    // transaction
    if (['Closed/Won', 'Closed/Memo'].includes(status)) return 'bg-green-900/50 text-green-400';
    if (['Cancelled Contract/Lost', 'On Hold', 'Title Issues'].includes(status)) return 'bg-red-900/50 text-red-400';
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <span className={clsx('px-2 py-1 rounded text-xs font-medium', getColor())}>
      {status}
    </span>
  );
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-500">-</span>;

  const getColor = () => {
    if (days > 14) return 'text-red-400';
    if (days > 7) return 'text-yellow-400';
    return 'text-green-400';
  };

  return <span className={clsx('font-medium', getColor())}>{days}d</span>;
}

function BulkStatusDropdown({
  type,
  onSelect,
}: {
  type: RecordType;
  onSelect: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const options =
    type === 'lead'
      ? ['New', 'Working', 'Follow Up', 'Qualified', 'Offer', 'Appointment', 'Unqualified']
      : type === 'opportunity'
        ? ['Offer', 'Follow-up', 'Contract Signed', 'Closed Lost', 'Negotiation']
        : ['Marketing', 'Need Dispo Decision', 'On Hold', 'Closed/Won'];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
      >
        Change Status ▾
      </button>
      {open && (
        <div className="absolute left-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 py-1 min-w-[150px]">
          {options.map((s) => (
            <button
              key={s}
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function BulkOwnerDropdown({ onSelect }: { onSelect: (ownerId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && users.length === 0) {
      setLoading(true);
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => setUsers(data.users || []))
        .finally(() => setLoading(false));
    }
  }, [open, users.length]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 text-sm"
      >
        Reassign ▾
      </button>
      {open && (
        <div className="absolute left-0 top-10 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 py-1 min-w-[180px] max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-2 text-gray-400 text-sm">Loading...</div>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelect(u.id);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700"
              >
                {u.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
