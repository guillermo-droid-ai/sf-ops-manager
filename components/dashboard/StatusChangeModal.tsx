'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

const LEAD_STATUSES = [
  'New',
  'Working',
  'Follow Up',
  'Qualified',
  'Offer',
  'Appointment',
  'Unqualified',
  'Realtor Referral',
];

const OPP_STAGES = [
  'Offer',
  'Follow-up',
  'Convert Lead',
  'Contract Signed',
  'Pending Appointment',
  'Closed Lost',
  'Negotiation',
  'Long Term Followup',
  'Appointment Set',
  'Appointment',
  'Podio Deals',
];

const TRANSACTION_PATHS = [
  'New Contract',
  'On Hold',
  'Memoed',
  'Need Dispo Decision',
  'Marketing',
  'Showings/Inspections',
  'Buyers Found',
  'Accepted Offer/Assigned',
  'Documents sent to Title',
  'Title search completed',
  'Title Issues',
  'Clear to Close',
  'Waiting on Funds',
  'Cancellation Sent - Waiting to Sign',
  'Cancelled Contract/Lost',
  'Closed/Memo',
  'Closed/Won',
  'Closed - Realtor Referral',
];

interface StatusChangeModalProps {
  open: boolean;
  onClose: () => void;
  type: 'lead' | 'opportunity' | 'transaction';
  recordId: string;
  recordName: string;
  currentStatus: string;
  onSuccess: () => void;
}

export function StatusChangeModal({
  open,
  onClose,
  type,
  recordId,
  recordName,
  currentStatus,
  onSuccess,
}: StatusChangeModalProps) {
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const statusOptions =
    type === 'lead' ? LEAD_STATUSES : type === 'opportunity' ? OPP_STAGES : TRANSACTION_PATHS;

  const statusLabel = type === 'lead' ? 'Status' : type === 'opportunity' ? 'Stage' : 'Path';

  const handleSubmit = async () => {
    if (newStatus === currentStatus) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = `/api/actions/${type}`;
      const body =
        type === 'lead'
          ? { id: recordId, status: newStatus }
          : type === 'opportunity'
            ? { id: recordId, stageName: newStatus }
            : { id: recordId, path: newStatus };

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-lg font-semibold text-white mb-1">Change {statusLabel}</h3>
        <p className="text-sm text-gray-400 mb-4 truncate">{recordName}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Current: <span className="text-white">{currentStatus}</span>
          </label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || newStatus === currentStatus}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
              loading || newStatus === currentStatus
                ? 'bg-blue-800 text-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
