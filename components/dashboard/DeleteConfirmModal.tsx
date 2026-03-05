'use client';

import { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  type: 'lead' | 'opportunity' | 'transaction';
  recordId: string;
  recordName: string;
  onSuccess: () => void;
}

export function DeleteConfirmModal({
  open,
  onClose,
  type,
  recordId,
  recordName,
  onSuccess,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/actions/${type}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
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

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-900/50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">Delete Record</h3>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <p className="text-gray-300 mb-2">
          Are you sure you want to delete this record?
        </p>
        <p className="text-white font-medium mb-4 truncate">{recordName}</p>
        
        <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg mb-4">
          <p className="text-yellow-200 text-sm">
            This will move the record to Salesforce Recycle Bin. It can be recovered within 15 days.
          </p>
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
            onClick={handleDelete}
            disabled={loading}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
              loading
                ? 'bg-red-800 text-red-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white'
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
