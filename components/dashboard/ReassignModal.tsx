'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Search } from 'lucide-react';
import clsx from 'clsx';

interface User {
  id: string;
  name: string;
}

interface ReassignModalProps {
  open: boolean;
  onClose: () => void;
  type: 'lead' | 'opportunity' | 'transaction';
  recordId: string;
  recordName: string;
  currentOwnerId: string;
  currentOwnerName: string;
  onSuccess: () => void;
}

export function ReassignModal({
  open,
  onClose,
  type,
  recordId,
  recordName,
  currentOwnerId,
  currentOwnerName,
  onSuccess,
}: ReassignModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(currentOwnerId);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          setUsers(data.users || []);
          setLoadingUsers(false);
        })
        .catch(() => {
          setError('Failed to load users');
          setLoadingUsers(false);
        });
    }
  }, [open]);

  if (!open) return null;

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (selectedUserId === currentOwnerId) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/actions/${type}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, ownerId: selectedUserId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reassign');

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reassign');
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

        <h3 className="text-lg font-semibold text-white mb-1">Reassign Owner</h3>
        <p className="text-sm text-gray-400 mb-4 truncate">{recordName}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 text-sm">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Current Owner: <span className="text-white">{currentOwnerName}</span>
          </label>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
            {loadingUsers ? (
              <div className="p-4 text-center text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={clsx(
                    'w-full px-4 py-2 text-left transition-colors',
                    selectedUserId === user.id
                      ? 'bg-blue-600/30 text-blue-300'
                      : 'text-gray-300 hover:bg-gray-800'
                  )}
                >
                  {user.name}
                  {user.id === currentOwnerId && (
                    <span className="ml-2 text-xs text-gray-500">(current)</span>
                  )}
                </button>
              ))
            )}
          </div>
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
            disabled={loading || selectedUserId === currentOwnerId}
            className={clsx(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors',
              loading || selectedUserId === currentOwnerId
                ? 'bg-blue-800 text-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reassign
          </button>
        </div>
      </div>
    </div>
  );
}
